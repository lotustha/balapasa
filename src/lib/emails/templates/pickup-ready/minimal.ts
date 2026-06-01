import 'server-only'
import type { EmailVariant } from '../../registry'
import type { PickupReadyData } from '../../types'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'

function render(data: PickupReadyData): { subject: string; html: string } {
  const code = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()

  const body = `
    <p style="margin:0 0 4px;font-size:13px;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Pickup</p>
    <h1 style="margin:0 0 12px;font-size:22px;color:#111827;font-weight:700;letter-spacing:-0.01em;">${escapeHtml(code)} ready for pickup</h1>
    <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.55;">
      ${escapeHtml(data.recipientName)}, your order is packed and waiting at <strong>${escapeHtml(data.storeAddress)}</strong>.
    </p>
    ${data.storeHours ? `<p style="margin:0;font-size:13px;color:#6B7280;">Hours: ${escapeHtml(data.storeHours)}</p>` : ''}
    ${data.pickupWindow ? `<p style="margin:0;font-size:13px;color:#6B7280;">Best pickup: ${escapeHtml(data.pickupWindow)}</p>` : ''}
    <p style="margin:20px 0 0;font-size:14px;">
      <a href="${escapeAttr(data.orderUrl)}" style="color:#111827;text-decoration:underline;font-weight:600;">Open order →</a>
    </p>
  `

  return {
    subject: `${escapeHtml(code)} ready for pickup`,
    html: emailLayout({
      preheader: `${code} ready for pickup`,
      title:     `${code} ready for pickup`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
      logoUrl:   data.logoUrl,
    }),
  }
}

export const pickupReadyMinimal: EmailVariant<PickupReadyData> = {
  id:          'minimal',
  name:        'Minimal',
  description: 'Plain ready-for-pickup note. Address inline, no decorative blocks.',
  accent:      '#111827',
  render,
}
