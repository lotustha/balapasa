import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { getDarazControls } from '@/lib/daraz-admin'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25
const CLOSED = ['cancel', 'returned', 'failed', 'delivered', 'lost', 'damaged', 'shipped_back']

// Daraz orders copied by scripts/daraz/orders-sync.mjs, newest first. Read-only.
export async function GET(req: NextRequest) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error

  const sp = req.nextUrl.searchParams
  const controls = await getDarazControls()
  // A shop whose orders are switched off is hidden here too, not just left unsynced.
  const shops = [controls.ordersBalapasa && 'balapasa', controls.ordersTrendwave && 'trendwave'].filter((s): s is string => Boolean(s))
  const shop = sp.get('shop')
  const state = sp.get('state') // open | closed | null
  const q = (sp.get('q') ?? '').trim().slice(0, 60)
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1)

  const closed: Prisma.MarketplaceOrderWhereInput[] = CLOSED.map(word => ({ status: { contains: word, mode: 'insensitive' } }))
  const where: Prisma.MarketplaceOrderWhereInput = {
    shop: shop && shops.includes(shop) ? shop : { in: shops },
    ...(state === 'open' ? { NOT: closed } : state === 'closed' ? { OR: closed } : {}),
    ...(q ? {
      AND: [{
        OR: [
          { externalId: { contains: q } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { items: { some: { name: { contains: q, mode: 'insensitive' } } } },
        ],
      }],
    } : {}),
  }

  const [orders, total] = await Promise.all([
    prisma.marketplaceOrder.findMany({
      where, orderBy: { placedAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { items: true },
    }),
    prisma.marketplaceOrder.count({ where }),
  ])
  return Response.json({ orders, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), shops })
}
