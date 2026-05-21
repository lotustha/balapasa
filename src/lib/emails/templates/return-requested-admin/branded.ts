import 'server-only'
import type { EmailVariant } from '../../registry'
import type { ReturnRequestedAdminData } from '../../types'
import { emailLayout, escapeHtml, escapeAttr, formatNpr } from '../../layout'

function render(data: ReturnRequestedAdminData): { subject: string; html: string } {
  const code = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()
  const subject = `New return — ${code} (${formatNpr(data.refundAmount)})`

  const body = `
    <p style="margin:0 0 4px;font-size:13px;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">New return</p>
    <h1 style="margin:0 0 12px;font-size:22px;color:#111827;font-weight:700;">${escapeHtml(data.customerName)} — ${escapeHtml(code)}</h1>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFBFF;border:1px solid #E2E8F0;border-radius:14px;margin-top:8px;">
      <tr><td style="padding:14px 16px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;">Reason</p>
        <p style="margin:0;font-size:14px;color:#0F172A;">${escapeHtml(data.reason)}</p>
        <p style="margin:14px 0 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;">Refund amount</p>
        <p style="margin:2px 0 0;font-size:22px;font-weight:800;color:#0F172A;">${formatNpr(data.refundAmount)} <span style="font-size:13px;font-weight:500;color:#94A3B8;">across ${data.itemCount} item${data.itemCount !== 1 ? 's' : ''}</span></p>
      </td></tr>
    </table>
    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(data.adminUrl)}" style="display:inline-block;padding:12px 24px;background:#0F172A;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;">
        Review in admin
      </a>
    </div>
  `
  return { subject, html: emailLayout({ preheader: subject, title: subject, body, siteUrl: data.siteUrl, siteName: data.siteName, tagline: data.tagline }) }
}

export const returnRequestedAdminBranded: EmailVariant<ReturnRequestedAdminData> = {
  id: 'branded', name: 'Branded',
  description: 'Internal alert to admin when a customer files a new return request.',
  accent: '#0F172A', render,
}
