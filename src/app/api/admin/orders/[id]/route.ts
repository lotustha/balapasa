import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pushOrderEvent } from '@/lib/push'
import { sendEmailLogged } from '@/lib/email'
import { render as renderEmail } from '@/lib/emails/registry'
import { getSiteSettings } from '@/lib/site-settings'
import { notifyPaymentReceipt } from '@/lib/notify-payment-receipt'
import { restoreStockForOrder } from '@/lib/restore-stock'
import { cancelPndOrder } from '@/lib/pickndrop'
import { cancelParcel } from '@/lib/pathao'
import { notifyAdminStatusChange } from '@/lib/notify-admin-status'
import { awardLoyaltyForOrder } from '@/lib/loyalty'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}
    const allowed = ['status','paymentStatus','notes','name','phone','email',
      'address','house','road','city','lat','lng','deliveryCharge',
      'shippingOption','pathaoOrderId','pathaoHash','trackingUrl']
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key] === '' ? null : body[key]
    }
    const order = await prisma.order.update({
      where: { id }, data,
      include: { items: true },
    })

    // Push + WhatsApp + Email on status changes. Settings fetched once and
    // shared across any email this PATCH triggers.
    const emailSettings = await getSiteSettings()
    function maybeSendStatusEmail(status: 'SHIPPED' | 'DELIVERED' | 'CANCELLED') {
      if (!order.email) return
      ;(async () => {
        try {
          const { subject, html } = await renderEmail('shipment-update', {
            orderId:        order.id,
            recipientName:  order.name,
            status,
            trackingUrl:    order.trackingUrl ?? null,
            shippingOption: order.shippingOption ?? null,
            siteUrl:        emailSettings.storeUrl,
            siteName:       emailSettings.siteName,
            tagline:        emailSettings.seo.description,
          })
          await sendEmailLogged('shipment-update', { to: order.email!, subject, html, context: { orderId: order.id, status } })
        } catch (e) {
          console.warn('[orders PATCH] status email failed (non-fatal):', e)
        }
      })()
    }

    if (body.status === 'SHIPPED') {
      if (order.trackingUrl && order.phone) {
        import('@/lib/notifications').then(({ sendShippingNotification }) =>
          sendShippingNotification(order.id, order.phone, order.trackingUrl!).catch(() => {})
        ).catch(() => {})
      }
      pushOrderEvent({
        userId:  order.userId,
        orderId: order.id,
        title:   '🚚 Your order is on its way!',
        body:    `Order #${order.id.slice(0, 8).toUpperCase()} has been shipped via Pathao.${order.trackingUrl ? ' Tap to track.' : ''}`,
      }).catch(() => {})
      maybeSendStatusEmail('SHIPPED')
    }

    if (body.status === 'DELIVERED') {
      pushOrderEvent({
        userId:  order.userId,
        orderId: order.id,
        title:   '✅ Order Delivered!',
        body:    `Order #${order.id.slice(0, 8).toUpperCase()} was delivered. Enjoy your purchase!`,
      }).catch(() => {})
      maybeSendStatusEmail('DELIVERED')
      // Award loyalty points (idempotent; no-op if disabled, guest, or already
      // awarded — e.g. the PnD webhook also marked it delivered).
      awardLoyaltyForOrder(order.id).catch(e => console.warn('[orders PATCH] loyalty award failed (non-fatal):', e))
    }

    if (body.status === 'CANCELLED') {
      pushOrderEvent({
        userId:  order.userId,
        orderId: order.id,
        title:   '❌ Order Cancelled',
        body:    `Order #${order.id.slice(0, 8).toUpperCase()} has been cancelled. Contact support if this was unexpected.`,
      }).catch(() => {})
      maybeSendStatusEmail('CANCELLED')
      // Restore stock so the inventory ledger stays honest. Idempotent: a
      // second cancel is a no-op because the helper checks for an existing
      // RETURN log keyed on this orderId.
      restoreStockForOrder(order.id, 'ADMIN').catch(e =>
        console.warn('[orders PATCH] stock restore failed (non-fatal):', e),
      )
      // Propagate cancellation to the carrier — otherwise cancelling the ORDER
      // leaves the parcel live on Pick & Drop / Pathao. (This is separate from
      // the "Cancel Delivery" action, which hits cancel-delivery; cancelling the
      // order via status must do the same.) Best-effort, non-blocking.
      const isPnd = order.shippingProvider === 'PICKNDROP' || order.shippingOption?.toLowerCase().includes('pick')
      const pndId = order.pndOrderId || order.pathaoOrderId
      if (isPnd && pndId) {
        cancelPndOrder(pndId).catch(e => console.warn('[orders PATCH] PnD cancel failed (non-fatal):', String(e)))
      }
      const isPathao = order.shippingProvider === 'PATHAO' || order.shippingOption?.toLowerCase().includes('pathao')
      if (isPathao && order.pathaoHash) {
        cancelParcel(order.pathaoHash).catch(e => console.warn('[orders PATCH] Pathao cancel failed (non-fatal):', String(e)))
      }
    }

    // Opt-in admin alert on ANY status change (off by default; gated inside the
    // helper). Covers PENDING…DELIVERED/CANCELLED, not just the ones with a
    // customer email above. Fire-and-forget.
    if (body.status) {
      notifyAdminStatusChange({ orderId: order.id, status: String(body.status), source: 'Admin' })
    }

    if (body.paymentStatus === 'PAID' && order.paymentStatus === 'PAID') {
      pushOrderEvent({
        userId:  order.userId,
        orderId: order.id,
        title:   '💳 Payment Confirmed',
        body:    `Rs. ${Math.round(order.total).toLocaleString('en-IN')} payment received for order #${order.id.slice(0, 8).toUpperCase()}.`,
      }).catch(() => {})
      // Receipt email — fires for COD-collected-on-delivery and any other
      // admin-driven mark-as-paid action. The dedicated wallet callback in
      // /api/payment/verify already covers eSewa + Khalti synchronously, but
      // this catches admin overrides too.
      notifyPaymentReceipt({
        orderId:       order.id,
        method:        order.paymentMethod,
        transactionId: order.transactionId,
      })
    }

    // Pickup-ready email — only when this order is store-pickup AND status
    // just transitioned to PROCESSING. We don't have a clean "previous status"
    // in scope, so we fire whenever the PATCH explicitly set status=PROCESSING
    // (idempotent: a duplicate click will send a duplicate email but that's
    // rare enough to ignore for now).
    if (body.status === 'PROCESSING' && order.shippingProvider === 'STORE_PICKUP' && order.email) {
      ;(async () => {
        try {
          // STORE_ADDRESS isn't surfaced by getSiteSettings yet — pull directly
          // from app_settings so the email shows the configured pickup point.
          const rows = await prisma.$queryRaw<{ value: string }[]>`
            SELECT value FROM app_settings WHERE key = 'STORE_ADDRESS' LIMIT 1
          `
          const storeAddress = rows[0]?.value?.trim() || 'Our store'
          const code = order.orderCode ?? order.id.slice(0, 8).toUpperCase()
          const { subject, html } = await renderEmail('pickup-ready', {
            orderId:       order.id,
            orderCode:     order.orderCode,
            recipientName: order.name,
            storeAddress,
            storeHours:    null,
            pickupWindow:  null,
            orderUrl:      `${emailSettings.storeUrl}/track-order/${encodeURIComponent(code)}`,
            siteUrl:       emailSettings.storeUrl,
            siteName:      emailSettings.siteName,
            tagline:       emailSettings.seo.description,
          })
          await sendEmailLogged('pickup-ready', { to: order.email!, subject, html, context: { orderId: order.id } })
        } catch (e) {
          console.warn('[orders PATCH] pickup-ready failed (non-fatal):', e)
        }
      })()
    }

    return Response.json({ ...order, createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString() })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!order) return Response.json({ error: 'Not found' }, { status: 404 })
    // Carrier/admin status timeline — the granular logistics sub-states
    // (pickup, hub, out-for-delivery, …) that roll up to order.status.
    const timeline = await prisma.orderStatusLog.findMany({
      where:   { orderId: id },
      orderBy: { createdAt: 'asc' },
      select:  { id: true, source: true, rawStatus: true, mappedStatus: true, comment: true, createdAt: true },
    })
    return Response.json({
      ...order,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      timeline:  timeline.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })),
    })
  } catch {
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
