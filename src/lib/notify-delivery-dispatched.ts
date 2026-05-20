import 'server-only'
import { prisma } from '@/lib/prisma'
import { render as renderEmail } from '@/lib/emails/registry'
import { sendEmailLogged } from '@/lib/email'
import { getSiteSettings } from '@/lib/site-settings'

/**
 * Fire-and-forget "your order is on its way" email. Called by:
 *  - /api/admin/orders/[id]/assign-delivery (right after carrier responds)
 *  - PnD webhook handler on `package_pickup_success`
 *
 * Internal-only tracking URL is composed from the order's code, so we never
 * leak external carrier links into the customer experience.
 */
export function notifyDeliveryDispatched(args: {
  orderId:         string
  courierName:     string                  // 'Pick & Drop' | 'Pathao' | 'Store Rider' | etc.
  trackingNumber?: string | null
  etaText?:        string | null
}): void {
  ;(async () => {
    try {
      const order = await prisma.order.findUnique({
        where: { id: args.orderId },
        select: { id: true, orderCode: true, name: true, email: true },
      })
      if (!order?.email) return
      const settings = await getSiteSettings()
      const code     = order.orderCode ?? order.id.slice(0, 8).toUpperCase()
      const orderUrl = `${settings.storeUrl}/track-order/${encodeURIComponent(code)}`

      const { subject, html } = await renderEmail('delivery-dispatched', {
        orderId:        order.id,
        orderCode:      order.orderCode,
        recipientName:  order.name,
        courierName:    args.courierName,
        trackingNumber: args.trackingNumber ?? null,
        etaText:        args.etaText ?? null,
        orderUrl,
        siteUrl:        settings.storeUrl,
        siteName:       settings.siteName,
        tagline:        settings.seo.description,
      })
      await sendEmailLogged('delivery-dispatched', { to: order.email, subject, html, context: { orderId: order.id, courier: args.courierName } })
    } catch (e) {
      console.warn('[notify-delivery-dispatched] failed (non-fatal):', e)
    }
  })()
}
