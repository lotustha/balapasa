import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'
import type { EmailVerificationData } from '../../types'

function render(data: EmailVerificationData): { subject: string; html: string } {
  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F0F9FF;border-radius:14px;">
      <tr><td style="padding:14px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="vertical-align:middle;">
              <p style="margin:0 0 2px;font-size:11px;color:#0369A1;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">Verify email</p>
              <p style="margin:0;font-size:13px;color:#0F172A;font-weight:700;word-break:break-all;">${escapeHtml(data.recipientEmail)}</p>
            </td>
            <td align="right" style="vertical-align:middle;">
              <a href="${escapeAttr(data.verifyUrl)}" style="display:inline-block;padding:8px 16px;background:#0369A1;color:#FFFFFF;text-decoration:none;border-radius:10px;font-weight:700;font-size:12px;">Confirm →</a>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:10px 0 0;font-size:11px;color:#94A3B8;line-height:1.5;text-align:center;">
      Link expires in ${data.expiresInHours}h. Didn't sign up? Safe to ignore.
    </p>
  `
  return {
    subject: `Confirm ${data.recipientEmail}`,
    html: emailLayout({
      preheader: `Confirm your email · expires ${data.expiresInHours}h`,
      title:     `Confirm your email`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

export const emailVerificationCompact: EmailVariant<EmailVerificationData> = {
  id:          'compact',
  name:        'Compact',
  description: 'Email + inline confirm button on a sky-blue strip. Minimal cognitive load.',
  accent:      '#0369A1',
  render,
}
