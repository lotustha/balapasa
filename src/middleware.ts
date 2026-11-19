import { jwtVerify } from 'jose'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { apiMinRole, hasRole, pageMinRole } from '@/lib/admin-access'

const AUTH_COOKIE = 'auth-token'

// Sessions are signed with JWT_SECRET. A missing secret in production must fail loudly: falling back
// to a value that is in the source code would let anyone mint an admin session.
function secret() {
  const value = process.env.JWT_SECRET
  if (!value) {
    if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET is not set')
    return new TextEncoder().encode('development-only-secret-not-for-production')
  }
  return new TextEncoder().encode(value)
}

async function roleOf(token: string | undefined): Promise<string | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    return (payload.role as string) ?? 'CUSTOMER'
  } catch {
    return null
  }
}

// The mobile apps authenticate with a Bearer token; the web admin with the cookie.
function tokenFrom(request: NextRequest): string | undefined {
  const authz = request.headers.get('authorization')
  if (authz && /^bearer\s+/i.test(authz)) {
    const bearer = authz.replace(/^bearer\s+/i, '').trim()
    if (bearer) return bearer
  }
  return request.cookies.get(AUTH_COOKIE)?.value
}

function toLogin(request: NextRequest, pathname: string) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirect', pathname)
  return NextResponse.redirect(loginUrl)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Every admin API route is gated here so that a route missing its own check is still protected.
  if (pathname.startsWith('/api/admin/') || pathname === '/api/admin') {
    const role = await roleOf(tokenFrom(request))
    if (!role) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    if (!hasRole(role, apiMinRole(pathname))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.next()
  }

  const isAdmin   = pathname.startsWith('/admin')
  const isAccount = pathname.startsWith('/account')
  if (!isAdmin && !isAccount) return NextResponse.next()

  const role = await roleOf(request.cookies.get(AUTH_COOKIE)?.value)
  if (!role) return toLogin(request, pathname)
  if (isAccount) return NextResponse.next()

  if (!hasRole(role, 'STAFF')) return NextResponse.redirect(new URL('/', request.url))
  if (!hasRole(role, pageMinRole(pathname))) return NextResponse.redirect(new URL('/admin', request.url))
  return NextResponse.next()
}

// /api/admin/upload is left out on purpose: a request that passes through here is buffered and cut
// off at 10 MB, which would break video uploads (up to 200 MB). That route checks the role itself.
export const config = {
  matcher: ['/admin/:path*', '/account/:path*', '/api/admin/((?!upload).*)'],
}
