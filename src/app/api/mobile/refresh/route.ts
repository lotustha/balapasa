import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, signToken, AUTH_COOKIE, cookieOptions } from '@/lib/auth'

// POST /api/mobile/refresh
// Exchanges a STILL-VALID bearer token (or cookie) for a fresh 7-day token —
// a sliding session. Mobile apps call this on launch / periodically so a user
// isn't silently logged out at the 7-day mark. Expired tokens fail jwtVerify
// → 401, and the app must route the user back through login.
//
// The profile is re-read so the new token reflects the current role/name
// (e.g. a role change or rename) and confirms the account still exists.
export async function POST() {
  const current = await getCurrentUser()
  if (!current) {
    return NextResponse.json({ error: 'Session expired — please sign in again' }, { status: 401 })
  }

  const profile = await prisma.profile.findUnique({ where: { id: current.sub } })
  if (!profile) {
    return NextResponse.json({ error: 'Account not found' }, { status: 401 })
  }

  const token = await signToken({
    sub:   profile.id,
    email: profile.email,
    role:  profile.role,
    name:  profile.name ?? undefined,
  })

  const res = NextResponse.json({
    token,
    user: { id: profile.id, email: profile.email, name: profile.name, role: profile.role, phone: profile.phone },
  })
  res.cookies.set(AUTH_COOKIE, token, cookieOptions(token))
  return res
}
