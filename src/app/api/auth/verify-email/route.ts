import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyMagicToken } from '@/lib/magic-link'
import { getSiteSettings } from '@/lib/site-settings'

// GET /api/auth/verify-email?token=...
// Consumes a one-time email-verification token, marks the profile as verified,
// and redirects to /account with a flag the page can surface in a toast.
// Redirects use the configured public store URL, not req.url, which behind the
// VPS proxy resolves to the internal localhost:3000.
export async function GET(req: NextRequest) {
  const origin = (await getSiteSettings()).storeUrl
  const token = new URL(req.url).searchParams.get('token') ?? ''
  if (!token) {
    return NextResponse.redirect(new URL('/account?verify=missing', origin))
  }
  const payload = await verifyMagicToken(token)
  if (!payload || payload.type !== 'email-verify') {
    return NextResponse.redirect(new URL('/account?verify=invalid', origin))
  }
  try {
    await prisma.profile.updateMany({
      where: { email: payload.email },
      data:  { emailVerifiedAt: new Date() },
    })
  } catch (e) {
    // Column may be missing if schema migration hasn't run yet. Don't 500.
    console.warn('[verify-email] update failed (column may be missing pre-migration):', e)
    return NextResponse.redirect(new URL('/account?verify=error', origin))
  }
  return NextResponse.redirect(new URL('/account?verify=ok', origin))
}
