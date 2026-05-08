import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    await prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 404 })
  }
}
