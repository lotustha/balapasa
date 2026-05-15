import { SignJWT, jwtVerify } from 'jose'

const MAGIC_LINK_EXPIRY        = '7d'
const VERIFY_EMAIL_EXPIRY      = '24h'

function secret() {
  return new TextEncoder().encode(
    process.env.MAGIC_LINK_SECRET ?? process.env.JWT_SECRET ?? 'change-me-in-production-32chars!!',
  )
}

export type MagicLinkType = 'signup-claim' | 'login' | 'email-verify'

export interface MagicLinkPayload {
  email:    string
  type:     MagicLinkType
  orderId?: string
}

export async function createMagicToken(payload: MagicLinkPayload, expiry: string = MAGIC_LINK_EXPIRY): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiry)
    .setIssuedAt()
    .sign(secret())
}

export async function verifyMagicToken(token: string): Promise<MagicLinkPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    if (typeof payload.email !== 'string') return null
    const t = payload.type
    if (t !== 'signup-claim' && t !== 'login' && t !== 'email-verify') return null
    return payload as unknown as MagicLinkPayload
  } catch {
    return null
  }
}

export async function createVerifyEmailToken(email: string): Promise<string> {
  return createMagicToken({ email, type: 'email-verify' }, VERIFY_EMAIL_EXPIRY)
}

// URLs — kept separate so callers can pick the right one for the flow.
export function magicLinkUrl(token: string, origin: string): string {
  return `${origin}/account/setup?token=${encodeURIComponent(token)}`
}

export function loginLinkUrl(token: string, origin: string): string {
  return `${origin}/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`
}

export function verifyEmailUrl(token: string, origin: string): string {
  return `${origin}/api/auth/verify-email?token=${encodeURIComponent(token)}`
}

export function generateWelcomeCouponCode(email: string): string {
  // Short, memorable code: WELCOME + 6 chars from email hash + timestamp slice
  const hash = Array.from(email).reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 0)
  const tail = (hash.toString(36) + Date.now().toString(36)).slice(0, 6).toUpperCase()
  return `WELCOME${tail}`
}
