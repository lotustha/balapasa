import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, AUTH_COOKIE, cookieOptions } from '@/lib/auth'
import { verifyMagicToken } from '@/lib/magic-link'

// GET /api/auth/magic-link/verify?token=...
// Consumes a 'login' magic token, sets the auth cookie, and redirects to
// /account. Wrong/expired tokens redirect to /login with an error flag instead
// of 401-ing so the user lands on a recoverable page.
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  if (!token) return NextResponse.redirect(new URL('/login?magic=missing', req.url))

  const payload = await verifyMagicToken(token)
  if (!payload || payload.type !== 'login') {
    return NextResponse.redirect(new URL('/login?magic=invalid', req.url))
  }

  const profile = await prisma.profile.findUnique({ where: { email: payload.email } })
  if (!profile) return NextResponse.redirect(new URL('/login?magic=invalid', req.url))

  const authToken = await signToken({
    sub:   profile.id,
    email: profile.email,
    role:  profile.role,
    name:  profile.name ?? undefined,
  })
  const res = NextResponse.redirect(new URL('/account', req.url))
  res.cookies.set(AUTH_COOKIE, authToken, cookieOptions(authToken))
  return res
}
