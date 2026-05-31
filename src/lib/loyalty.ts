import 'server-only'

import { prisma } from '@/lib/prisma'
import type { LoyaltyTxnType } from '@prisma/client'

// ── Config (app_settings, 30s cache) ────────────────────────────────────────
// LOYALTY_ENABLED        'true' | 'false'   (default true)
// LOYALTY_NPR_PER_POINT  earn 1 point per this many NPR of order subtotal (default 100)
// LOYALTY_POINT_VALUE    NPR of store credit per point on redemption (default 1)
// LOYALTY_MIN_REDEEM     minimum points required to redeem (default 100)

export interface LoyaltyConfig {
  enabled: boolean
  nprPerPoint: number
  pointValue: number
  minRedeem: number
}

const DEFAULTS: LoyaltyConfig = { enabled: true, nprPerPoint: 100, pointValue: 1, minRedeem: 100 }

let _cache: { at: number; cfg: LoyaltyConfig } | null = null
const TTL_MS = 30_000

export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  if (_cache && Date.now() - _cache.at < TTL_MS) return _cache.cfg
  try {
    const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM app_settings
      WHERE key IN ('LOYALTY_ENABLED','LOYALTY_NPR_PER_POINT','LOYALTY_POINT_VALUE','LOYALTY_MIN_REDEEM')
    `
    const m = Object.fromEntries(rows.map(r => [r.key, r.value]))
    const num = (v: string | undefined, d: number) => {
      const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d
    }
    const cfg: LoyaltyConfig = {
      enabled:     m.LOYALTY_ENABLED == null ? DEFAULTS.enabled : m.LOYALTY_ENABLED === 'true',
      nprPerPoint: num(m.LOYALTY_NPR_PER_POINT, DEFAULTS.nprPerPoint),
      pointValue:  num(m.LOYALTY_POINT_VALUE, DEFAULTS.pointValue),
      minRedeem:   Math.max(1, Math.round(num(m.LOYALTY_MIN_REDEEM, DEFAULTS.minRedeem))),
    }
    _cache = { at: Date.now(), cfg }
    return cfg
  } catch {
    return DEFAULTS
  }
}

export function invalidateLoyaltyConfigCache() { _cache = null }

// ── Earn (idempotent, called when an order is delivered) ─────────────────────
// Awards floor(subtotal / nprPerPoint) points to the order's owner. Idempotent:
// a second call for the same order is a no-op (guarded by an existing EARN row
// for that orderId). Guests (no userId) and disabled loyalty are skipped.
export async function awardLoyaltyForOrder(orderId: string): Promise<{ awarded: number } | null> {
  const cfg = await getLoyaltyConfig()
  if (!cfg.enabled) return null

  const order = await prisma.order.findUnique({
    where:  { id: orderId },
    select: { id: true, userId: true, subtotal: true },
  })
  if (!order?.userId) return null

  const points = Math.floor((order.subtotal ?? 0) / cfg.nprPerPoint)
  if (points <= 0) return null

  // Idempotency: don't double-award if delivery fires twice (admin + webhook).
  const already = await prisma.loyaltyTransaction.findFirst({
    where:  { type: 'EARN', orderId, account: { userId: order.userId } },
    select: { id: true },
  })
  if (already) return null

  await prisma.$transaction(async tx => {
    const acct = await tx.loyaltyAccount.findUnique({ where: { userId: order.userId! } })
      ?? await tx.loyaltyAccount.create({ data: { userId: order.userId!, pointsBalance: 0, lifetimePoints: 0 } })
    const newBalance = acct.pointsBalance + points
    await tx.loyaltyAccount.update({
      where: { id: acct.id },
      data:  { pointsBalance: newBalance, lifetimePoints: acct.lifetimePoints + points },
    })
    await tx.loyaltyTransaction.create({
      data: {
        accountId: acct.id, points, balanceAfter: newBalance,
        type: 'EARN', reason: `Order ${orderId.slice(0, 8).toUpperCase()}`, orderId,
      },
    })
  })
  return { awarded: points }
}

// ── Summary (account view) ───────────────────────────────────────────────────
export interface LoyaltyTxnView {
  id: string; points: number; balanceAfter: number
  type: LoyaltyTxnType; reason: string; orderId: string | null; createdAt: Date
}

export async function getLoyaltySummary(userId: string, take = 50): Promise<{
  config: LoyaltyConfig; balance: number; lifetimePoints: number; transactions: LoyaltyTxnView[]
}> {
  const config = await getLoyaltyConfig()
  const acct = await prisma.loyaltyAccount.findUnique({
    where:   { userId },
    include: { transactions: { orderBy: { createdAt: 'desc' }, take } },
  })
  if (!acct) return { config, balance: 0, lifetimePoints: 0, transactions: [] }
  return {
    config,
    balance: acct.pointsBalance,
    lifetimePoints: acct.lifetimePoints,
    transactions: acct.transactions.map(t => ({
      id: t.id, points: t.points, balanceAfter: t.balanceAfter,
      type: t.type, reason: t.reason, orderId: t.orderId, createdAt: t.createdAt,
    })),
  }
}

// ── Redeem points → store credit (atomic) ────────────────────────────────────
export class LoyaltyRedeemError extends Error {
  status: number
  constructor(message: string, status = 400) { super(message); this.status = status }
}

export async function redeemPoints(userId: string, points: number): Promise<{
  pointsBalance: number; creditAdded: number; creditBalance: number
}> {
  const cfg = await getLoyaltyConfig()
  if (!cfg.enabled) throw new LoyaltyRedeemError('Loyalty program is not active.', 400)

  const pts = Math.floor(Number(points))
  if (!Number.isFinite(pts) || pts <= 0) throw new LoyaltyRedeemError('Enter a valid number of points.', 400)
  if (pts < cfg.minRedeem) throw new LoyaltyRedeemError(`You need at least ${cfg.minRedeem} points to redeem.`, 400)

  return prisma.$transaction(async tx => {
    const acct = await tx.loyaltyAccount.findUnique({ where: { userId } })
    if (!acct || acct.pointsBalance < pts) {
      throw new LoyaltyRedeemError('Not enough points.', 400)
    }
    const creditAdded   = Math.round(pts * cfg.pointValue * 100) / 100
    const newPoints     = acct.pointsBalance - pts

    await tx.loyaltyAccount.update({ where: { id: acct.id }, data: { pointsBalance: newPoints } })
    await tx.loyaltyTransaction.create({
      data: {
        accountId: acct.id, points: -pts, balanceAfter: newPoints,
        type: 'REDEEM', reason: `Redeemed ${pts} points for store credit`, orderId: null,
      },
    })

    // Pay out into the store-credit wallet (GRANT — credit added).
    const credit = await tx.storeCredit.findUnique({ where: { userId } })
      ?? await tx.storeCredit.create({ data: { userId, balance: 0 } })
    const newCredit = Math.round((credit.balance + creditAdded) * 100) / 100
    await tx.storeCredit.update({ where: { id: credit.id }, data: { balance: newCredit } })
    await tx.storeCreditTransaction.create({
      data: {
        creditId: credit.id, amount: creditAdded, balanceAfter: newCredit,
        type: 'GRANT', reason: `Loyalty: redeemed ${pts} points`, orderId: null,
      },
    })

    return { pointsBalance: newPoints, creditAdded, creditBalance: newCredit }
  })
}
