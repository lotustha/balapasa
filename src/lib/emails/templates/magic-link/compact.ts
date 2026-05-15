import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'
import type { MagicLinkData } from '../../types'

function render(data: MagicLinkData): { subject: string; html: string } {
  const greeting = data.recipientName ? escapeHtml(data.recipientName) : 'there'
  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border-radius:14px;">
      <tr><td style="padding:16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="vertical-align:middle;">
              <p style="margin:0 0 2px;font-size:11px;color:#64748B;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;">Sign in</p>
              <p style="margin:0;font-size:14px;color:#0F172A;font-weight:700;">Hi ${greeting}</p>
            </td>
            <td align="right" style="vertical-align:middle;">
              <a href="${escapeAttr(data.magicLinkUrl)}" style="display:inline-block;padding:8px 16px;background:#0F172A;color:#FFFFFF;text-decoration:none;border-radius:10px;font-weight:700;font-size:12px;">Sign in →</a>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:10px 0 0;font-size:11px;color:#94A3B8;line-height:1.5;text-align:center;">
      Link expires in ${data.expiresInDays}d. Didn't ask for this? Safe to ignore.
    </p>
  `
  return {
    subject: `Sign in to ${data.siteName}`,
    html: emailLayout({
      preheader: `Sign-in link · expires ${data.expiresInDays}d`,
      title:     `Sign in to ${data.siteName}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

export const magicLinkCompact: EmailVariant<MagicLinkData> = {
  id:          'compact',
  name:        'Compact',
  description: 'Single-row card with inline sign-in button. Smallest possible footprint.',
  accent:      '#0F172A',
  render,
}
