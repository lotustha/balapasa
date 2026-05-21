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
      select: { id: true, freeDelivery: true, isTaxable: true, isActive: true, stock: true, trackInventory: true, name: true },
    })
    const flags: Record<string, boolean> = {}
    const taxable: Record<string, boolean> = {}
    const validity: Record<string, { active: boolean; stock: number; trackInventory: boolean; name: string }> = {}
    for (const r of rows) {
      flags[r.id]    = !!r.freeDelivery
      taxable[r.id]  = !!r.isTaxable
      validity[r.id] = { active: r.isActive, stock: r.stock, trackInventory: r.trackInventory, name: r.name }
    }
    // ids the lookup couldn't find at all = deleted between add-to-cart and now
    for (const id of ids) {
      if (!validity[id]) validity[id] = { active: false, stock: 0, trackInventory: true, name: '' }
    }
    return Response.json({ flags, taxable, validity })
  } catch {
    return Response.json({ flags: {}, taxable: {}, validity: {} })
  }
}
