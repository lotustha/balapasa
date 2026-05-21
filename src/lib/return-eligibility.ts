import 'server-only'
import { prisma } from '@/lib/prisma'

const DEFAULT_WINDOW_DAYS = 7
let _cachedWindow: { value: number; at: number } | null = null
const TTL_MS = 30_000

export async function getReturnWindowDays(): Promise<number> {
  if (_cachedWindow && Date.now() - _cachedWindow.at < TTL_MS) return _cachedWindow.value
  try {
    const rows = await prisma.$queryRaw<{ value: string }[]>`
      SELECT value FROM app_settings WHERE key = 'RETURN_WINDOW_DAYS' LIMIT 1
    `
    const raw = rows[0]?.value
    const n = raw ? Number(raw) : NaN
    const value = Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_WINDOW_DAYS
    _cachedWindow = { value, at: Date.now() }
    return value
  } catch {
    return DEFAULT_WINDOW_DAYS
  }
}

export function invalidateReturnWindowCache(): void { _cachedWindow = null }

/**
 * Determine whether the customer can still file a return for this order.
 * Uses the actual delivered timestamp from OrderStatusLog when available so
 * the window starts when the parcel arrived, not when the order was placed.
 * Falls back to `order.createdAt` if no delivered log row exists.
 */
export async function isOrderReturnable(orderId: string): Promise<{ ok: true; deadline: Date } | { ok: false; reason: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, createdAt: true },
  })
  if (!order) return { ok: false, reason: 'Order not found' }
  if (order.status !== 'DELIVERED') return { ok: false, reason: 'Returns are only available after the order has been delivered.' }

  // Prefer the actual DELIVERED log timestamp when present.
  const deliveredLog = await prisma.orderStatusLog.findFirst({
    where:   { orderId, mappedStatus: 'DELIVERED' },
    orderBy: { createdAt: 'desc' },
    select:  { createdAt: true },
  })
  const start = deliveredLog?.createdAt ?? order.createdAt

  const windowDays = await getReturnWindowDays()
  const deadline = new Date(start)
  deadline.setDate(deadline.getDate() + windowDays)

  if (new Date() > deadline) {
    return { ok: false, reason: `The ${windowDays}-day return window has passed.` }
  }
  return { ok: true, deadline }
}
