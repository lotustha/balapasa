import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'
import type { ShipmentEmailData } from '../../shipment-update'

const COPY = {
  SHIPPED:   { chip: 'SHIPPED',   chipBg: '#E0F2FE', chipFg: '#075985', subjectVerb: 'shipped',   line: "is on the way — we'll let you know when it arrives.", action: 'Track' },
  DELIVERED: { chip: 'DELIVERED', chipBg: '#DCFCE7', chipFg: '#15803D', subjectVerb: 'delivered', line: 'was delivered. Hope you love it!',                    action: 'Review' },
  CANCELLED: { chip: 'CANCELLED', chipBg: '#FFE4E6', chipFg: '#9F1239', subjectVerb: 'cancelled', line: 'has been cancelled.',                                  action: '' },
} as const

function render(data: ShipmentEmailData): { subject: string; html: string } {
  const short = data.orderId.slice(0, 8).toUpperCase()
  const copy  = COPY[data.status]
  const url   = data.trackingUrl ?? `${data.siteUrl}/track-order?id=${encodeURIComponent(data.orderId)}`
  const action = copy.action
    ? `<a href="${escapeAttr(url)}" style="margin-left:auto;display:inline-block;padding:8px 16px;background:#0F172A;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:700;font-size:12px;">${copy.action}</a>`
    : ''
  const shipVia = data.shippingOption ? `<span style="color:#94A3B8;"> · ${escapeHtml(data.shippingOption)}</span>` : ''

  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${copy.chipBg};border-radius:14px;">
      <tr><td style="padding:14px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="vertical-align:middle;">
              <span style="display:inline-block;padding:3px 8px;background:#FFFFFF;color:${copy.chipFg};border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.05em;">${copy.chip}</span>
              <span style="margin-left:8px;font-size:13px;color:${copy.chipFg};font-weight:700;">#${short}${shipVia}</span>
            </td>
            <td align="right" style="vertical-align:middle;">${action}</td>
          </tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:14px 0 0;font-size:14px;color:#0F172A;line-height:1.5;">
      <strong>${escapeHtml(data.recipientName)}</strong>, your order ${escapeHtml(copy.line)}
    </p>
  `

  return {
    subject: `#${short} ${copy.subjectVerb}`,
    html: emailLayout({
      preheader: `Order #${short} — ${copy.subjectVerb}`,
      title:     `#${short} ${copy.subjectVerb}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

export const shipmentUpdateCompact: EmailVariant<ShipmentEmailData> = {
  id:          'compact',
  name:        'Compact',
  description: 'Status chip + one-line copy + inline action button. Renders in a single table row on mobile.',
  accent:      '#0EA5E9',
  render,
}
