import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, AUTH_COOKIE, cookieOptions } from '@/lib/auth'
import { verifyMagicToken } from '@/lib/magic-link'
import { getSiteSettings } from '@/lib/site-settings'

// GET /api/auth/magic-link/verify?token=...
// Consumes a 'login' magic token, sets the auth cookie, and redirects to
// /account. Wrong/expired tokens redirect to /login with an error flag instead
// of 401-ing so the user lands on a recoverable page.
//
// Redirects are built against the configured public store URL, NOT req.url:
// behind the VPS reverse proxy req.url's host is the internal localhost:3000,
// which would send the browser to localhost.
export async function GET(req: NextRequest) {
  const origin = (await getSiteSettings()).storeUrl
  const token = new URL(req.url).searchParams.get('token') ?? ''
  if (!token) return NextResponse.redirect(new URL('/login?magic=missing', origin))

  const payload = await verifyMagicToken(token)
  if (!payload || payload.type !== 'login') {
    return NextResponse.redirect(new URL('/login?magic=invalid', origin))
  }

  const profile = await prisma.profile.findUnique({ where: { email: payload.email } })
  if (!profile) return NextResponse.redirect(new URL('/login?magic=invalid', origin))

  const authToken = await signToken({
    sub:   profile.id,
    email: profile.email,
    role:  profile.role,
    name:  profile.name ?? undefined,
  })
  const res = NextResponse.redirect(new URL('/account', origin))
  res.cookies.set(AUTH_COOKIE, authToken, cookieOptions(authToken))
  return res
}
