import 'server-only'
import type { EmailVariant } from '../../registry'
import type { DeliveryExceptionData, DeliveryExceptionKind } from '../../types'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'

const HEADLINE: Record<DeliveryExceptionKind, string> = {
  PICKUP_FAILED:           'Pickup delayed',
  DELIVERY_ATTEMPT_FAILED: 'Delivery attempt failed',
  REDELIVERY:              'Redelivery scheduled',
  REATTEMPTS_FAILED:       'Delivery failed',
  CANCELLED:               'Order cancelled',
}

function render(data: DeliveryExceptionData): { subject: string; html: string } {
  const code = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()
  const head = HEADLINE[data.kind]

  const body = `
    <p style="margin:0 0 4px;font-size:13px;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Update</p>
    <h1 style="margin:0 0 12px;font-size:22px;color:#111827;font-weight:700;letter-spacing:-0.01em;">${escapeHtml(head)} — ${escapeHtml(code)}</h1>
    <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.55;">${escapeHtml(data.recipientName)}, the courier reported a problem with your delivery.</p>
    ${data.comment ? `<p style="margin:0 0 8px;font-size:13px;color:#6B7280;line-height:1.5;"><em>"${escapeHtml(data.comment)}"</em></p>` : ''}
    <p style="margin:20px 0 0;font-size:14px;">
      <a href="${escapeAttr(data.orderUrl)}" style="color:#111827;text-decoration:underline;font-weight:600;">Open order details →</a>
    </p>
  `

  return {
    subject: `${escapeHtml(code)} — ${head}`,
    html: emailLayout({
      preheader: `${code} — ${head}`,
      title:     `${code} — ${head}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

export const deliveryExceptionMinimal: EmailVariant<DeliveryExceptionData> = {
  id:          'minimal',
  name:        'Minimal',
  description: 'Plain text: headline, courier quote, one action link.',
  accent:      '#111827',
  render,
}
