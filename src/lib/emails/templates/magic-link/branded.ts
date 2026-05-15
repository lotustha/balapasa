import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'
import type { MagicLinkData } from '../../types'

function render(data: MagicLinkData): { subject: string; html: string } {
  const greeting = data.recipientName ? escapeHtml(data.recipientName) : 'there'
  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:linear-gradient(135deg,#16A34A,#0EA5E9);border-radius:50%;font-size:28px;color:#FFFFFF;">🔑</div>
      <h1 style="margin:16px 0 4px;font-size:24px;color:#0F172A;font-weight:800;">Sign in to ${escapeHtml(data.siteName)}</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">Hi ${greeting}, tap the button below to finish signing in. No password needed.</p>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(data.magicLinkUrl)}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#16A34A,#0EA5E9);color:#FFFFFF;text-decoration:none;border-radius:14px;font-weight:800;font-size:15px;">Sign in →</a>
    </div>

    <p style="margin:18px 0 0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.5;">
      Link expires in ${data.expiresInDays} day${data.expiresInDays === 1 ? '' : 's'}. If you didn't request this, you can safely ignore the email.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;background:#F8FAFC;border-radius:12px;">
      <tr><td style="padding:14px 18px;font-size:11px;color:#64748B;line-height:1.5;word-break:break-all;">
        <strong style="color:#475569;display:block;margin-bottom:4px;">Or copy and paste this link:</strong>
        ${escapeHtml(data.magicLinkUrl)}
      </td></tr>
    </table>
  `
  return {
    subject: `Sign in to ${data.siteName}`,
    html: emailLayout({
      preheader: `Your sign-in link for ${data.siteName} (expires in ${data.expiresInDays}d)`,
      title:     `Sign in to ${data.siteName}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

export const magicLinkBranded: EmailVariant<MagicLinkData> = {
  id:          'branded',
  name:        'Branded',
  description: 'Gradient key emoji, bold CTA, fallback copy-paste link block. Matches the rest of the brand palette.',
  accent:      '#16A34A',
  render,
}
