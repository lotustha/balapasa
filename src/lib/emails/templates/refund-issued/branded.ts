import 'server-only'
import type { EmailVariant } from '../../registry'
import type { RefundIssuedData } from '../../types'
import { emailLayout, escapeHtml, escapeAttr, formatNpr } from '../../layout'

function render(data: RefundIssuedData): { subject: string; html: string } {
  const code = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()
  const subject = `Refund issued — ${formatNpr(data.refundAmount)} for ${code}`

  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:#DCFCE7;border-radius:50%;font-size:32px;color:#16A34A;">✓</div>
      <h1 style="margin:16px 0 4px;font-size:24px;color:#0F172A;font-weight:800;">Your refund is on its way</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">
        ${escapeHtml(data.recipientName)}, we&rsquo;ve issued a refund for your return on order <strong style="color:#0F172A;">${escapeHtml(code)}</strong>.
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFBFF;border:1px solid #E2E8F0;border-radius:14px;margin-top:8px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;">Refund amount</p>
        <p style="margin:0;font-size:28px;font-weight:800;color:#0F172A;">${formatNpr(data.refundAmount)}</p>
        <p style="margin:10px 0 0;font-size:13px;color:#475569;line-height:1.5;">${escapeHtml(data.method)}</p>
      </td></tr>
    </table>

    <p style="margin:18px 0 0;font-size:12px;color:#94A3B8;line-height:1.55;">
      Wallet refunds typically reflect in your account within 1–3 business days. If the money isn&rsquo;t showing up by then, reply to this email and we&rsquo;ll look into it.
    </p>

    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(data.orderUrl)}" style="display:inline-block;padding:12px 24px;background:#16A34A;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;">
        View order
      </a>
    </div>
  `
  return { subject, html: emailLayout({ preheader: subject, title: subject, body, siteUrl: data.siteUrl, siteName: data.siteName, tagline: data.tagline }) }
}

export const refundIssuedBranded: EmailVariant<RefundIssuedData> = {
  id: 'branded', name: 'Branded',
  description: 'Customer email when admin marks a return REFUNDED — confirms amount + method.',
  accent: '#16A34A', render,
}
