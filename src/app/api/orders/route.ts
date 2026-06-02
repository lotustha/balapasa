import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { esewaFormData, getEsewaPaymentUrl, khaltiInitiate } from '@/lib/payment'
import { getCurrentUser } from '@/lib/auth'
import { pushOrderEvent } from '@/lib/push'
import { validateCoupon } from '@/lib/coupons'
import { validateGiftCard } from '@/lib/gift-cards'
import { getEnabledPaymentMethods } from '@/lib/payment-methods-server'
import { createMagicToken, magicLinkUrl } from '@/lib/magic-link'
import { sendEmailLogged } from '@/lib/email'
import { render as renderEmail } from '@/lib/emails/registry'
import { getSiteSettings } from '@/lib/site-settings'
import { resolveOrderCodePrefix, assignOrderCode } from '@/lib/order-code'
import { getBundleItemRows } from '@/lib/bundle'

// Tag used to distinguish coupon-race aborts from generic Prisma errors so we
// can surface a 409 to the client instead of a 500.
class CouponRaceError extends Error {
  readonly _coupon = true
}

class GiftCardRaceError extends Error {
  readonly _giftCard = true
}

class StockRaceError extends Error {
  readonly _stock = true
}

class StoreCreditRaceError extends Error {
  readonly _storeCredit = true
}

export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null
    let userEmail: string | null = null
    try {
      // Bearer (mobile) or cookie (web). Null → guest checkout, which is allowed.
      const me = await getCurrentUser()
      userId    = me?.sub   ?? null
      userEmail = me?.email ?? null
    } catch { /* guest checkout */ }

    const body = await req.json()
    const {
      items, subtotal, deliveryCharge, paymentMethod, shippingOption, shippingProvider,
      name, phone, email, address, house, road, city, lat, lng,
      advancePaid, codAmount, advanceMethod,
      couponCode: rawCouponCode, autoDiscount,
      giftCardCode: rawGiftCardCode,
      // Store-credit redemption (logged-in customers only; COD/Khalti only)
      storeCreditAmount: rawStoreCreditAmount,
      // Structured Nepal address (used when saving address to a new/existing Profile)
      province, district, municipality, ward, street, tole, landmark: structuredLandmark,
      // Guest signup nudge — "Save my info for next time" checkbox
      createAccount,
      // Delivery extras (landmark is also re-extracted from structured fields above)
      deliveryNote,
    } = body

    // Read DELIVERY_MODE from app_settings at order time so the value is audited
    // server-side (client can't lie about whether the store charged shipping).
    const deliveryModeRow = await prisma.$queryRaw<{ value: string }[]>`
      SELECT value FROM app_settings WHERE key = 'DELIVERY_MODE' LIMIT 1
    `.catch(() => [] as { value: string }[])
    const deliveryMode = (deliveryModeRow[0]?.value === 'FREE' ? 'FREE' : 'PAID') as 'FREE' | 'PAID'

    // Reject payment methods that the admin has turned off. Resolved fresh
    // from app_settings so a flip in Admin → Settings → Payments takes effect
    // immediately for the next order.
    const enabledMethods = await getEnabledPaymentMethods()
    const normalizedMethod = paymentMethod === 'PARTIAL_COD' ? 'COD' : paymentMethod
    if (!(enabledMethods as readonly string[]).includes(normalizedMethod)) {
      return Response.json(
        { error: `Payment method "${paymentMethod}" is temporarily unavailable. Please use Cash on Delivery.` },
        { status: 400 },
      )
    }

    // ── Per-customer flash-sale cap ────────────────────────────────────
    // Products on flash sale can set maxPerCustomerOnSale. Reject the order
    // if any line item exceeds the cap. v1 enforces per-order only — historical
    // orders aren't summed.
    const itemsForCap = items as { id: string; quantity: number }[]
    if (itemsForCap?.length) {
      const productIds = itemsForCap.map(i => i.id)
      const capped = await prisma.product.findMany({
        where:  { id: { in: productIds }, maxPerCustomerOnSale: { not: null } },
        select: { id: true, name: true, maxPerCustomerOnSale: true },
      })
      for (const p of capped) {
        const line = itemsForCap.find(i => i.id === p.id)
        if (line && p.maxPerCustomerOnSale != null && Number(line.quantity) > p.maxPerCustomerOnSale) {
          return Response.json(
            { error: `${p.name} is limited to ${p.maxPerCustomerOnSale} per customer during this sale.` },
            { status: 400 },
          )
        }
      }
    }

    // ── Server-side coupon validation ──────────────────────────────────
    // Don't trust client-supplied couponDiscount or total. Re-validate from code + cart,
    // and recompute the discount + total on the server. This prevents tampering and
    // catches state changes between the validate call and order creation (expiry, etc.)
    const couponCode = rawCouponCode ? String(rawCouponCode).toUpperCase().trim() : null
    let serverCouponDiscount: number | null = null
    if (couponCode) {
      const result = await validateCoupon({
        code:     couponCode,
        subtotal: Number(subtotal),
        items: (items as { id: string; price: number; salePrice?: number | null; quantity: number }[]).map(i => ({
          productId: i.id,
          price:     Number(i.salePrice ?? i.price),
          quantity:  Number(i.quantity),
        })),
      })
      if (!result.valid) {
        return Response.json({ error: result.error }, { status: result.status })
      }
      serverCouponDiscount = result.discount
    }

    // Recompute total from server values — never trust client `total`
    const safeAutoDiscount = autoDiscount ? Math.max(0, Number(autoDiscount)) : 0
    const totalBeforeGiftCard = Math.max(
      0,
      Number(subtotal) + Number(deliveryCharge) - (serverCouponDiscount ?? 0) - safeAutoDiscount,
    )

    // ── Server-side gift card validation ───────────────────────────────
    // Same defense-in-depth as coupons: re-validate from code, derive the
    // discount on the server (= min(balance, total-after-coupon)).
    const giftCardCode = rawGiftCardCode ? String(rawGiftCardCode).toUpperCase().trim() : null
    let giftCardDiscount = 0
    let giftCardId: string | null = null
    if (giftCardCode) {
      const result = await validateGiftCard(giftCardCode)
      if (!result.valid) {
        return Response.json({ error: result.error }, { status: result.status })
      }
      giftCardId       = result.id
      giftCardDiscount = Math.min(result.balance, totalBeforeGiftCard)
    }

    const totalAfterGiftCard = Math.max(0, totalBeforeGiftCard - giftCardDiscount)

    // ── Store-credit redemption ────────────────────────────────────────
    // Logged-in customers only. Works with COD, eSewa, and Khalti — all three
    // charge / collect the discounted serverTotal (which already nets out the
    // credit). Only PARTIAL_COD is rejected: its advance/COD split isn't
    // reconciled against the credit here. When credit covers the whole order
    // (serverTotal === 0) the gateway is skipped entirely (see short-circuit
    // below the tx). Server clamps the redeemed amount to [0, min(balance,
    // total)] — never trust the client figure. Race-safe decrement is in the tx.
    let storeCreditUsed = 0
    const requestedCredit = rawStoreCreditAmount ? Math.max(0, Number(rawStoreCreditAmount)) : 0
    if (requestedCredit > 0) {
      if (!userId) {
        return Response.json({ error: 'Please sign in to use store credit.' }, { status: 401 })
      }
      if (paymentMethod === 'PARTIAL_COD') {
        return Response.json(
          { error: 'Store credit can’t be combined with partial COD. Please choose Cash on Delivery, eSewa, or Khalti.' },
          { status: 400 },
        )
      }
      const wallet = await prisma.storeCredit.findUnique({ where: { userId }, select: { balance: true } })
      const available = wallet?.balance ?? 0
      storeCreditUsed = Math.round(Math.min(requestedCredit, available, totalAfterGiftCard) * 100) / 100
    }

    const serverTotal = Math.max(0, totalAfterGiftCard - storeCreditUsed)

    // Snapshot the item list once so the tx + post-tx logging can share it.
    const itemList = items as {
      id: string; name: string; price: number; salePrice?: number | null;
      image: string; quantity: number;
    }[]

    // Resolve which cart lines are BUNDLE products and their component rows, so
    // the stock decrement below deducts each component (componentQty × line qty)
    // instead of the bundle's own (unused) stock. Component definitions are
    // static config — safe to read before the tx. A bundle with no components is
    // misconfigured and gets blocked in the loop rather than silently oversold.
    const kindRows = await prisma.product.findMany({
      where:  { id: { in: itemList.map(i => i.id) } },
      select: { id: true, kind: true },
    })
    const bundleIdSet       = new Set(kindRows.filter(k => k.kind === 'BUNDLE').map(k => k.id))
    const bundleComponentMap = await getBundleItemRows([...bundleIdSet])

    // ── Atomic transaction: coupon + gift-card + STOCK + order create ───────
    // Every race-prone write happens under one $transaction. The raw UPDATEs
    // use `WHERE ... AND condition >= qty` so concurrent checkouts can't
    // double-spend a coupon, drain a gift card past zero, or oversell the
    // last unit of a tracked product. Zero rows updated → throw a typed
    // race error → handler maps it to 409.
    const { order, stockUpdates } = await prisma.$transaction(async tx => {
      if (couponCode) {
        const updated = await tx.$executeRaw`
          UPDATE coupons
          SET used_count = used_count + 1, updated_at = NOW()
          WHERE code = ${couponCode}
            AND is_active = true
            AND (max_uses   IS NULL OR used_count <  max_uses)
            AND (expires_at IS NULL OR expires_at >  NOW())
        `
        if (updated === 0) {
          throw new CouponRaceError('Coupon usage limit reached or coupon no longer valid. Please remove it and try again.')
        }
      }

      // Race-safe gift card decrement. The WHERE balance >= amount guarantees we
      // can't oversell across concurrent checkouts; if 0 rows are updated, the
      // card was drained by a parallel order and we abort.
      if (giftCardCode && giftCardId && giftCardDiscount > 0) {
        const updated = await tx.$executeRaw`
          UPDATE gift_cards
          SET balance = balance - ${giftCardDiscount}, updated_at = NOW()
          WHERE code = ${giftCardCode}
            AND is_active = true
            AND balance >= ${giftCardDiscount}
            AND (expires_at IS NULL OR expires_at > NOW())
        `
        if (updated === 0) {
          throw new GiftCardRaceError('Gift card balance changed during checkout. Please remove it and try again.')
        }
      }

      // Race-safe store-credit decrement. WHERE balance >= amount stops two
      // concurrent checkouts from overspending the same wallet; RETURNING gives
      // us the post-decrement balance for the ledger row written after create.
      let storeCreditId: string | null = null
      let storeCreditBalanceAfter = 0
      if (storeCreditUsed > 0 && userId) {
        const rows = await tx.$queryRaw<Array<{ id: string; balance: number }>>`
          UPDATE store_credits
          SET balance = balance - ${storeCreditUsed}, updated_at = NOW()
          WHERE user_id = ${userId} AND balance >= ${storeCreditUsed}
          RETURNING id, balance
        `
        if (rows.length === 0) {
          throw new StoreCreditRaceError('Your store credit balance changed during checkout. Please try again.')
        }
        storeCreditId = rows[0].id
        storeCreditBalanceAfter = rows[0].balance
      }

      // ── Race-safe stock decrement ───────────────────────────────────────
      // For products with track_inventory=true the UPDATE only matches when
      // current stock can satisfy the order; 0 rows → out of stock. For
      // non-tracked products the CASE leaves stock unchanged but the row
      // still matches so we get a single result row back. Errors here abort
      // the whole tx, so order/coupon/gift-card all roll back too.
      // `deducted` is the units actually removed for this row (componentQty ×
      // line qty for a bundle component) — used to write the matching SALE log.
      const stockUpdates: Array<{ id: string; stock: number; trackInventory: boolean; name: string; deducted: number }> = []

      // Deduct `qty` of one product, race-safe (0 rows → typed error → 409).
      // `label` is the customer-facing name; for a bundle component we name the
      // BUNDLE, not the internal part, so the message stays meaningful.
      const deductStock = async (productId: string, qty: number, label: string, fromBundle: boolean) => {
        const rows = await tx.$queryRaw<Array<{ id: string; stock: number; track_inventory: boolean; name: string }>>`
          UPDATE products
          SET stock = CASE WHEN track_inventory THEN stock - ${qty} ELSE stock END,
              updated_at = NOW()
          WHERE id = ${productId}
            AND is_active = true
            AND (track_inventory = false OR stock >= ${qty})
          RETURNING id, stock, track_inventory, name
        `
        if (rows.length === 0) {
          if (fromBundle) {
            throw new StockRaceError(`Sorry — "${label}" is currently unavailable (a bundled item just went out of stock). Please remove it from your cart.`)
          }
          // Disambiguate so the client sees a useful message — missing product
          // vs. inactive vs. out of stock all get tailored copy.
          const present = await tx.product.findUnique({
            where: { id: productId },
            select: { name: true, stock: true, trackInventory: true, isActive: true },
          })
          if (!present) {
            throw new StockRaceError(`Sorry — "${label}" is no longer available. Please remove it from your cart.`)
          }
          if (!present.isActive) {
            throw new StockRaceError(`Sorry — "${present.name}" was just taken off sale. Please remove it from your cart.`)
          }
          throw new StockRaceError(`Sorry — only ${present.stock} of "${present.name}" left in stock. Please update the quantity and try again.`)
        }
        stockUpdates.push({ id: rows[0].id, stock: rows[0].stock, trackInventory: rows[0].track_inventory, name: rows[0].name, deducted: qty })
      }

      for (const item of itemList) {
        if (bundleIdSet.has(item.id)) {
          // BUNDLE line → deduct each component. An empty bundle is misconfigured
          // and must never sell with zero stock movement.
          const components = bundleComponentMap.get(item.id) ?? []
          if (components.length === 0) {
            throw new StockRaceError(`Sorry — "${item.name}" is not available right now. Please remove it from your cart.`)
          }
          for (const comp of components) {
            await deductStock(comp.componentProductId, comp.quantity * item.quantity, item.name, true)
          }
        } else {
          await deductStock(item.id, item.quantity, item.name, false)
        }
      }

      const created = await tx.order.create({
        data: {
          userId,
          subtotal:        Number(subtotal),
          deliveryCharge:  Number(deliveryCharge),
          total:           serverTotal,
          paymentMethod,
          shippingOption,
          shippingProvider: shippingProvider ?? null,
          name,
          phone,
          email: email || userEmail || null,
          address,
          house,
          road,
          city,
          lat:          lat          ? Number(lat)          : null,
          lng:          lng          ? Number(lng)          : null,
          advancePaid:    advancePaid    ? Number(advancePaid)    : null,
          codAmount:      codAmount      ? Number(codAmount)      : null,
          advanceMethod:  advanceMethod  || null,
          couponCode:     couponCode,
          couponDiscount: serverCouponDiscount,
          autoDiscount:   safeAutoDiscount > 0 ? safeAutoDiscount : null,
          storeCreditUsed: storeCreditUsed > 0 ? storeCreditUsed : null,
          deliveryNote:   typeof deliveryNote === 'string' && deliveryNote.trim() ? deliveryNote.trim().slice(0, 500) : null,
          deliveryMode,
          items: {
            create: itemList.map(item => ({
              productId: item.id,
              name: item.name,
              price: item.salePrice ?? item.price,
              quantity: item.quantity,
              image: item.image,
            })),
          },
        },
      })

      // InventoryLog for each tracked deduction. Inside the tx so we either
      // get every row + the order, or none of it.
      for (const u of stockUpdates) {
        if (!u.trackInventory) continue
        await tx.inventoryLog.create({
          data: {
            productId:   u.id,
            type:        'SALE',
            quantity:    -u.deducted,
            stockAfter:  u.stock,
            referenceId: created.id,
            note:        `Order ${created.id.slice(0, 8).toUpperCase()}`,
          },
        })
      }

      // Store-credit ledger entry (atomic with the wallet decrement above).
      if (storeCreditId && storeCreditUsed > 0) {
        await tx.storeCreditTransaction.create({
          data: {
            creditId:     storeCreditId,
            amount:       -storeCreditUsed,
            balanceAfter: storeCreditBalanceAfter,
            type:         'REDEMPTION',
            reason:       `Order ${created.id.slice(0, 8).toUpperCase()}`,
            orderId:      created.id,
          },
        })
      }

      // Log gift card redemption (atomic with the balance decrement above)
      if (giftCardId && giftCardDiscount > 0) {
        await tx.giftCardRedemption.create({
          data: { giftCardId, orderId: created.id, amount: giftCardDiscount },
        })
      }

      return { order: created, stockUpdates }
    })

    const total = serverTotal

    // ── Human-readable order code ───────────────────────────────────────────
    // Generated post-create from the first item's product SKU + a per-prefix
    // sequence counter. Failure is non-fatal — the order still has its cuid id
    // and we can fall back to that for display.
    let orderCode: string | null = null
    try {
      const firstItem = (items as { id: string }[])[0]
      const prefix = await resolveOrderCodePrefix(firstItem?.id ?? null)
      orderCode = await assignOrderCode(order.id, prefix)
    } catch (e) {
      console.warn('[orders] orderCode assignment failed (non-fatal):', e)
    }

    // ── Delivery dispatch: MANUAL ───────────────────────────────────────────
    // No carrier consignment is created at checkout. The order is stored with
    // the customer's chosen shippingProvider / shippingOption / deliveryCharge
    // (above), but an admin assigns and dispatches delivery from the order
    // detail page — "Confirm & Assign" → POST /api/admin/orders/[id]/assign-delivery,
    // which calls the Pick & Drop / Pathao API and sets pathaoOrderId + tracking.
    // The admin UI keys "assigned" on pathaoOrderId/trackingUrl, so an
    // un-dispatched order correctly shows the Assign control with the customer's
    // chosen provider pre-selected.

    // ── Guest signup nudge: create a passwordless Profile + Address + magic-link token ──
    // Fires only when (1) request is guest (no auth cookie), (2) createAccount flag set,
    // (3) email is present, (4) no existing Profile with that email.
    // Failures are non-blocking — the order is already created.
    let magicLinkToken: string | null = null
    if (!userId && createAccount === true && email && typeof email === 'string') {
      try {
        const trimmedEmail = email.trim().toLowerCase()
        const existing = await prisma.profile.findUnique({ where: { email: trimmedEmail } })
        if (!existing) {
          const newProfile = await prisma.profile.create({
            data: {
              email:    trimmedEmail,
              name:     name || null,
              phone:    phone || null,
              password: null,
              role:     'CUSTOMER',
            },
          })
          // Backfill the order with the new userId so order history shows up post-claim
          await prisma.order.update({ where: { id: order.id }, data: { userId: newProfile.id } }).catch(() => {})

          // Save the address to the new profile so it shows up in their saved addresses
          if (address && (province || district || municipality)) {
            await prisma.address.create({
              data: {
                userId:       newProfile.id,
                label:        'Home',
                name:         name || newProfile.name || 'Customer',
                phone:        phone || newProfile.phone || '',
                address,
                house:        house        || null,
                road:         road         || null,
                city:         city         || 'Kathmandu',
                lat:          lat ? Number(lat) : null,
                lng:          lng ? Number(lng) : null,
                isDefault:    true,
                province:     province          ?? null,
                district:     district          ?? null,
                municipality: municipality      ?? null,
                ward:         ward              ?? null,
                street:       street            ?? null,
                tole:         tole              ?? null,
                landmark:     structuredLandmark ?? null,
              },
            }).catch(() => {})
          }

          magicLinkToken = await createMagicToken({
            email:   trimmedEmail,
            type:    'signup-claim',
            orderId: order.id,
          })
        }
      } catch (e) {
        console.warn('[orders] guest signup nudge failed (non-fatal):', e)
      }
    }

    // WhatsApp order confirmation (fire-and-forget)
    import('@/lib/notifications').then(({ sendOrderConfirmation }) =>
      sendOrderConfirmation(order.id, phone, name, total).catch(() => {})
    ).catch(() => {})

    // Email order confirmation (fire-and-forget) — also includes the magic-link
    // CTA when this was a guest order with the "save my info" flag set.
    const recipientEmail = email || userEmail
    if (recipientEmail) {
      ;(async () => {
        try {
          const settings = await getSiteSettings()
          const claimUrl = magicLinkToken
            ? magicLinkUrl(magicLinkToken, settings.storeUrl)
            : null

          const { subject, html } = await renderEmail('order-confirmed', {
            orderId:        order.id,
            recipientName:  name,
            recipientEmail,
            recipientPhone: phone,
            address,
            shippingOption,
            subtotal:       Number(subtotal),
            deliveryCharge: Number(deliveryCharge),
            couponDiscount: serverCouponDiscount,
            autoDiscount:   safeAutoDiscount > 0 ? safeAutoDiscount : null,
            total,
            paymentMethod,
            items: (items as { name: string; price: number; salePrice?: number | null; quantity: number; image?: string }[]).map(it => ({
              name:     it.name,
              quantity: it.quantity,
              price:    it.salePrice ?? it.price,
              image:    it.image,
            })),
            magicLinkUrl: claimUrl,
            siteUrl:      settings.storeUrl,
            siteName:     settings.siteName,
            tagline:      settings.seo.description,
          })

          await sendEmailLogged('order-confirmed', { to: recipientEmail, subject, html, context: { orderId: order.id, orderCode } })
        } catch (e) {
          console.warn('[orders] email send failed (non-fatal):', e)
        }
      })()
    }

    // FCM push notification (fire-and-forget)
    pushOrderEvent({
      userId:  userId,
      orderId: order.id,
      title:   '✅ Order Confirmed!',
      body:    `Your order of Rs. ${Math.round(total).toLocaleString('en-IN')} is confirmed. We'll notify you when it ships.`,
    }).catch(() => {})

    // Note: coupon usedCount was already incremented atomically inside the transaction above.

    // Stock decrement + inventoryLog rows were written atomically inside the
    // tx above. Build the low-stock candidate list from the per-item results
    // we returned — only tracked products contribute.
    const crossedLowStock: Array<{ id: string; name: string; stock: number }> = stockUpdates
      .filter(u => u.trackInventory)
      .map(u => ({ id: u.id, name: u.name, stock: u.stock }))

    // Admin new-order alert + low-stock alerts (both fire-and-forget).
    ;(async () => {
      try {
        const settings = await getSiteSettings()
        const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
          SELECT key, value FROM app_settings
          WHERE key IN ('ORDER_NOTIFICATION_EMAIL', 'LOW_STOCK_THRESHOLD', 'LOW_STOCK_NOTIFICATION_EMAIL',
                        'SUPPLIER_AUTO_REORDER', 'STORE_PHONE', 'STORE_EMAIL')
        `
        const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]))
        const adminTo  = cfg.ORDER_NOTIFICATION_EMAIL?.trim()
        const lowTo    = (cfg.LOW_STOCK_NOTIFICATION_EMAIL?.trim() || adminTo || '')
        const threshold = Math.max(0, Number(cfg.LOW_STOCK_THRESHOLD ?? 5) || 5)

        if (adminTo) {
          const rendered = await renderEmail('admin-new-order', {
            orderId:        order.id,
            customerName:   name,
            customerEmail:  email || userEmail || '',
            customerPhone:  phone,
            total,
            itemCount:      (items as unknown[]).length,
            paymentMethod,
            shippingOption,
            adminUrl:       `${settings.storeUrl}/admin/orders/${order.id}`,
            siteUrl:        settings.storeUrl,
            siteName:       settings.siteName,
            tagline:        settings.seo.description,
          })
          await sendEmailLogged('admin-new-order', { to: adminTo, subject: rendered.subject, html: rendered.html, context: { orderId: order.id } })
        }

        if (lowTo) {
          for (const p of crossedLowStock) {
            if (p.stock > threshold) continue
            const rendered = await renderEmail('low-stock', {
              productName:    p.name,
              productId:      p.id,
              currentStock:   p.stock,
              threshold,
              productUrl:     `${settings.storeUrl}/admin/products/${p.id}/edit`,
              recipientEmail: lowTo,
              siteUrl:        settings.storeUrl,
              siteName:       settings.siteName,
              tagline:        settings.seo.description,
            })
            await sendEmailLogged('low-stock', { to: lowTo, subject: rendered.subject, html: rendered.html, context: { productId: p.id, stock: p.stock } })
          }
        }

        // Auto low-stock alert to suppliers — same crossed-threshold products as
        // the admin alert, but only those with a linked supplier email. Each
        // product is judged against its OWN lowStockThreshold. Gated by
        // SUPPLIER_AUTO_REORDER (defaults on). This is a heads-up notice, not a
        // firm PO — the admin sends a quantity from the product page.
        const supplierAuto = (cfg.SUPPLIER_AUTO_REORDER ?? 'true') !== 'false'
        if (supplierAuto && crossedLowStock.length) {
          const withSuppliers = await prisma.product.findMany({
            where:  { id: { in: crossedLowStock.map(p => p.id) }, supplier: { email: { not: null } } },
            select: {
              id: true, name: true, sku: true, stock: true, lowStockThreshold: true,
              supplier: { select: { name: true, contactName: true, email: true } },
            },
          })
          for (const p of withSuppliers) {
            if (!p.supplier?.email || p.stock > p.lowStockThreshold) continue
            const rendered = await renderEmail('supplier-reorder', {
              kind:           'LOW_STOCK_ALERT',
              supplierName:   p.supplier.name,
              contactName:    p.supplier.contactName,
              productName:    p.name,
              sku:            p.sku,
              currentStock:   p.stock,
              threshold:      p.lowStockThreshold,
              quantity:       null,
              note:           null,
              storePhone:     cfg.STORE_PHONE || null,
              storeEmail:     cfg.STORE_EMAIL || null,
              recipientEmail: p.supplier.email,
              siteUrl:        settings.storeUrl,
              siteName:       settings.siteName,
              tagline:        settings.seo.description,
            })
            await sendEmailLogged('supplier-reorder', {
              to: p.supplier.email, subject: rendered.subject, html: rendered.html,
              context: { productId: p.id, auto: true },
            })
          }
        }
      } catch (e) {
        console.warn('[orders] admin/low-stock emails failed (non-fatal):', e)
      }
    })()

    // Fully covered by discounts / gift card / store credit → nothing to charge.
    // eSewa and Khalti both reject a 0 amount, which would strand an unpaid order
    // with the credit/card already spent. Skip the gateway and mark it paid.
    // (COD has no gateway and falls through to the success return below.)
    if (total <= 0 && (paymentMethod === 'ESEWA' || paymentMethod === 'KHALTI')) {
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAID' } }).catch(() => {})
      return Response.json({ orderId: order.id, orderCode, status: 'success', magicLinkToken }, { status: 201 })
    }

    if (paymentMethod === 'ESEWA') {
      // Charge the discounted server total (coupon + gift card + autoDiscount
      // already applied), passed as the full amount with 0 delivery so the
      // signed total_amount = total. eSewa previously charged subtotal+delivery
      // and ignored every discount. Verification reconciles against the signed
      // callback amount (not order.total), so this stays self-consistent.
      const esewaData = await esewaFormData(order.id, total, 0)
      const esewaUrl  = await getEsewaPaymentUrl()
      return Response.json({ orderId: order.id, orderCode, esewaData, esewaUrl })
    }

    if (paymentMethod === 'KHALTI') {
      const khalti = await khaltiInitiate({
        orderId:       order.id,
        orderName:     `Balapasa Order ${order.id.slice(0, 8)}`,
        amount:        total,
        customerName:  name,
        customerEmail: email || userEmail || 'customer@balapasa.com',
        customerPhone: phone,
      })

      if (khalti.error || !khalti.payment_url) {
        await prisma.order.delete({ where: { id: order.id } }).catch(() => {})
        return Response.json(
          { error: `Khalti initiation failed: ${khalti.error ?? 'no payment_url'}` },
          { status: 502 },
        )
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { transactionId: khalti.pidx },
      })
      // Return both paymentUrl (web redirect) and pidx (mobile SDK v3 needs this)
      return Response.json({ orderId: order.id, orderCode, paymentUrl: khalti.payment_url, pidx: khalti.pidx })
    }

    return Response.json(
      { orderId: order.id, orderCode, status: 'success', magicLinkToken },
      { status: 201 },
    )
  } catch (e) {
    if (e instanceof CouponRaceError || e instanceof GiftCardRaceError || e instanceof StockRaceError || e instanceof StoreCreditRaceError) {
      return Response.json({ error: e.message }, { status: 409 })
    }
    console.error('[orders] create failed:', e)
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json(
      { error: process.env.NODE_ENV === 'development' ? msg : 'Failed to create order' },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const me = await getCurrentUser()
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const orders = await prisma.order.findMany({
      where: { userId: me.sub },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })
    return Response.json({ orders })
  } catch {
    return Response.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
