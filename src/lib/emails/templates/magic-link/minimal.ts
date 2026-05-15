import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'
import type { MagicLinkData } from '../../types'

function render(data: MagicLinkData): { subject: string; html: string } {
  const greeting = data.recipientName ? escapeHtml(data.recipientName) : 'there'
  const body = `
    <p style="margin:0 0 4px;font-size:13px;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Sign in</p>
    <h1 style="margin:0 0 16px;font-size:22px;color:#111827;font-weight:700;letter-spacing:-0.01em;">One-time sign-in link</h1>

    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.55;">
      Hi ${greeting}, click the link below to sign in to ${escapeHtml(data.siteName)}.
    </p>

    <p style="margin:0;">
      <a href="${escapeAttr(data.magicLinkUrl)}" style="color:#111827;text-decoration:underline;font-weight:700;font-size:15px;">Sign in to ${escapeHtml(data.siteName)} →</a>
    </p>

    <p style="margin:24px 0 0;font-size:12px;color:#6B7280;line-height:1.55;">
      The link is valid for ${data.expiresInDays} day${data.expiresInDays === 1 ? '' : 's'}. If you didn't ask for this, ignore the email.
    </p>
  `
  return {
    subject: `Sign in to ${data.siteName}`,
    html: emailLayout({
      preheader: `One-time sign-in link (expires in ${data.expiresInDays}d)`,
      title:     `Sign in to ${data.siteName}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

export const magicLinkMinimal: EmailVariant<MagicLinkData> = {
  id:          'minimal',
  name:        'Minimal',
  description: 'Text-only sign-in link. No buttons, no gradients — feels like a personal note from the team.',
  accent:      '#111827',
  render,
}
