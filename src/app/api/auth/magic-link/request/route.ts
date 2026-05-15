import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createMagicToken, loginLinkUrl } from '@/lib/magic-link'
import { sendEmail } from '@/lib/email'
import { render as renderEmail } from '@/lib/emails/registry'
import { getSiteSettings } from '@/lib/site-settings'

// POST /api/auth/magic-link/request { email }
// Issues a 'login' magic token and emails it. Always returns success even when
// the email is unknown — leaking which addresses are registered is a privacy
// hole and a credential-discovery vector. The actual link only works if the
// recipient owns the inbox.
export async function POST(req: NextRequest) {
  let body: { email?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  // Fire-and-forget so timing differences between known/unknown addresses
  // don't leak signal either.
  ;(async () => {
    try {
      const profile = await prisma.profile.findUnique({ where: { email }, select: { email: true, name: true } })
      if (!profile) return

      const settings = await getSiteSettings()
      const token    = await createMagicToken({ email: profile.email, type: 'login' })
      const url      = loginLinkUrl(token, settings.storeUrl)

      const rendered = await renderEmail('magic-link', {
        recipientName:  profile.name ?? undefined,
        recipientEmail: profile.email,
        magicLinkUrl:   url,
        expiresInDays:  7,
        siteUrl:        settings.storeUrl,
        siteName:       settings.siteName,
        tagline:        settings.seo.description,
      })
      await sendEmail({ to: profile.email, subject: rendered.subject, html: rendered.html })
    } catch (e) {
      console.warn('[magic-link request] non-fatal failure:', e)
    }
  })()

  return NextResponse.json({ success: true })
}
