import 'server-only'
import type { EmailVariant } from '../../registry'
import type { PaymentReceiptData } from '../../types'
import { emailLayout, escapeHtml, escapeAttr, formatNpr } from '../../layout'

function render(data: PaymentReceiptData): { subject: string; html: string } {
  const code  = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()
  const txn   = data.transactionId ? `<p style="margin:6px 0 0;font-size:12px;color:#94A3B8;">Txn ID: <span style="color:#475569;font-family:ui-monospace,Menlo,monospace;">${escapeHtml(data.transactionId)}</span></p>` : ''
  const subject = `Payment received — Rs. ${Math.round(data.amount).toLocaleString('en-IN')} for ${code}`

  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:#DCFCE7;border-radius:50%;font-size:32px;color:#16A34A;">✓</div>
      <h1 style="margin:16px 0 4px;font-size:24px;color:#0F172A;font-weight:800;">Payment received</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">
        Thanks ${escapeHtml(data.recipientName)} — we got your payment for order
        <strong style="color:#0F172A;">${escapeHtml(code)}</strong>.
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFBFF;border:1px solid #E2E8F0;border-radius:14px;margin-top:8px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;font-weight:700;">Amount paid</p>
        <p style="margin:0;font-size:28px;font-weight:800;color:#0F172A;">${formatNpr(data.amount)}</p>
        <p style="margin:8px 0 0;font-size:13px;color:#64748B;">
          via <strong style="color:#475569;">${escapeHtml(data.method)}</strong>
        </p>
        ${txn}
      </td></tr>
    </table>

    <p style="margin:18px 0 0;font-size:13px;color:#475569;">
      <strong>What's next:</strong> ${escapeHtml(data.itemsSummary)} — we're getting your order ready. You'll get another email when it's on its way.
    </p>

    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(data.orderUrl)}" style="display:inline-block;padding:14px 28px;background:#16A34A;color:#FFFFFF;text-decoration:none;border-radius:14px;font-weight:700;font-size:14px;">
        Track this order
      </a>
    </div>
  `

  return {
    subject,
    html: emailLayout({
      preheader: subject,
      title:     subject,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

export const paymentReceiptBranded: EmailVariant<PaymentReceiptData> = {
  id:          'branded',
  name:        'Branded',
  description: 'Green check badge, amount-paid card, txn id, next-step copy, track CTA.',
  accent:      '#16A34A',
  render,
}
