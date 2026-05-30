import 'server-only'
import { prisma } from '@/lib/prisma'
import { render as renderEmail } from '@/lib/emails/registry'
import { sendEmailLogged } from '@/lib/email'
import { getSiteSettings } from '@/lib/site-settings'

// Fire-and-forget admin alert when an order's status changes. Opt-in: only sends
// when ADMIN_STATUS_CHANGE_EMAIL is explicitly 'true' (off by default) AND an
// ORDER_NOTIFICATION_EMAIL is configured. Recipient is the same notification
// address used for new-order alerts.
export async function notifyAdminStatusChange(params: {
  orderId: string
  status:  string
  source?: string   // 'Admin' | 'Pick & Drop'
}): Promise<void> {
  try {
    const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM app_settings
      WHERE key IN ('ORDER_NOTIFICATION_EMAIL', 'ADMIN_STATUS_CHANGE_EMAIL')
    `
    const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]))
    const enabled = cfg.ADMIN_STATUS_CHANGE_EMAIL === 'true'   // default OFF
    const to      = cfg.ORDER_NOTIFICATION_EMAIL?.trim()
    if (!enabled || !to) return

    const order = await prisma.order.findUnique({
      where:  { id: params.orderId },
      select: { id: true, orderCode: true, name: true, phone: true, total: true, shippingOption: true },
    })
    if (!order) return

    const settings = await getSiteSettings()
    const { subject, html } = await renderEmail('admin-status-change', {
      orderId:        order.id,
      orderCode:      order.orderCode,
      status:         params.status,
      source:         params.source ?? null,
      customerName:   order.name,
      customerPhone:  order.phone,
      total:          order.total,
      shippingOption: order.shippingOption ?? null,
      adminUrl:       `${settings.storeUrl}/admin/orders/${order.id}`,
      siteUrl:        settings.storeUrl,
      siteName:       settings.siteName,
      tagline:        settings.seo.description,
    })
    await sendEmailLogged('admin-status-change', { to, subject, html, context: { orderId: order.id, status: params.status } })
  } catch (e) {
    console.warn('[notify-admin-status] failed (non-fatal):', e)
  }
}
