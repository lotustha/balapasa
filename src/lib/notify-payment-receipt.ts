import 'server-only'
import { prisma } from '@/lib/prisma'
import { render as renderEmail } from '@/lib/emails/registry'
import { sendEmailLogged } from '@/lib/email'
import { getSiteSettings } from '@/lib/site-settings'

/**
 * Fire-and-forget receipt email when paymentStatus flips to PAID. Used by:
 *  - /api/payment/verify (eSewa + Khalti)
 *  - /api/admin/orders/[id] PATCH when paymentStatus → PAID (COD-on-delivery)
 *  - PnD webhook handler when a COD order reaches `delivered`
 *
 * Safe to call repeatedly — no-op when the order has no email recipient.
 */
export function notifyPaymentReceipt(args: {
  orderId:        string
  method:         'COD' | 'ESEWA' | 'KHALTI' | 'PARTIAL_COD' | (string & {})
  transactionId?: string | null
}): void {
  ;(async () => {
    try {
      const order = await prisma.order.findUnique({
        where: { id: args.orderId },
        select: {
          id: true, orderCode: true, name: true, email: true,
          total: true, codAmount: true,
          items: { select: { name: true }, take: 1 },
          _count: { select: { items: true } },
        },
      })
      if (!order?.email) return

      const settings = await getSiteSettings()
      const itemSummary = order.items[0]
        ? `${order.items[0].name}${order._count.items > 1 ? ` + ${order._count.items - 1} more` : ''}`
        : 'your order'
      const code     = order.orderCode ?? order.id.slice(0, 8).toUpperCase()
      const orderUrl = `${settings.storeUrl}/track-order/${encodeURIComponent(code)}`
      const amount   = args.method === 'COD' ? (order.codAmount ?? order.total) : order.total

      const methodLabel =
        args.method === 'ESEWA'  ? 'eSewa' :
        args.method === 'KHALTI' ? 'Khalti' :
        args.method === 'COD'    ? 'Cash on Delivery' :
        args.method === 'PARTIAL_COD' ? 'Partial COD' : String(args.method)

      const { subject, html } = await renderEmail('payment-receipt', {
        orderId:       order.id,
        orderCode:     order.orderCode,
        recipientName: order.name,
        amount,
        method:        methodLabel,
        transactionId: args.transactionId ?? null,
        itemsSummary:  itemSummary,
        orderUrl,
        siteUrl:       settings.storeUrl,
        siteName:      settings.siteName,
        tagline:       settings.seo.description,
      })
      await sendEmailLogged('payment-receipt', { to: order.email, subject, html, context: { orderId: order.id, method: args.method } })
    } catch (e) {
      console.warn('[notify-payment-receipt] failed (non-fatal):', e)
    }
  })()
}
