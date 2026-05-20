import 'server-only'
import type { EmailVariant } from '../../registry'
import type { DeliveryDispatchedData } from '../../types'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'

function render(data: DeliveryDispatchedData): { subject: string; html: string } {
  const code = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()

  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#DBEAFE;border-radius:14px;">
      <tr><td style="padding:14px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="vertical-align:middle;">
              <span style="display:inline-block;padding:3px 8px;background:#FFFFFF;color:#1D4ED8;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.05em;">DISPATCHED</span>
              <span style="margin-left:8px;font-size:13px;color:#1E40AF;font-weight:700;">#${escapeHtml(code)} · ${escapeHtml(data.courierName)}</span>
            </td>
            <td align="right" style="vertical-align:middle;">
              <a href="${escapeAttr(data.orderUrl)}" style="display:inline-block;padding:8px 16px;background:#0F172A;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:700;font-size:12px;">Track</a>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:14px 0 0;font-size:14px;color:#0F172A;line-height:1.5;">
      <strong>${escapeHtml(data.recipientName)}</strong>, your order is on the move.${data.etaText ? ' Expected ' + escapeHtml(data.etaText) + '.' : ''}${data.trackingNumber ? ' Tracking <span style="font-family:ui-monospace,Menlo,monospace;color:#475569;">' + escapeHtml(data.trackingNumber) + '</span>.' : ''}
    </p>
  `

  return {
    subject: `#${code} dispatched`,
    html: emailLayout({
      preheader: `#${code} dispatched`,
      title:     `#${code} dispatched`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

export const deliveryDispatchedCompact: EmailVariant<DeliveryDispatchedData> = {
  id:          'compact',
  name:        'Compact',
  description: 'Status chip + courier + inline track button. Single row on mobile.',
  accent:      '#2563EB',
  render,
}
