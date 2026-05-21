import 'server-only'
import type { EmailVariant } from '../../registry'
import type { ReturnFiledData } from '../../types'
import { emailLayout, escapeHtml, escapeAttr, formatNpr } from '../../layout'

function render(data: ReturnFiledData): { subject: string; html: string } {
  const code = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()
  const subject = `We got your return request for ${code}`

  const itemsHtml = data.items.map(i =>
    `<tr><td style="padding:6px 0;font-size:13px;color:#475569;">${escapeHtml(i.name)} <span style="color:#94A3B8;">× ${i.quantity}</span></td></tr>`
  ).join('')

  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:#DBEAFE;border-radius:50%;font-size:30px;color:#2563EB;">↩</div>
      <h1 style="margin:16px 0 4px;font-size:22px;color:#0F172A;font-weight:800;">Return request received</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">
        ${escapeHtml(data.recipientName)}, we&rsquo;ve logged your return for order <strong style="color:#0F172A;">${escapeHtml(code)}</strong>. We&rsquo;ll review it within a business day and email you next steps.
      </p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFBFF;border:1px solid #E2E8F0;border-radius:14px;margin-top:8px;">
      <tr><td style="padding:14px 16px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;">Items requested</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${itemsHtml}</table>
        <p style="margin:14px 0 0;font-size:12px;color:#94A3B8;">Estimated refund</p>
        <p style="margin:2px 0 0;font-size:20px;font-weight:800;color:#0F172A;">${formatNpr(data.refundAmount)}</p>
      </td></tr>
    </table>
    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(data.orderUrl)}" style="display:inline-block;padding:12px 24px;background:#16A34A;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;">
        Track this return
      </a>
    </div>
  `
  return { subject, html: emailLayout({ preheader: subject, title: subject, body, siteUrl: data.siteUrl, siteName: data.siteName, tagline: data.tagline }) }
}

export const returnFiledBranded: EmailVariant<ReturnFiledData> = {
  id: 'branded', name: 'Branded',
  description: 'Customer confirmation that the return request was received and is pending review.',
  accent: '#2563EB', render,
}
