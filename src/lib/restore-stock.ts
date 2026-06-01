import 'server-only'
import { prisma } from '@/lib/prisma'
import { getBundleItemRows } from '@/lib/bundle'

// Restore `qty` units of one product and write a matching RETURN inventoryLog
// row (tagged with `referenceId` for idempotency). Non-tracked products didn't
// decrement on order create, so they don't increment here. Returns whether a
// tracked restore actually happened (for the caller's count).
async function restoreOne(productId: string, qty: number, referenceId: string, note: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ id: string; stock: number; track_inventory: boolean }>>`
    UPDATE products
    SET stock = CASE WHEN track_inventory THEN stock + ${qty} ELSE stock END,
        updated_at = NOW()
    WHERE id = ${productId}
    RETURNING id, stock, track_inventory
  `
  const updated = rows[0]
  if (!updated || !updated.track_inventory) return false

  await prisma.inventoryLog.create({
    data: {
      productId,
      type:        'RETURN',
      quantity:    qty,
      stockAfter:  updated.stock,
      referenceId,
      note,
    },
  })
  return true
}

// Given a set of order-line productIds, return which are BUNDLE products plus a
// map of their component rows — so a bundle line restores its COMPONENTS' stock
// (the bundle's own stock is unused), mirroring the deduction branch in
// /api/orders.
async function resolveBundles(productIds: string[]) {
  const ids = productIds.filter(Boolean)
  const kinds = ids.length
    ? await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, kind: true } })
    : []
  const bundleIds = new Set(kinds.filter(k => k.kind === 'BUNDLE').map(k => k.id))
  const componentMap = await getBundleItemRows([...bundleIds])
  return { bundleIds, componentMap }
}

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

  const { bundleIds, componentMap } = await resolveBundles(items.map(i => i.productId))
  const note = `Cancel/return for order ${orderId.slice(0, 8).toUpperCase()} via ${source}`

  let restored = 0
  for (const it of items) {
    if (!it.productId) continue
    if (bundleIds.has(it.productId)) {
      // Bundle line → give each component its units back.
      for (const comp of componentMap.get(it.productId) ?? []) {
        if (await restoreOne(comp.componentProductId, comp.quantity * it.quantity, orderId, note)) restored++
      }
    } else if (await restoreOne(it.productId, it.quantity, orderId, note)) {
      restored++
    }
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

  const { bundleIds, componentMap } = await resolveBundles(orderItems.map(o => o.productId))
  const note = `Return ${returnRequestId.slice(0, 8).toUpperCase()} received`

  let restored = 0
  for (const r of rri) {
    const oi = byOrderItemId.get(r.orderItemId)
    if (!oi?.productId) continue
    if (bundleIds.has(oi.productId)) {
      for (const comp of componentMap.get(oi.productId) ?? []) {
        if (await restoreOne(comp.componentProductId, comp.quantity * r.quantity, returnRequestId, note)) restored++
      }
    } else if (await restoreOne(oi.productId, r.quantity, returnRequestId, note)) {
      restored++
    }
  }
  return { restored, skipped: false }
}
