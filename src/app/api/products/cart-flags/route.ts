import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// Lightweight lookup used by checkout to know which cart items qualify for
// free delivery without dragging full product detail into the cart context.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { ids?: unknown }
    const ids  = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === 'string') : []
    if (ids.length === 0) return Response.json({ flags: {} })

    const rows = await prisma.product.findMany({
      where:  { id: { in: ids } },
      select: { id: true, freeDelivery: true, isTaxable: true },
    })
    const flags: Record<string, boolean> = {}
    const taxable: Record<string, boolean> = {}
    for (const r of rows) {
      flags[r.id]   = !!r.freeDelivery
      taxable[r.id] = !!r.isTaxable
    }
    return Response.json({ flags, taxable })
  } catch {
    return Response.json({ flags: {}, taxable: {} })
  }
}
