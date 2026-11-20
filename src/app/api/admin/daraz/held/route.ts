import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Approve or reject one held price move. Approve writes the held price to the product now; reject
// leaves the product alone and stops the sync reporting that same price again.
export async function POST(req: NextRequest) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error

  const { id, action } = await req.json().catch(() => ({})) as { id?: string; action?: string }
  if (!id || (action !== 'approve' && action !== 'reject')) {
    return Response.json({ error: 'id and action (approve or reject) are required' }, { status: 400 })
  }

  const row = await prisma.priceHistory.findUnique({ where: { id } })
  if (!row || row.status !== 'HELD') return Response.json({ error: 'This price change is no longer waiting' }, { status: 409 })

  if (action === 'reject') {
    await prisma.priceHistory.update({ where: { id }, data: { status: 'REJECTED' } })
    return Response.json({ success: true, status: 'REJECTED' })
  }

  const product = await prisma.product.findFirst({ where: { sku: row.sku }, select: { id: true } })
  if (!product) return Response.json({ error: 'The product no longer exists' }, { status: 404 })

  await prisma.$transaction([
    prisma.product.update({ where: { id: product.id }, data: { price: row.newPrice, salePrice: row.newSalePrice } }),
    prisma.priceHistory.update({ where: { id }, data: { status: 'APPLIED', source: 'approved' } }),
  ])
  revalidatePath('/', 'layout')
  return Response.json({ success: true, status: 'APPLIED' })
}
