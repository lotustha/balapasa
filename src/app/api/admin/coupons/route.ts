import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
    return Response.json({ coupons })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code, type, value, minOrder, maxUses, expiresAt } = body
    if (!code || !type || !value) return Response.json({ error: 'code, type, value required' }, { status: 400 })
    const coupon = await prisma.coupon.create({
      data: {
        code: String(code).toUpperCase().trim(),
        type,
        value: Number(value),
        minOrder: minOrder ? Number(minOrder) : null,
        maxUses:  maxUses  ? Number(maxUses)  : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })
    return Response.json({ coupon })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('Unique constraint')) return Response.json({ error: 'Coupon code already exists' }, { status: 409 })
    return Response.json({ error: msg }, { status: 500 })
  }
}
