import { SignJWT, jwtVerify } from 'jose'
import { cookies, headers } from 'next/headers'

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

// Read the current request's auth payload (or null if unauthenticated).
// Accepts BOTH a bearer token (mobile apps — Authorization: Bearer <jwt>) and
// the httpOnly auth-token cookie (web). Bearer takes precedence so a mobile
// client is never accidentally resolved from a stale cookie. Every route that
// uses this (and requireRole, which delegates here) works for mobile + web.
export async function getCurrentUser(): Promise<AuthPayload | null> {
  const authz = (await headers()).get('authorization')
  if (authz && /^bearer\s+/i.test(authz)) {
    const token = authz.replace(/^bearer\s+/i, '').trim()
    if (token) {
      const payload = await verifyToken(token)
      if (payload) return payload
    }
  }
  const token = (await cookies()).get(AUTH_COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

// Throws (returns 401/403) if the request isn't authenticated or lacks the required role.
const ROLE_RANK: Record<string, number> = { CUSTOMER: 0, STAFF: 1, MANAGER: 2, ADMIN: 3 }

export async function requireRole(minRole: 'STAFF' | 'MANAGER' | 'ADMIN'): Promise<{ user: AuthPayload } | { error: Response }> {
  const user = await getCurrentUser()
  if (!user) return { error: Response.json({ error: 'Not authenticated' }, { status: 401 }) }
  if ((ROLE_RANK[user.role] ?? -1) < ROLE_RANK[minRole]) {
    return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user }
}
