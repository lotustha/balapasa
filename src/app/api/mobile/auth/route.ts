import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, AUTH_COOKIE, cookieOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// Mobile login — returns JWT both as Set-Cookie AND in response body
export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password)
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })

  const profile = await prisma.profile.findUnique({ where: { email } })
  if (!profile?.password)
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

  const valid = await bcrypt.compare(password, profile.password)
  if (!valid)
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

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
