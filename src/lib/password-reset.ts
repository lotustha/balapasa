import { createHash } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { emailLayout, escapeAttr, escapeHtml } from '@/lib/emails/layout'

// Password reset links. A link is a signed token valid for one hour, and it also carries a
// fingerprint of the password it was issued against, so it stops working the moment the password
// changes: a link can be used once, and an older link dies when a newer one is used.

export const RESET_EXPIRY_MINUTES = 60

function secret() {
  const value = process.env.MAGIC_LINK_SECRET ?? process.env.JWT_SECRET
  if (!value) {
    if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET is not set')
    return new TextEncoder().encode('change-me-in-production-32chars!!')
  }
  return new TextEncoder().encode(value)
}

export const passwordFingerprint = (hash: string | null) =>
  createHash('sha256').update(hash ?? 'no-password').digest('hex').slice(0, 16)

export function createResetToken(email: string, currentHash: string | null): Promise<string> {
  return new SignJWT({ email, type: 'password-reset', fp: passwordFingerprint(currentHash) })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${RESET_EXPIRY_MINUTES}m`)
    .setIssuedAt()
    .sign(secret())
}

export async function verifyResetToken(token: string): Promise<{ email: string; fp: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    if (payload.type !== 'password-reset' || typeof payload.email !== 'string' || typeof payload.fp !== 'string') return null
    return { email: payload.email, fp: payload.fp }
  } catch {
    return null
  }
}

export function resetEmail(d: { url: string; name?: string | null; siteName: string; siteUrl: string; tagline?: string }) {
  const greeting = d.name ? escapeHtml(d.name) : 'there'
  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <h1 style="margin:16px 0 4px;font-size:24px;color:#0F172A;font-weight:800;">Reset your password</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">Hi ${greeting}, tap the button below to choose a new password for your ${escapeHtml(d.siteName)} account.</p>
    </div>
    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(d.url)}" style="display:inline-block;padding:14px 32px;background:#16A34A;color:#FFFFFF;text-decoration:none;border-radius:14px;font-weight:800;font-size:15px;">Choose a new password</a>
    </div>
    <p style="margin:18px 0 0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.5;">
      The link works once and expires in ${RESET_EXPIRY_MINUTES} minutes. If you did not ask for it, ignore this email: your password stays the same.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;background:#F8FAFC;border-radius:12px;">
      <tr><td style="padding:14px 18px;font-size:11px;color:#64748B;line-height:1.5;word-break:break-all;">
        <strong style="color:#475569;display:block;margin-bottom:4px;">Or copy and paste this link:</strong>
        ${escapeHtml(d.url)}
      </td></tr>
    </table>`
  return {
    subject: `Reset your ${d.siteName} password`,
    html: emailLayout({
      preheader: `Choose a new password for ${d.siteName} (link expires in ${RESET_EXPIRY_MINUTES} minutes)`,
      title: 'Reset your password', body, siteUrl: d.siteUrl, siteName: d.siteName, tagline: d.tagline,
    }),
  }
}
