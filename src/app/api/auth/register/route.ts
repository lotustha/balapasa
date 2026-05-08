import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken, AUTH_COOKIE, cookieOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'

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
  return res
}
