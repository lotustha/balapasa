import 'server-only'
import { prisma } from '@/lib/prisma'
import { render as renderEmail } from '@/lib/emails/registry'
import { sendEmailLogged } from '@/lib/email'
import { getSiteSettings } from '@/lib/site-settings'

/**
 * Fire-and-forget emails for the return-request lifecycle. One entry point
 * keyed on the new state so the caller doesn't need to thread render +
 * payload code through every transition route.
 */
export function notifyReturnState(returnRequestId: string, kind: 'FILED' | 'APPROVED' | 'REJECTED' | 'REFUNDED'): void {
  ;(async () => {
    try {
      const rr = await prisma.returnRequest.findUnique({
        where:  { id: returnRequestId },
        select: { id: true, orderId: true, adminNote: true, refundAmount: true, reason: true, customerNote: true, items: { select: { quantity: true, orderItemId: true } } },
      })
      if (!rr) return
      const order = await prisma.order.findUnique({
        where:  { id: rr.orderId },
        select: { id: true, orderCode: true, name: true, email: true },
      })
      if (!order?.email) return

      const settings = await getSiteSettings()
      const code     = order.orderCode ?? order.id.slice(0, 8).toUpperCase()
      const orderUrl = `${settings.storeUrl}/account/orders/${order.id}/return`

      if (kind === 'FILED') {
        // Hydrate item names from OrderItem ids.
        const oiIds = rr.items.map(i => i.orderItemId)
        const ois = oiIds.length
          ? await prisma.orderItem.findMany({ where: { id: { in: oiIds } }, select: { id: true, name: true } })
          : []
        const byId = new Map(ois.map(o => [o.id, o]))
        const items = rr.items.map(i => ({
          name:     byId.get(i.orderItemId)?.name ?? 'Item',
          quantity: i.quantity,
        }))
        const { subject, html } = await renderEmail('return-filed', {
          orderId:       order.id,
          orderCode:     order.orderCode,
          recipientName: order.name,
          refundAmount:  rr.refundAmount,
          items,
          orderUrl,
          siteUrl:       settings.storeUrl,
          siteName:      settings.siteName,
          tagline:       settings.seo.description,
        })
        await sendEmailLogged('return-filed', { to: order.email, subject, html, context: { orderId: order.id, returnRequestId } })
        return
      }

      if (kind === 'APPROVED') {
        const rows = await prisma.$queryRaw<{ value: string }[]>`
          SELECT value FROM app_settings WHERE key = 'STORE_ADDRESS' LIMIT 1
        `
        const storeAddress = rows[0]?.value?.trim() || 'Our store'
        const { subject, html } = await renderEmail('return-approved', {
          orderId:       order.id,
          orderCode:     order.orderCode,
          recipientName: order.name,
          storeAddress,
          adminNote:     rr.adminNote,
          orderUrl,
          siteUrl:       settings.storeUrl,
          siteName:      settings.siteName,
          tagline:       settings.seo.description,
        })
        await sendEmailLogged('return-approved', { to: order.email, subject, html, context: { orderId: order.id, returnRequestId } })
        return
      }

      if (kind === 'REJECTED') {
        const { subject, html } = await renderEmail('return-rejected', {
          orderId:       order.id,
          orderCode:     order.orderCode,
          recipientName: order.name,
          reason:        rr.adminNote?.trim() || 'After review we were unable to approve this return.',
          orderUrl,
          siteUrl:       settings.storeUrl,
          siteName:      settings.siteName,
          tagline:       settings.seo.description,
        })
        await sendEmailLogged('return-rejected', { to: order.email, subject, html, context: { orderId: order.id, returnRequestId } })
        return
      }

      if (kind === 'REFUNDED') {
        const { subject, html } = await renderEmail('refund-issued', {
          orderId:       order.id,
          orderCode:     order.orderCode,
          recipientName: order.name,
          refundAmount:  rr.refundAmount,
          method:        rr.adminNote?.trim() || 'Refund processed by our team.',
          orderUrl,
          siteUrl:       settings.storeUrl,
          siteName:      settings.siteName,
          tagline:       settings.seo.description,
        })
        await sendEmailLogged('refund-issued', { to: order.email, subject, html, context: { orderId: order.id, returnRequestId } })
        return
      }
    } catch (e) {
      console.warn('[notify-return-state] failed (non-fatal):', e)
    }
  })()
}

/** Internal admin alert when a new return is filed. */
export function notifyReturnRequestedToAdmin(returnRequestId: string): void {
  ;(async () => {
    try {
      const rr = await prisma.returnRequest.findUnique({
        where:  { id: returnRequestId },
        select: { id: true, orderId: true, reason: true, refundAmount: true, items: { select: { quantity: true } } },
      })
      if (!rr) return
      const order = await prisma.order.findUnique({
        where:  { id: rr.orderId },
        select: { id: true, orderCode: true, name: true },
      })
      if (!order) return

      const settings = await getSiteSettings()
      const rows = await prisma.$queryRaw<{ value: string }[]>`
        SELECT value FROM app_settings WHERE key = 'ORDER_NOTIFICATION_EMAIL' LIMIT 1
      `
      const adminTo = rows[0]?.value?.trim()
      if (!adminTo) return

      const itemCount = rr.items.reduce((s, i) => s + i.quantity, 0)
      const { subject, html } = await renderEmail('return-requested-admin', {
        orderId:      order.id,
        orderCode:    order.orderCode,
        customerName: order.name,
        refundAmount: rr.refundAmount,
        itemCount,
        reason:       rr.reason.replace(/_/g, ' ').toLowerCase(),
        adminUrl:     `${settings.storeUrl}/admin/returns/${rr.id}`,
        siteUrl:      settings.storeUrl,
        siteName:     settings.siteName,
        tagline:      settings.seo.description,
      })
      await sendEmailLogged('return-requested-admin', { to: adminTo, subject, html, context: { returnRequestId } })
    } catch (e) {
      console.warn('[notify-return-state:admin] failed (non-fatal):', e)
    }
  })()
}
