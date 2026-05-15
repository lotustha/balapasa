import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'
import type { EmailVerificationData } from '../../types'

function render(data: EmailVerificationData): { subject: string; html: string } {
  const greeting = data.recipientName ? escapeHtml(data.recipientName) : 'there'
  const body = `
    <p style="margin:0 0 4px;font-size:13px;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Verify email</p>
    <h1 style="margin:0 0 16px;font-size:22px;color:#111827;font-weight:700;letter-spacing:-0.01em;">Confirm ${escapeHtml(data.recipientEmail)}</h1>

    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.55;">
      Hi ${greeting}, click the link below to confirm this address belongs to you.
    </p>

    <p style="margin:0;">
      <a href="${escapeAttr(data.verifyUrl)}" style="color:#111827;text-decoration:underline;font-weight:700;font-size:15px;">Confirm my email →</a>
    </p>

    <p style="margin:24px 0 0;font-size:12px;color:#6B7280;line-height:1.55;">
      The link is valid for ${data.expiresInHours} hour${data.expiresInHours === 1 ? '' : 's'}. If you didn't sign up, ignore this email.
    </p>
  `
  return {
    subject: `Confirm your email for ${data.siteName}`,
    html: emailLayout({
      preheader: `Confirm ${data.recipientEmail}`,
      title:     `Confirm your email`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

export const emailVerificationMinimal: EmailVariant<EmailVerificationData> = {
  id:          'minimal',
  name:        'Minimal',
  description: 'Text-only confirm link. No graphics, no fallback block — just a sentence and a link.',
  accent:      '#111827',
  render,
}
