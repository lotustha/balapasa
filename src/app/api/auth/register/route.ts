import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, AUTH_COOKIE, cookieOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { sendEmail } from '@/lib/email'
import { render as renderEmail } from '@/lib/emails/registry'
import { createVerifyEmailToken, verifyEmailUrl } from '@/lib/magic-link'
import { getSiteSettings } from '@/lib/site-settings'

export async function POST(req: NextRequest) {
  const { email, password, name, phone } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

  const existing = await prisma.profile.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

  const hash = await bcrypt.hash(password, 12)
  const profile = await prisma.profile.create({
    data: { email, password: hash, name, phone, role: 'CUSTOMER' },
  })

  const token = await signToken({ sub: profile.id, email: profile.email, role: profile.role, name: profile.name ?? undefined })
  const res = NextResponse.json({ success: true })
  res.cookies.set(AUTH_COOKIE, token, cookieOptions(token))

  // Fire-and-forget: signup-welcome + email-verification. Both are non-fatal —
  // a failed send must not block account creation.
  ;(async () => {
    try {
      const settings   = await getSiteSettings()
      const accountUrl = `${settings.storeUrl}/account`

      const welcome = await renderEmail('signup-welcome', {
        recipientName:  profile.name ?? 'there',
        recipientEmail: profile.email,
        accountUrl,
        siteUrl:        settings.storeUrl,
        siteName:       settings.siteName,
        tagline:        settings.seo.description,
      })
      await sendEmail({ to: profile.email, subject: welcome.subject, html: welcome.html })

      const verifyToken = await createVerifyEmailToken(profile.email)
      const verUrl      = verifyEmailUrl(verifyToken, settings.storeUrl)
      const ver = await renderEmail('email-verification', {
        recipientName:  profile.name ?? undefined,
        recipientEmail: profile.email,
        verifyUrl:      verUrl,
        expiresInHours: 24,
        siteUrl:        settings.storeUrl,
        siteName:       settings.siteName,
        tagline:        settings.seo.description,
      })
      await sendEmail({ to: profile.email, subject: ver.subject, html: ver.html })
    } catch (e) {
      console.warn('[register] post-signup emails failed (non-fatal):', e)
    }
  })()

  return res
}
