import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { verifyMagicToken, generateWelcomeCouponCode } from '@/lib/magic-link'
import { signToken, cookieOptions, AUTH_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json() as { token?: string; password?: string }
    if (!token || !password) {
      return Response.json({ error: 'Token and password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const payload = await verifyMagicToken(token)
    if (!payload) {
      return Response.json({ error: 'This link is invalid or has expired' }, { status: 400 })
    }

    const profile = await prisma.profile.findUnique({ where: { email: payload.email } })
    if (!profile) {
      return Response.json({ error: 'Account not found. Please contact support.' }, { status: 404 })
    }

    // If a password is already set, the magic-link has been consumed. Don't allow re-use.
    if (profile.password) {
      return Response.json({ error: 'Account already activated. Please sign in instead.' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 10)
    await prisma.profile.update({
      where: { id: profile.id },
      data:  { password: hashed },
    })

    // Issue the welcome 10% off coupon (single-use, 30-day expiry, min order Rs 1000)
    let couponCode: string | null = null
    try {
      couponCode = generateWelcomeCouponCode(profile.email)
      await prisma.coupon.create({
        data: {
          code:      couponCode,
          type:      'PERCENT',
          value:     10,
          minOrder:  1000,
          maxUses:   1,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive:  true,
          scope:     'ALL',
        },
      })
    } catch (e) {
      console.warn('[setup-password] coupon creation failed (non-fatal):', e)
      couponCode = null
    }

    // Sign the user in immediately
    const authToken = await signToken({
      sub:   profile.id,
      email: profile.email,
      role:  profile.role,
      name:  profile.name ?? undefined,
    })
    const cookieStore = await cookies()
    const opts = cookieOptions(authToken)
    cookieStore.set(AUTH_COOKIE, opts.value, opts)

    return Response.json({
      success: true,
      couponCode,
      user: { id: profile.id, email: profile.email, name: profile.name },
    })
  } catch (e) {
    console.error('[setup-password] failed:', e)
    return Response.json({ error: 'Could not activate account. Please try again.' }, { status: 500 })
  }
}
