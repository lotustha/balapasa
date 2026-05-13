import { SignJWT, jwtVerify } from 'jose'

const MAGIC_LINK_EXPIRY = '7d'

function secret() {
  return new TextEncoder().encode(
    process.env.MAGIC_LINK_SECRET ?? process.env.JWT_SECRET ?? 'change-me-in-production-32chars!!',
  )
}

export interface MagicLinkPayload {
  email:   string
  type:    'signup-claim'
  orderId?: string
}

export async function createMagicToken(payload: MagicLinkPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(MAGIC_LINK_EXPIRY)
    .setIssuedAt()
    .sign(secret())
}

export async function verifyMagicToken(token: string): Promise<MagicLinkPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    if (payload.type !== 'signup-claim' || typeof payload.email !== 'string') return null
    return payload as unknown as MagicLinkPayload
  } catch {
    return null
  }
}

export function magicLinkUrl(token: string, origin: string): string {
  return `${origin}/account/setup?token=${encodeURIComponent(token)}`
}

export function generateWelcomeCouponCode(email: string): string {
  // Short, memorable code: WELCOME + 6 chars from email hash + timestamp slice
  const hash = Array.from(email).reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 0)
  const tail = (hash.toString(36) + Date.now().toString(36)).slice(0, 6).toUpperCase()
  return `WELCOME${tail}`
}
