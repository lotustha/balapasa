import { jwtVerify } from 'jose'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_COOKIE = 'auth-token'
const ADMIN_AREA_ROLES = new Set(['ADMIN', 'MANAGER', 'STAFF'])
const ADMIN_ONLY_ROUTES = ['/admin/settings', '/admin/logistics']

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? 'change-me-in-production-32chars!!')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdmin   = pathname.startsWith('/admin')
  const isAccount = pathname.startsWith('/account')
  if (!isAdmin && !isAccount) return NextResponse.next()

  const token = request.cookies.get(AUTH_COOKIE)?.value
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  let role = 'CUSTOMER'
  try {
    const { payload } = await jwtVerify(token, secret())
    role = (payload.role as string) ?? 'CUSTOMER'
  } catch {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAccount) return NextResponse.next()

  if (!ADMIN_AREA_ROLES.has(role)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (role === 'STAFF') {
    const allowed = pathname === '/admin' || pathname.startsWith('/admin/orders')
    if (!allowed) return NextResponse.redirect(new URL('/admin', request.url))
  }

  if (role === 'MANAGER' && ADMIN_ONLY_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*'],
}
