import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'
import type { SignupWelcomeData } from '../../types'

function render(data: SignupWelcomeData): { subject: string; html: string } {
  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:linear-gradient(135deg,#A855F7,#EC4899);border-radius:50%;font-size:28px;color:#FFFFFF;">🎉</div>
      <h1 style="margin:16px 0 4px;font-size:26px;color:#0F172A;font-weight:800;">Welcome, ${escapeHtml(data.recipientName)}!</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">
        Your ${escapeHtml(data.siteName)} account is ready. Faster checkout, order tracking, and exclusive drops — all yours.
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:16px;">
      <tr><td style="padding:0 0 10px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFBFF;border-radius:14px;">
          <tr><td style="padding:18px 20px;">
            <p style="margin:0 0 4px;font-size:13px;color:#0F172A;font-weight:700;">🚀 1-click reorder</p>
            <p style="margin:0;font-size:12px;color:#64748B;line-height:1.5;">Past orders save your details — reorder in seconds.</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 0 10px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFBFF;border-radius:14px;">
          <tr><td style="padding:18px 20px;">
            <p style="margin:0 0 4px;font-size:13px;color:#0F172A;font-weight:700;">📦 Live tracking</p>
            <p style="margin:0;font-size:12px;color:#64748B;line-height:1.5;">Real-time status from confirmed → delivered.</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFBFF;border-radius:14px;">
          <tr><td style="padding:18px 20px;">
            <p style="margin:0 0 4px;font-size:13px;color:#0F172A;font-weight:700;">🎁 Member-only deals</p>
            <p style="margin:0;font-size:12px;color:#64748B;line-height:1.5;">Early access to drops, birthday rewards, free shipping days.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>

    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(data.accountUrl)}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#A855F7,#EC4899);color:#FFFFFF;text-decoration:none;border-radius:14px;font-weight:700;font-size:14px;">Go to my account →</a>
    </div>
  `
  return {
    subject: `Welcome to ${data.siteName} 🎉`,
    html: emailLayout({
      preheader: `Your ${data.siteName} account is ready — faster checkout, live tracking, member deals`,
      title:     `Welcome to ${data.siteName}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

export const signupWelcomeBranded: EmailVariant<SignupWelcomeData> = {
  id:          'branded',
  name:        'Branded',
  description: 'Confetti hero, gradient CTA, three benefit cards. The whole welcome-mat experience.',
  accent:      '#A855F7',
  render,
}
