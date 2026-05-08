import { SignJWT, jwtVerify } from 'jose'

export const AUTH_COOKIE = 'auth-token'
const MAX_AGE = 7 * 24 * 60 * 60

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? 'change-me-in-production-32chars!!')
}

export interface AuthPayload {
  sub: string
  email: string
  role: string
  name?: string
}

export async function signToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(secret())
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload as unknown as AuthPayload
  } catch {
    return null
  }
}

export function cookieOptions(token: string) {
  return {
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE,
  }
}
