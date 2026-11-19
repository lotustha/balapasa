import { NextRequest, NextResponse } from 'next/server'
import { signToken, AUTH_COOKIE, cookieOptions } from '@/lib/auth'
import { passwordLogin } from '@/lib/password-login'

// Mobile login — returns JWT both as Set-Cookie AND in response body
export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}))
  const result = await passwordLogin(req, email, password)
  if ('error' in result) return result.error
  const { profile } = result

  const token = await signToken({
    sub: profile.id, email: profile.email,
    role: profile.role, name: profile.name ?? undefined,
  })

  const res = NextResponse.json({
    token,
    user: { id: profile.id, email: profile.email, name: profile.name, role: profile.role, phone: profile.phone },
  })
  res.cookies.set(AUTH_COOKIE, token, cookieOptions(token))
  return res
}
