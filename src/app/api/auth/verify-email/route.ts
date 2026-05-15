import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyMagicToken } from '@/lib/magic-link'

// GET /api/auth/verify-email?token=...
// Consumes a one-time email-verification token, marks the profile as verified,
// and redirects to /account with a flag the page can surface in a toast.
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  if (!token) {
    return NextResponse.redirect(new URL('/account?verify=missing', req.url))
  }
  const payload = await verifyMagicToken(token)
  if (!payload || payload.type !== 'email-verify') {
    return NextResponse.redirect(new URL('/account?verify=invalid', req.url))
  }
  try {
    await prisma.profile.updateMany({
      where: { email: payload.email },
      data:  { emailVerifiedAt: new Date() },
    })
  } catch (e) {
    // Column may be missing if schema migration hasn't run yet. Don't 500.
    console.warn('[verify-email] update failed (column may be missing pre-migration):', e)
    return NextResponse.redirect(new URL('/account?verify=error', req.url))
  }
  return NextResponse.redirect(new URL('/account?verify=ok', req.url))
}
