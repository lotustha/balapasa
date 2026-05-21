import 'server-only'
import { prisma } from '@/lib/prisma'
import { render as renderEmail } from '@/lib/emails/registry'
import { sendEmailLogged } from '@/lib/email'
import { getSiteSettings } from '@/lib/site-settings'

/**
 * Fire-and-forget customer email when an order is cancelled (customer-side).
 * If the order was wallet-paid (paymentStatus moved to REFUNDED in the cancel
 * transaction), the email surfaces the "refund coming" callout.
 */
export function notifyOrderCancelled(orderId: string): void {
  ;(async () => {
    try {
      const order = await prisma.order.findUnique({
        where:  { id: orderId },
        select: { id: true, orderCode: true, name: true, email: true, total: true, paymentMethod: true, paymentStatus: true },
      })
      if (!order?.email) return
      const settings = await getSiteSettings()
      const code     = order.orderCode ?? order.id.slice(0, 8).toUpperCase()
      const orderUrl = `${settings.storeUrl}/track-order/${encodeURIComponent(code)}`

      const { subject, html } = await renderEmail('customer-order-cancelled', {
        orderId:       order.id,
        orderCode:     order.orderCode,
        recipientName: order.name,
        total:         order.total,
        paymentMethod: order.paymentMethod === 'COD' ? 'Cash on Delivery'
                      : order.paymentMethod === 'ESEWA' ? 'eSewa'
                      : order.paymentMethod === 'KHALTI' ? 'Khalti'
                      : String(order.paymentMethod),
        refundPending: order.paymentStatus === 'REFUNDED',
        orderUrl,
        siteUrl:       settings.storeUrl,
        siteName:      settings.siteName,
        tagline:       settings.seo.description,
      })
      await sendEmailLogged('customer-order-cancelled', { to: order.email, subject, html, context: { orderId: order.id } })
    } catch (e) {
      console.warn('[notify-order-cancelled] failed (non-fatal):', e)
    }
  })()
}
