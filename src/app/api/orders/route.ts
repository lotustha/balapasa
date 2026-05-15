import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { esewaFormData, getEsewaPaymentUrl, khaltiInitiate } from '@/lib/payment'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { pushOrderEvent } from '@/lib/push'
import { validateCoupon } from '@/lib/coupons'
import { validateGiftCard } from '@/lib/gift-cards'
import { ENABLED_PAYMENT_METHODS } from '@/lib/features'
import { createMagicToken, magicLinkUrl } from '@/lib/magic-link'
import { sendEmail } from '@/lib/email'
import { render as renderEmail } from '@/lib/emails/registry'
import { getSiteSettings } from '@/lib/site-settings'

// Tag used to distinguish coupon-race aborts from generic Prisma errors so we
// can surface a 409 to the client instead of a 500.
class CouponRaceError extends Error {
  readonly _coupon = true
}

class GiftCardRaceError extends Error {
  readonly _giftCard = true
}

export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null
    let userEmail: string | null = null
    try {
      const token = req.cookies.get(AUTH_COOKIE)?.value
      if (token) {
        const payload = await verifyToken(token)
        userId    = payload?.sub    ?? null
        userEmail = payload?.email  ?? null
      }
    } catch { /* guest checkout */ }

    const body = await req.json()
    const {
      items, subtotal, deliveryCharge, paymentMethod, shippingOption, shippingProvider,
      name, phone, email, address, house, road, city, lat, lng,
      advancePaid, codAmount, advanceMethod,
      couponCode: rawCouponCode, autoDiscount,
      giftCardCode: rawGiftCardCode,
      // Structured Nepal address (used when saving address to a new/existing Profile)
      province, district, municipality, ward, street, tole,
      // Guest signup nudge — "Save my info for next time" checkbox
      createAccount,
    } = body

    // Reject payment methods that are feature-flagged off for this release.
    // Keeps eSewa/Khalti integration code dormant but live for post-launch flip.
    if (!ENABLED_PAYMENT_METHODS.includes(paymentMethod)) {
      return Response.json(
        { error: `Payment method "${paymentMethod}" is temporarily unavailable. Please use Cash on Delivery.` },
        { status: 400 },
      )
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

    const serverTotal = Math.max(0, totalBeforeGiftCard - giftCardDiscount)

    // ── Atomic transaction: coupon usage check-and-increment + order create ─
    // The raw UPDATE with WHERE used_count < max_uses is race-safe at the DB level.
    // If the coupon was exhausted between validate and now (concurrent checkout),
    // the update affects 0 rows and we abort the transaction.
    const order = await prisma.$transaction(async tx => {
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
          items: {
            create: (items as {
              id: string; name: string; price: number; salePrice?: number | null;
              image: string; quantity: number;
            }[]).map(item => ({
              productId: item.id,
              name: item.name,
              price: item.salePrice ?? item.price,
              quantity: item.quantity,
              image: item.image,
            })),
          },
        },
      })

      // Log gift card redemption (atomic with the balance decrement above)
      if (giftCardId && giftCardDiscount > 0) {
        await tx.giftCardRedemption.create({
          data: { giftCardId, orderId: created.id, amount: giftCardDiscount },
        })
      }

      return created
    })

    const total = serverTotal

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
                province:     province     ?? null,
                district:     district     ?? null,
                municipality: municipality ?? null,
                ward:         ward         ?? null,
                street:       street       ?? null,
                tole:         tole         ?? null,
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

          await sendEmail({ to: recipientEmail, subject, html })
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

    // Track products that crossed the low-stock threshold during this order so
    // a single combined alert email can fire below (one per product).
    const crossedLowStock: Array<{ id: string; name: string; stock: number }> = []

    try {
      for (const item of items as { id: string; quantity: number }[]) {
        const product = await prisma.product.findUnique({
          where: { id: item.id },
          select: { stock: true, trackInventory: true, name: true },
        })
        if (!product || !product.trackInventory) continue

        const newStock = Math.max(0, product.stock - item.quantity)
        await prisma.product.update({ where: { id: item.id }, data: { stock: newStock } })
        await prisma.inventoryLog.create({
          data: {
            productId:   item.id,
            type:        'SALE',
            quantity:    -item.quantity,
            stockAfter:  newStock,
            referenceId: order.id,
            note:        `Order ${order.id.slice(0, 8).toUpperCase()}`,
          },
        })
        // Defer threshold comparison to the email block where we read the
        // configured threshold once; just record the new stock here.
        crossedLowStock.push({ id: item.id, name: product.name, stock: newStock })
      }
    } catch (e) {
      console.warn('[orders] stock deduction failed (non-fatal):', e)
    }

    // Admin new-order alert + low-stock alerts (both fire-and-forget).
    ;(async () => {
      try {
        const settings = await getSiteSettings()
        const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
          SELECT key, value FROM app_settings
          WHERE key IN ('ORDER_NOTIFICATION_EMAIL', 'LOW_STOCK_THRESHOLD', 'LOW_STOCK_NOTIFICATION_EMAIL')
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
          await sendEmail({ to: adminTo, subject: rendered.subject, html: rendered.html })
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
            await sendEmail({ to: lowTo, subject: rendered.subject, html: rendered.html })
          }
        }
      } catch (e) {
        console.warn('[orders] admin/low-stock emails failed (non-fatal):', e)
      }
    })()

    if (paymentMethod === 'ESEWA') {
      const esewaData = await esewaFormData(order.id, subtotal, deliveryCharge)
      const esewaUrl  = await getEsewaPaymentUrl()
      return Response.json({ orderId: order.id, esewaData, esewaUrl })
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
      return Response.json({ orderId: order.id, paymentUrl: khalti.payment_url, pidx: khalti.pidx })
    }

    return Response.json(
      { orderId: order.id, status: 'success', magicLinkToken },
      { status: 201 },
    )
  } catch (e) {
    if (e instanceof CouponRaceError || e instanceof GiftCardRaceError) {
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

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyToken(token)
    if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const orders = await prisma.order.findMany({
      where: { userId: payload.sub },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })
    return Response.json({ orders })
  } catch {
    return Response.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
