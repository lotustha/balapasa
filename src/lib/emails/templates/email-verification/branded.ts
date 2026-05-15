import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'
import type { EmailVerificationData } from '../../types'

function render(data: EmailVerificationData): { subject: string; html: string } {
  const greeting = data.recipientName ? escapeHtml(data.recipientName) : 'there'
  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:linear-gradient(135deg,#0EA5E9,#6366F1);border-radius:50%;font-size:28px;color:#FFFFFF;">✉️</div>
      <h1 style="margin:16px 0 4px;font-size:24px;color:#0F172A;font-weight:800;">Confirm your email</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">
        Hi ${greeting}, tap below to confirm <strong style="color:#0F172A;">${escapeHtml(data.recipientEmail)}</strong> is yours so we can keep your account secure.
      </p>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(data.verifyUrl)}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#0EA5E9,#6366F1);color:#FFFFFF;text-decoration:none;border-radius:14px;font-weight:800;font-size:15px;">Confirm email →</a>
    </div>

    <p style="margin:18px 0 0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.5;">
      This link expires in ${data.expiresInHours} hour${data.expiresInHours === 1 ? '' : 's'}. If you didn't sign up, please ignore — your address won't be added.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;background:#F8FAFC;border-radius:12px;">
      <tr><td style="padding:14px 18px;font-size:11px;color:#64748B;line-height:1.5;word-break:break-all;">
        <strong style="color:#475569;display:block;margin-bottom:4px;">Or copy and paste this link:</strong>
        ${escapeHtml(data.verifyUrl)}
      </td></tr>
    </table>
  `
  return {
    subject: `Confirm your email for ${data.siteName}`,
    html: emailLayout({
      preheader: `Confirm ${data.recipientEmail} (expires in ${data.expiresInHours}h)`,
      title:     `Confirm your email`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

export const emailVerificationBranded: EmailVariant<EmailVerificationData> = {
  id:          'branded',
  name:        'Branded',
  description: 'Envelope hero, gradient confirm button, fallback raw link. The full trust-and-safety treatment.',
  accent:      '#0EA5E9',
  render,
}
