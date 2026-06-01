import 'server-only'
import type { EmailVariant } from '../../registry'
import type { DeliveryDispatchedData } from '../../types'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'

function render(data: DeliveryDispatchedData): { subject: string; html: string } {
  const code = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()

  const body = `
    <p style="margin:0 0 4px;font-size:13px;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Dispatched</p>
    <h1 style="margin:0 0 12px;font-size:22px;color:#111827;font-weight:700;letter-spacing:-0.01em;">${escapeHtml(code)} is with ${escapeHtml(data.courierName)}</h1>
    <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.55;">
      ${escapeHtml(data.recipientName)}, your order has been picked up.${data.etaText ? ' Expected ' + escapeHtml(data.etaText) + '.' : ''}
    </p>
    ${data.trackingNumber ? `<p style="margin:0;font-size:13px;color:#6B7280;">Tracking: <span style="font-family:ui-monospace,Menlo,monospace;color:#111827;font-weight:600;">${escapeHtml(data.trackingNumber)}</span></p>` : ''}
    <p style="margin:20px 0 0;font-size:14px;">
      <a href="${escapeAttr(data.orderUrl)}" style="color:#111827;text-decoration:underline;font-weight:600;">Track on our site →</a>
    </p>
  `

  return {
    subject: `${escapeHtml(code)} dispatched with ${escapeHtml(data.courierName)}`,
    html: emailLayout({
      preheader: `${code} dispatched`,
      title:     `${code} dispatched`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
      logoUrl:   data.logoUrl,
    }),
  }
}

export const deliveryDispatchedMinimal: EmailVariant<DeliveryDispatchedData> = {
  id:          'minimal',
  name:        'Minimal',
  description: 'Plain dispatch note. One headline, the courier + ETA, single track link.',
  accent:      '#111827',
  render,
}
