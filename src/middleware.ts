import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Which roles can enter the admin area at all
const ADMIN_AREA_ROLES = new Set(['ADMIN', 'MANAGER', 'STAFF'])

// Routes that only MANAGER and ADMIN can access
const MANAGER_ROUTES = ['/admin/products', '/admin/categories', '/admin/customers', '/admin/analytics']

// Routes that only ADMIN can access
const ADMIN_ONLY_ROUTES = ['/admin/settings', '/admin/logistics']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only guard /admin routes and /account routes
  const isAdmin   = pathname.startsWith('/admin')
  const isAccount = pathname.startsWith('/account')
  if (!isAdmin && !isAccount) return NextResponse.next()

  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → redirect to login
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Read role from app_metadata (set by admin SDK — cannot be spoofed by users)
  const role: string = (user.app_metadata?.role as string) ?? 'CUSTOMER'

  // /account — any logged-in user
  if (isAccount) return response

  // /admin — must have an admin-area role
  if (!ADMIN_AREA_ROLES.has(role)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // STAFF can only access: /admin (dashboard) and /admin/orders
  if (role === 'STAFF') {
    const allowed = pathname === '/admin' || pathname.startsWith('/admin/orders')
    if (!allowed) return NextResponse.redirect(new URL('/admin', request.url))
  }

  // MANAGER blocked from settings and logistics
  if (role === 'MANAGER' && ADMIN_ONLY_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*'],
}
