import 'server-only'
import type { EmailVariant } from '../../registry'
import type { ReturnRejectedData } from '../../types'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'

function render(data: ReturnRejectedData): { subject: string; html: string } {
  const code = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()
  const subject = `About your return for ${code}`

  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:#FEE2E2;border-radius:50%;font-size:30px;color:#DC2626;">✕</div>
      <h1 style="margin:16px 0 4px;font-size:22px;color:#0F172A;font-weight:800;">We couldn&rsquo;t approve this return</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">
        ${escapeHtml(data.recipientName)}, after reviewing your request for order <strong style="color:#0F172A;">${escapeHtml(code)}</strong>, we&rsquo;re unable to accept it.
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:14px;margin-top:8px;">
      <tr><td style="padding:14px 16px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#991B1B;">Reason</p>
        <p style="margin:0;font-size:14px;color:#7F1D1D;line-height:1.5;">${escapeHtml(data.reason)}</p>
      </td></tr>
    </table>

    <p style="margin:18px 0 0;font-size:13px;color:#475569;line-height:1.55;">
      If you think this is a mistake, reply to this email — we&rsquo;ll take another look.
    </p>

    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(data.orderUrl)}" style="display:inline-block;padding:12px 24px;background:#0F172A;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;">
        View order
      </a>
    </div>
  `
  return { subject, html: emailLayout({ preheader: subject, title: subject, body, siteUrl: data.siteUrl, siteName: data.siteName, tagline: data.tagline, logoUrl: data.logoUrl }) }
}

export const returnRejectedBranded: EmailVariant<ReturnRejectedData> = {
  id: 'branded', name: 'Branded',
  description: 'Customer email when admin rejects a return request, with the stated reason.',
  accent: '#DC2626', render,
}
