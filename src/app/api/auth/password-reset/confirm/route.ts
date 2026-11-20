import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { blockedFor, clientIp, recordAttempt, tooManyAttempts } from '@/lib/rate-limit'
import { passwordFingerprint, verifyResetToken } from '@/lib/password-reset'

const WINDOW_MS = 15 * 60 * 1000
const PER_WINDOW = 10

// POST /api/auth/password-reset/confirm { token, password }
// Sets the new password. The token only works while the password it was issued against is still
// the current one, so it cannot be used twice.
export async function POST(req: NextRequest) {
  const key = `pwreset-confirm:${clientIp(req)}`
  const wait = blockedFor(key, PER_WINDOW)
  if (wait > 0) return tooManyAttempts(wait)
  recordAttempt(key, WINDOW_MS)

  const { token, password } = await req.json().catch(() => ({})) as { token?: string; password?: string }
  if (!token || !password) return Response.json({ error: 'The link and a new password are required' }, { status: 400 })
  if (password.length < 8) return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  if (password.length > 200) return Response.json({ error: 'Password is too long' }, { status: 400 })

  const staleLink = () => Response.json({ error: 'This link is invalid or has expired. Ask for a new one.' }, { status: 400 })
  const payload = await verifyResetToken(token)
  if (!payload) return staleLink()

  const profile = await prisma.profile.findUnique({ where: { email: payload.email }, select: { id: true, password: true } })
  if (!profile || passwordFingerprint(profile.password) !== payload.fp) return staleLink()

  await prisma.profile.update({ where: { id: profile.id }, data: { password: await bcrypt.hash(password, 12) } })
  return Response.json({ success: true })
}
