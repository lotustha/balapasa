import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'
import type { SignupWelcomeData } from '../../types'

function render(data: SignupWelcomeData): { subject: string; html: string } {
  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(135deg,#FAFBFF,#EEF2FF);border-radius:14px;">
      <tr><td style="padding:18px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="vertical-align:middle;">
              <p style="margin:0 0 2px;font-size:11px;color:#6366F1;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">Welcome</p>
              <p style="margin:0;font-size:16px;color:#0F172A;font-weight:800;">${escapeHtml(data.recipientName)} 👋</p>
            </td>
            <td align="right" style="vertical-align:middle;">
              <a href="${escapeAttr(data.accountUrl)}" style="display:inline-block;padding:8px 16px;background:#6366F1;color:#FFFFFF;text-decoration:none;border-radius:10px;font-weight:700;font-size:12px;">My account</a>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:12px 0 0;font-size:13px;color:#0F172A;line-height:1.5;">
      Your <strong>${escapeHtml(data.siteName)}</strong> account is ready. ⚡ Faster checkout · 📦 Live tracking · 🎁 Member deals.
    </p>
  `
  return {
    subject: `Welcome to ${data.siteName} 👋`,
    html: emailLayout({
      preheader: `Hi ${data.recipientName} — your account is ready`,
      title:     `Welcome to ${data.siteName}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

export const signupWelcomeCompact: EmailVariant<SignupWelcomeData> = {
  id:          'compact',
  name:        'Compact',
  description: 'Single hero strip with name + CTA. Emoji-led one-liner below. Loads instantly.',
  accent:      '#6366F1',
  render,
}
