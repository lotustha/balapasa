import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { phone, name, items } = await req.json() as {
      phone: string; name?: string; items: unknown[]
    }
    if (!phone || !items?.length) return Response.json({ ok: true })

    await prisma.cartAbandonment.upsert({
      where:  { phone },
      create: {
        phone, name: name ?? null,
        cartJson: JSON.stringify(items),
        reminded: false,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2h
      },
      update: {
        name: name ?? undefined,
        cartJson: JSON.stringify(items),
        reminded: false,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    })
    return Response.json({ ok: true })
  } catch { return Response.json({ ok: true }) }
}

export async function DELETE(req: NextRequest) {
  // Called when order is successfully placed — remove abandonment record
  try {
    const { phone } = await req.json() as { phone: string }
    if (phone) await prisma.cartAbandonment.deleteMany({ where: { phone } })
  } catch {}
  return Response.json({ ok: true })
}
