import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(body.isActive  !== undefined && { isActive: body.isActive }),
        ...(body.code      !== undefined && { code: String(body.code).toUpperCase().trim() }),
        ...(body.type      !== undefined && { type: body.type }),
        ...(body.value     !== undefined && { value: Number(body.value) }),
        ...(body.minOrder  !== undefined && { minOrder: body.minOrder ? Number(body.minOrder) : null }),
        ...(body.maxUses   !== undefined && { maxUses:  body.maxUses  ? Number(body.maxUses)  : null }),
        ...(body.expiresAt !== undefined && { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }),
      },
    })
    return Response.json({ coupon })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await prisma.coupon.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
