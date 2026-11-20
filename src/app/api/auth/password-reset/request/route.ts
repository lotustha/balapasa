import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmailLogged } from '@/lib/email'
import { getSiteSettings } from '@/lib/site-settings'
import { blockedFor, clientIp, recordAttempt, tooManyAttempts } from '@/lib/rate-limit'
import { createResetToken, resetEmail } from '@/lib/password-reset'

const WINDOW_MS = 15 * 60 * 1000
const PER_WINDOW = 3

// POST /api/auth/password-reset/request { email }
// Emails a link to choose a new password. Always answers success, known address or not, so the
// endpoint cannot be used to find out who has an account.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { email?: unknown }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: 'Enter a valid email address' }, { status: 400 })
  }

  const key = `pwreset:${email}:${clientIp(req)}`
  const wait = blockedFor(key, PER_WINDOW)
  if (wait > 0) return tooManyAttempts(wait)
  recordAttempt(key, WINDOW_MS)

  // Not awaited: the answer must take the same time whether or not the address has an account.
  ;(async () => {
    try {
      const profile = await prisma.profile.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { email: true, name: true, password: true },
      })
      if (!profile) return
      const settings = await getSiteSettings()
      const token = await createResetToken(profile.email, profile.password)
      const url = `${settings.storeUrl}/reset-password?token=${encodeURIComponent(token)}`
      const { subject, html } = resetEmail({
        url, name: profile.name, siteName: settings.siteName, siteUrl: settings.storeUrl, tagline: settings.seo.description,
      })
      await sendEmailLogged('password-reset', { to: profile.email, subject, html, context: { email: profile.email } })
    } catch (e) {
      console.warn('[password-reset request] non-fatal failure:', e)
    }
  })()

  return Response.json({ success: true })
}
