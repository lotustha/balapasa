import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'
import type { SignupWelcomeData } from '../../types'

function render(data: SignupWelcomeData): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 4px;font-size:13px;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Welcome</p>
    <h1 style="margin:0 0 16px;font-size:24px;color:#111827;font-weight:700;letter-spacing:-0.01em;">Hi ${escapeHtml(data.recipientName)},</h1>

    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      Your ${escapeHtml(data.siteName)} account is set up. You can now track orders, save addresses, and reorder past purchases in a single click.
    </p>

    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
      If anything looks off, reply to this email — a real person reads them.
    </p>

    <p style="margin:0;">
      <a href="${escapeAttr(data.accountUrl)}" style="color:#111827;text-decoration:underline;font-weight:700;font-size:15px;">Visit my account →</a>
    </p>

    <p style="margin:32px 0 0;font-size:13px;color:#6B7280;line-height:1.6;">— The ${escapeHtml(data.siteName)} team</p>
  `
  return {
    subject: `Welcome to ${data.siteName}`,
    html: emailLayout({
      preheader: `Your ${data.siteName} account is ready.`,
      title:     `Welcome to ${data.siteName}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

export const signupWelcomeMinimal: EmailVariant<SignupWelcomeData> = {
  id:          'minimal',
  name:        'Minimal',
  description: 'Reads like a hand-written note. No buttons, no graphics — just a warm hello and a link.',
  accent:      '#111827',
  render,
}
