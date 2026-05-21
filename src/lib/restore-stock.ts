import 'server-only'
import { prisma } from '@/lib/prisma'

// Restores stock for every item on a cancelled order — and writes a matching
// `RETURN` inventoryLog row so the audit trail stays clean. Idempotent: a
// second call for the same order is a no-op because we tag each restore with
// the order id in `referenceId` and skip if that tag already exists.
//
// Called from:
//  - PnD webhook handler when an event maps to CANCELLED (returned, failed,
//    delivery_failed_and_cancelled, etc.)
//  - Admin PATCH on `/api/admin/orders/[id]` when status transitions to
//    CANCELLED
export async function restoreStockForOrder(orderId: string, source: 'PICKNDROP' | 'PATHAO' | 'ADMIN' | 'SYSTEM' = 'SYSTEM'): Promise<{ restored: number; skipped: boolean }> {
  // Idempotency check — if we've already logged a RETURN for this order,
  // bail. Saves us from double-restoring stock if the webhook + admin both
  // trip the cancel path.
  const existing = await prisma.inventoryLog.findFirst({
    where:  { referenceId: orderId, type: 'RETURN' },
    select: { id: true },
  })
  if (existing) return { restored: 0, skipped: true }

  const items = await prisma.orderItem.findMany({
    where:  { orderId },
    select: { productId: true, quantity: true, name: true },
  })

  let restored = 0
  for (const it of items) {
    if (!it.productId) continue
    // Only restore for products that actually track inventory. Non-tracked
    // products didn't decrement on order create, so they shouldn't increment
    // on cancel either.
    const rows = await prisma.$queryRaw<Array<{ id: string; stock: number; track_inventory: boolean }>>`
      UPDATE products
      SET stock = CASE WHEN track_inventory THEN stock + ${it.quantity} ELSE stock END,
          updated_at = NOW()
      WHERE id = ${it.productId}
      RETURNING id, stock, track_inventory
    `
    const updated = rows[0]
    if (!updated || !updated.track_inventory) continue

    await prisma.inventoryLog.create({
      data: {
        productId:   it.productId,
        type:        'RETURN',
        quantity:    it.quantity,
        stockAfter:  updated.stock,
        referenceId: orderId,
        note:        `Cancel/return for order ${orderId.slice(0, 8).toUpperCase()} via ${source}`,
      },
    })
    restored++
  }

  return { restored, skipped: false }
}

/**
 * Partial restore for a ReturnRequest that's reached the RECEIVED state.
 * Only restores stock for the line items the customer actually returned
 * (not the whole order). Idempotent: tags the inventoryLog row with
 * `returnRequestId` so a second call is a no-op.
 *
 * Called from `/api/admin/returns/[id]` PATCH when admin marks RECEIVED.
 */
export async function restoreStockForReturn(returnRequestId: string): Promise<{ restored: number; skipped: boolean }> {
  const existing = await prisma.inventoryLog.findFirst({
    where:  { referenceId: returnRequestId, type: 'RETURN' },
    select: { id: true },
  })
  if (existing) return { restored: 0, skipped: true }

  // Two-step fetch: ReturnRequestItem doesn't have a Prisma `@relation` to
  // OrderItem (only a bare orderItemId FK) so we join in app code.
  const rri = await prisma.returnRequestItem.findMany({
    where:  { returnRequestId },
    select: { orderItemId: true, quantity: true },
  })
  const orderItems = rri.length
    ? await prisma.orderItem.findMany({
        where:  { id: { in: rri.map(r => r.orderItemId) } },
        select: { id: true, productId: true, name: true },
      })
    : []
  const byOrderItemId = new Map(orderItems.map(o => [o.id, o]))

  let restored = 0
  for (const r of rri) {
    const oi = byOrderItemId.get(r.orderItemId)
    if (!oi?.productId) continue

    const rows = await prisma.$queryRaw<Array<{ id: string; stock: number; track_inventory: boolean }>>`
      UPDATE products
      SET stock = CASE WHEN track_inventory THEN stock + ${r.quantity} ELSE stock END,
          updated_at = NOW()
      WHERE id = ${oi.productId}
      RETURNING id, stock, track_inventory
    `
    const updated = rows[0]
    if (!updated || !updated.track_inventory) continue

    await prisma.inventoryLog.create({
      data: {
        productId:   oi.productId,
        type:        'RETURN',
        quantity:    r.quantity,
        stockAfter:  updated.stock,
        referenceId: returnRequestId,
        note:        `Return ${returnRequestId.slice(0, 8).toUpperCase()} received`,
      },
    })
    restored++
  }
  return { restored, skipped: false }
}
