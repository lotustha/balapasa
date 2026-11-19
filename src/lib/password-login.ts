import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { blockedFor, clearAttempts, clientIp, recordAttempt, tooManyAttempts } from '@/lib/rate-limit'

// Password sign-in shared by the web and mobile login routes, with attempt limiting: 5 wrong
// passwords for one account from one address, or 30 from one address across accounts, lock that
// combination out for 15 minutes.

const WINDOW_MS = 15 * 60 * 1000
const PER_ACCOUNT = 5
const PER_ADDRESS = 30

type Profile = NonNullable<Awaited<ReturnType<typeof prisma.profile.findUnique>>>
export type LoginResult = { profile: Profile } | { error: Response }

export async function passwordLogin(req: Request, rawEmail: unknown, password: unknown): Promise<LoginResult> {
  if (typeof rawEmail !== 'string' || typeof password !== 'string' || !rawEmail.trim() || !password) {
    return { error: Response.json({ error: 'Email and password required' }, { status: 400 }) }
  }
  const email = rawEmail.trim()
  const ip = clientIp(req)
  const accountKey = `login:${email.toLowerCase()}:${ip}`
  const addressKey = `login-ip:${ip}`

  const wait = Math.max(blockedFor(accountKey, PER_ACCOUNT), blockedFor(addressKey, PER_ADDRESS))
  if (wait > 0) return { error: tooManyAttempts(wait) }

  // Emails were stored as typed, so match exactly first and then ignoring case.
  const profile = await prisma.profile.findUnique({ where: { email } })
    ?? await prisma.profile.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })

  const valid = profile?.password ? await bcrypt.compare(password, profile.password) : false
  if (!profile || !valid) {
    recordAttempt(accountKey, WINDOW_MS)
    recordAttempt(addressKey, WINDOW_MS)
    return { error: Response.json({ error: 'Invalid credentials' }, { status: 401 }) }
  }

  clearAttempts(accountKey)
  return { profile }
}
