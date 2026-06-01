import 'server-only'
import type { EmailVariant } from '../../registry'
import type { PaymentReceiptData } from '../../types'
import { emailLayout, escapeHtml, escapeAttr, formatNpr } from '../../layout'

function render(data: PaymentReceiptData): { subject: string; html: string } {
  const code = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()

  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#DCFCE7;border-radius:14px;">
      <tr><td style="padding:14px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="vertical-align:middle;">
              <span style="display:inline-block;padding:3px 8px;background:#FFFFFF;color:#15803D;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.05em;">PAID</span>
              <span style="margin-left:8px;font-size:13px;color:#15803D;font-weight:700;">${formatNpr(data.amount)} · #${escapeHtml(code)}</span>
            </td>
            <td align="right" style="vertical-align:middle;">
              <a href="${escapeAttr(data.orderUrl)}" style="display:inline-block;padding:8px 16px;background:#0F172A;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:700;font-size:12px;">Track</a>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:14px 0 0;font-size:14px;color:#0F172A;line-height:1.5;">
      <strong>${escapeHtml(data.recipientName)}</strong>, your ${escapeHtml(data.method)} payment is confirmed.${data.transactionId ? ` Txn <span style="font-family:ui-monospace,Menlo,monospace;color:#475569;">${escapeHtml(data.transactionId)}</span>.` : ''}
    </p>
  `

  return {
    subject: `#${code} ${formatNpr(data.amount)} paid`,
    html: emailLayout({
      preheader: `#${code} ${formatNpr(data.amount)} paid`,
      title:     `#${code} paid`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
      logoUrl:   data.logoUrl,
    }),
  }
}

export const paymentReceiptCompact: EmailVariant<PaymentReceiptData> = {
  id:          'compact',
  name:        'Compact',
  description: 'Status chip + amount + track button in a single row. Designed for the mobile inbox preview.',
  accent:      '#16A34A',
  render,
}
