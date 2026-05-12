import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { esewaFormData, ESEWA_PAYMENT_URL, khaltiInitiate } from '@/lib/payment'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { pushOrderEvent } from '@/lib/push'
import { validateCoupon } from '@/lib/coupons'
import { ENABLED_PAYMENT_METHODS } from '@/lib/features'

// Tag used to distinguish coupon-race aborts from generic Prisma errors so we
// can surface a 409 to the client instead of a 500.
class CouponRaceError extends Error {
  readonly _coupon = true
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
    const { items, subtotal, deliveryCharge, paymentMethod, shippingOption, shippingProvider, name, phone, email, address, house, road, city, lat, lng, advancePaid, codAmount, advanceMethod, couponCode: rawCouponCode, autoDiscount } = body

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
    const serverTotal = Math.max(
      0,
      Number(subtotal) + Number(deliveryCharge) - (serverCouponDiscount ?? 0) - safeAutoDiscount,
    )

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
      return tx.order.create({
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
    })

    const total = serverTotal

    // WhatsApp order confirmation (fire-and-forget)
    import('@/lib/notifications').then(({ sendOrderConfirmation }) =>
      sendOrderConfirmation(order.id, phone, name, total).catch(() => {})
    ).catch(() => {})

    // FCM push notification (fire-and-forget)
    pushOrderEvent({
      userId:  userId,
      orderId: order.id,
      title:   '✅ Order Confirmed!',
      body:    `Your order of Rs. ${Math.round(total).toLocaleString('en-IN')} is confirmed. We'll notify you when it ships.`,
    }).catch(() => {})

    // Note: coupon usedCount was already incremented atomically inside the transaction above.

    try {
      for (const item of items as { id: string; quantity: number }[]) {
        const product = await prisma.product.findUnique({
          where: { id: item.id },
          select: { stock: true, trackInventory: true },
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
      }
    } catch (e) {
      console.warn('[orders] stock deduction failed (non-fatal):', e)
    }

    if (paymentMethod === 'ESEWA') {
      const esewaData = esewaFormData(order.id, subtotal, deliveryCharge)
      return Response.json({ orderId: order.id, esewaData, esewaUrl: ESEWA_PAYMENT_URL })
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

    return Response.json({ orderId: order.id, status: 'success' }, { status: 201 })
  } catch (e) {
    if (e instanceof CouponRaceError) {
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
