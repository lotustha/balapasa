import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'
import type { ShipmentEmailData } from '../../shipment-update'

const COPY = {
  SHIPPED:   { subjectVerb: 'shipped',   body: 'is on its way.',         action: 'Track shipment' },
  DELIVERED: { subjectVerb: 'delivered', body: 'has been delivered.',    action: 'Leave a review' },
  CANCELLED: { subjectVerb: 'cancelled', body: 'has been cancelled.',    action: '' },
} as const

function render(data: ShipmentEmailData): { subject: string; html: string } {
  const short  = data.orderId.slice(0, 8).toUpperCase()
  const copy   = COPY[data.status]
  const url    = data.trackingUrl ?? `${data.siteUrl}/track-order?id=${encodeURIComponent(data.orderId)}`
  const action = copy.action
    ? `<p style="margin:20px 0 0;font-size:14px;">
         <a href="${escapeAttr(url)}" style="color:#111827;text-decoration:underline;font-weight:600;">${copy.action} →</a>
       </p>`
    : ''
  const shipVia = data.shippingOption ? `<p style="margin:0;font-size:13px;color:#6B7280;">Via ${escapeHtml(data.shippingOption)}.</p>` : ''

  const body = `
    <p style="margin:0 0 4px;font-size:13px;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Update</p>
    <h1 style="margin:0 0 12px;font-size:22px;color:#111827;font-weight:700;letter-spacing:-0.01em;">Order #${short} ${escapeHtml(copy.subjectVerb)}</h1>
    <p style="margin:0 0 4px;font-size:14px;color:#374151;line-height:1.55;">
      ${escapeHtml(data.recipientName)}, your order ${escapeHtml(copy.body)}
    </p>
    ${shipVia}
    ${action}
  `

  return {
    subject: `Order #${short} ${copy.subjectVerb}`,
    html: emailLayout({
      preheader: `Order #${short} — ${copy.subjectVerb}`,
      title:     `Order #${short} ${copy.subjectVerb}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

export const shipmentUpdateMinimal: EmailVariant<ShipmentEmailData> = {
  id:          'minimal',
  name:        'Minimal',
  description: 'Plain status update. One headline, one sentence, one action link. No decorative blocks.',
  accent:      '#111827',
  render,
}
