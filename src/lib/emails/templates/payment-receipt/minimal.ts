import 'server-only'
import type { EmailVariant } from '../../registry'
import type { PaymentReceiptData } from '../../types'
import { emailLayout, escapeHtml, escapeAttr, formatNpr } from '../../layout'

function render(data: PaymentReceiptData): { subject: string; html: string } {
  const code = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()

  const body = `
    <p style="margin:0 0 4px;font-size:13px;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Receipt</p>
    <h1 style="margin:0 0 12px;font-size:22px;color:#111827;font-weight:700;letter-spacing:-0.01em;">${formatNpr(data.amount)} paid · #${escapeHtml(code)}</h1>
    <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.55;">
      Thanks ${escapeHtml(data.recipientName)}. Payment via ${escapeHtml(data.method)} confirmed.
    </p>
    ${data.transactionId ? `<p style="margin:0;font-size:12px;color:#9CA3AF;">Txn ID: <span style="font-family:ui-monospace,Menlo,monospace;color:#6B7280;">${escapeHtml(data.transactionId)}</span></p>` : ''}
    <p style="margin:20px 0 0;font-size:14px;">
      <a href="${escapeAttr(data.orderUrl)}" style="color:#111827;text-decoration:underline;font-weight:600;">Track this order →</a>
    </p>
  `

  return {
    subject: `${formatNpr(data.amount)} paid for ${code}`,
    html: emailLayout({
      preheader: `Payment received for ${code}`,
      title:     `Payment received — ${code}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
      logoUrl:   data.logoUrl,
    }),
  }
}

export const paymentReceiptMinimal: EmailVariant<PaymentReceiptData> = {
  id:          'minimal',
  name:        'Minimal',
  description: 'Single line summary with the amount and order code. No badges, no decorative blocks.',
  accent:      '#111827',
  render,
}
