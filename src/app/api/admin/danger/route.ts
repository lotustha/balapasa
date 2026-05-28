import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

// Destructive bulk-clear endpoint for the admin Settings → Danger Zone.
// ADMIN only. Every action requires the client to echo back the target
// keyword as `confirm` so a stray POST can't wipe data. All deletes run in a
// single interactive transaction in FK-dependency order.

const TARGETS = ['products', 'orders', 'transactions', 'staff', 'customers'] as const
type Target = (typeof TARGETS)[number]

const STAFF_ROLES = ['STAFF', 'MANAGER', 'ADMIN'] as const

// GET — live row counts so the UI can show what each action would remove.
export async function GET() {
  const auth = await requireRole('ADMIN')
  if ('error' in auth) return auth.error

  const selfId = auth.user.sub

  try {
    const [products, orders, expenses, invoices, redemptions, staff, customers] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.expense.count(),
      prisma.invoice.count(),
      prisma.giftCardRedemption.count(),
      prisma.profile.count({ where: { role: { in: [...STAFF_ROLES] }, id: { not: selfId } } }),
      prisma.profile.count({ where: { role: 'CUSTOMER' } }),
    ])
    return Response.json({
      products,
      orders,
      transactions: expenses + invoices + redemptions,
      staff,
      customers,
    })
  } catch {
    return Response.json({ error: 'DB unavailable' }, { status: 503 })
  }
}

// POST — { target, confirm } performs the clear.
export async function POST(req: NextRequest) {
  const auth = await requireRole('ADMIN')
  if ('error' in auth) return auth.error

  const selfId = auth.user.sub
  const body = (await req.json().catch(() => ({}))) as { target?: string; confirm?: string }
  const target = body.target as Target | undefined

  if (!target || !TARGETS.includes(target)) {
    return Response.json({ error: 'Invalid target' }, { status: 400 })
  }
  if ((body.confirm ?? '').trim().toLowerCase() !== target) {
    return Response.json({ error: `Type "${target}" to confirm.` }, { status: 400 })
  }

  try {
    const deleted = await prisma.$transaction(
      async (tx) => {
        switch (target) {
          case 'products':  return clearProducts(tx)
          case 'orders':    return clearOrders(tx)
          case 'transactions': return clearTransactions(tx)
          case 'staff':     return clearStaff(tx, selfId)
          case 'customers': return clearCustomers(tx)
        }
      },
      { timeout: 30_000, maxWait: 10_000 },
    )
    return Response.json({ ok: true, target, deleted })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Delete failed' }, { status: 500 })
  }
}

type Tx = Prisma.TransactionClient

// Reviews + inventory logs hold RESTRICT FKs to Product; options/variants
// cascade. Wishlist/Q&A reference products by plain column (no FK) — cleared
// to avoid orphans. Order items keep their productId on purpose (orders
// survive product deletion), so they are NOT touched here.
async function clearProducts(tx: Tx) {
  await tx.review.deleteMany()
  await tx.inventoryLog.deleteMany()
  await tx.wishlistItem.deleteMany()
  await tx.productAnswer.deleteMany()
  await tx.productQuestion.deleteMany()
  const { count } = await tx.product.deleteMany()
  return { products: count }
}

// Everything keyed to an order. Return-request items cascade from their
// request. Order codes counters are reset so numbering starts fresh.
async function clearOrders(tx: Tx) {
  await tx.returnRequest.deleteMany()
  await tx.orderStatusLog.deleteMany()
  await tx.giftCardRedemption.deleteMany()
  await tx.notificationLog.deleteMany()
  await tx.orderItem.deleteMany()
  const { count } = await tx.order.deleteMany()
  await tx.orderCodeCounter.deleteMany()
  return { orders: count }
}

// All money records: the expense ledger, subscription invoices, and
// gift-card redemptions. Orders, gift cards, plans and subscriptions stay.
async function clearTransactions(tx: Tx) {
  const expenses = await tx.expense.deleteMany()
  const redemptions = await tx.giftCardRedemption.deleteMany()
  const invoices = await tx.invoice.deleteMany()
  return { expenses: expenses.count, invoices: invoices.count, redemptions: redemptions.count }
}

// Staff = STAFF/MANAGER/ADMIN profiles, EXCEPT the admin performing the action
// (never lock yourself out). Their reviews/addresses go first (RESTRICT FKs).
async function clearStaff(tx: Tx, selfId: string) {
  const rows = await tx.profile.findMany({
    where: { role: { in: [...STAFF_ROLES] }, id: { not: selfId } },
    select: { id: true },
  })
  const ids = rows.map((r) => r.id)
  if (ids.length === 0) return { staff: 0 }
  await tx.review.deleteMany({ where: { userId: { in: ids } } })
  await tx.address.deleteMany({ where: { userId: { in: ids } } })
  const { count } = await tx.profile.deleteMany({ where: { id: { in: ids } } })
  return { staff: count }
}

// Customers + every order they placed (per the admin's choice). Guest orders
// (null userId) are untouched. Customer-owned rows referencing the profile by
// FK (reviews, addresses) or by plain column (wishlist, device tokens,
// subscriptions/invoices) are removed too.
async function clearCustomers(tx: Tx) {
  const rows = await tx.profile.findMany({ where: { role: 'CUSTOMER' }, select: { id: true } })
  const ids = rows.map((r) => r.id)
  if (ids.length === 0) return { customers: 0, orders: 0 }

  const orderRows = await tx.order.findMany({ where: { userId: { in: ids } }, select: { id: true } })
  const orderIds = orderRows.map((o) => o.id)
  let orders = 0
  if (orderIds.length > 0) {
    await tx.returnRequest.deleteMany({ where: { orderId: { in: orderIds } } })
    await tx.orderStatusLog.deleteMany({ where: { orderId: { in: orderIds } } })
    await tx.giftCardRedemption.deleteMany({ where: { orderId: { in: orderIds } } })
    await tx.notificationLog.deleteMany({ where: { orderId: { in: orderIds } } })
    await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })
    orders = (await tx.order.deleteMany({ where: { id: { in: orderIds } } })).count
  }

  await tx.review.deleteMany({ where: { userId: { in: ids } } })
  await tx.address.deleteMany({ where: { userId: { in: ids } } })
  await tx.wishlistItem.deleteMany({ where: { userId: { in: ids } } })
  await tx.deviceToken.deleteMany({ where: { userId: { in: ids } } })
  await tx.invoice.deleteMany({ where: { userId: { in: ids } } })
  await tx.subscription.deleteMany({ where: { userId: { in: ids } } })
  const { count } = await tx.profile.deleteMany({ where: { id: { in: ids } } })
  return { customers: count, orders }
}
