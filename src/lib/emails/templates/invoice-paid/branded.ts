import 'server-only'
import type { EmailVariant } from '../../registry'
import type { InvoicePaidData } from '../../types'
import { emailLayout, escapeHtml, escapeAttr, formatNpr } from '../../layout'

function render(data: InvoicePaidData): { subject: string; html: string } {
  const subject = `Payment received — invoice #${data.invoiceNumber}`

  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:#DCFCE7;border-radius:50%;font-size:32px;color:#16A34A;">✓</div>
      <h1 style="margin:16px 0 4px;font-size:24px;color:#0F172A;font-weight:800;">Payment received</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">
        Thanks ${escapeHtml(data.recipientName)} — we've received your payment for invoice
        <strong style="color:#0F172A;">#${escapeHtml(data.invoiceNumber)}</strong>.
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFBFF;border:1px solid #E2E8F0;border-radius:14px;margin-top:8px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;font-weight:700;">Amount paid</p>
        <p style="margin:0;font-size:28px;font-weight:800;color:#0F172A;">${formatNpr(data.amount)}</p>
        <p style="margin:8px 0 0;font-size:13px;color:#64748B;">
          via <strong style="color:#475569;">${escapeHtml(data.method)}</strong>
        </p>
        <p style="margin:6px 0 0;font-size:13px;color:#64748B;">${escapeHtml(data.description)}</p>
      </td></tr>
    </table>

    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(data.invoiceUrl)}" style="display:inline-block;padding:14px 28px;background:#16A34A;color:#FFFFFF;text-decoration:none;border-radius:14px;font-weight:700;font-size:14px;">
        Download invoice
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
      logoUrl:   data.logoUrl,
    }),
  }
}

export const invoicePaidBranded: EmailVariant<InvoicePaidData> = {
  id:          'branded',
  name:        'Branded',
  description: 'Green check badge, amount-paid card, payment method, download-invoice CTA.',
  accent:      '#16A34A',
  render,
}
