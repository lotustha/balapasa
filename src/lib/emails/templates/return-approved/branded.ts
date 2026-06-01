import 'server-only'
import type { EmailVariant } from '../../registry'
import type { ReturnApprovedData } from '../../types'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'

function render(data: ReturnApprovedData): { subject: string; html: string } {
  const code = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()
  const subject = `Return approved — ship items to us`

  const adminNoteHtml = data.adminNote
    ? `<p style="margin:18px 0 0;font-size:13px;color:#475569;line-height:1.5;"><strong>Note from us:</strong> ${escapeHtml(data.adminNote)}</p>`
    : ''

  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:#DCFCE7;border-radius:50%;font-size:30px;color:#16A34A;">✓</div>
      <h1 style="margin:16px 0 4px;font-size:22px;color:#0F172A;font-weight:800;">Return approved</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">
        ${escapeHtml(data.recipientName)}, we&rsquo;ve approved your return for <strong style="color:#0F172A;">${escapeHtml(code)}</strong>. Here&rsquo;s what to do next.
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFBFF;border:1px solid #E2E8F0;border-radius:14px;margin-top:8px;">
      <tr><td style="padding:14px 16px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;">Ship items back to</p>
        <p style="margin:0;font-size:15px;font-weight:700;color:#0F172A;line-height:1.5;">${escapeHtml(data.storeAddress)}</p>
        <p style="margin:10px 0 0;font-size:12px;color:#94A3B8;">Tape the items securely with the order code clearly written on the outside. We&rsquo;ll email you the refund as soon as the package arrives and passes inspection.</p>
      </td></tr>
    </table>

    ${adminNoteHtml}

    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(data.orderUrl)}" style="display:inline-block;padding:12px 24px;background:#16A34A;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;">
        View return details
      </a>
    </div>
  `
  return { subject, html: emailLayout({ preheader: subject, title: subject, body, siteUrl: data.siteUrl, siteName: data.siteName, tagline: data.tagline, logoUrl: data.logoUrl }) }
}

export const returnApprovedBranded: EmailVariant<ReturnApprovedData> = {
  id: 'branded', name: 'Branded',
  description: 'Customer email when admin approves a return — includes store return address.',
  accent: '#16A34A', render,
}
