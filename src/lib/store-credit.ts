import { prisma } from '@/lib/prisma'
import type { StoreCreditTxnType } from '@prisma/client'

export interface StoreCreditTxnView {
  id: string
  amount: number
  balanceAfter: number
  type: StoreCreditTxnType
  reason: string
  orderId: string | null
  createdAt: Date
}

// Current balance for a user (0 if they have no wallet row yet).
export async function getBalance(userId: string): Promise<number> {
  const row = await prisma.storeCredit.findUnique({ where: { userId }, select: { balance: true } })
  return row?.balance ?? 0
}

// Balance + recent ledger, for the account view and admin detail.
export async function getStoreCreditSummary(userId: string, take = 50): Promise<{ balance: number; transactions: StoreCreditTxnView[] }> {
  const row = await prisma.storeCredit.findUnique({
    where: { userId },
    include: { transactions: { orderBy: { createdAt: 'desc' }, take } },
  })
  if (!row) return { balance: 0, transactions: [] }
  return {
    balance: row.balance,
    transactions: row.transactions.map(t => ({
      id: t.id, amount: t.amount, balanceAfter: t.balanceAfter,
      type: t.type, reason: t.reason, orderId: t.orderId, createdAt: t.createdAt,
    })),
  }
}

// Apply a delta to a user's wallet and append a ledger row, atomically. Positive
// amount adds credit (GRANT/REFUND), negative removes it (ADJUSTMENT). The
// balance is floored at 0; the ledger records the *effective* delta applied, so
// `amount` and `balanceAfter` always stay internally consistent even when an
// adjustment is clamped. Checkout REDEMPTION does NOT use this — it runs a
// race-safe decrement inside the order transaction instead.
export async function adjustCredit(opts: {
  userId: string
  amount: number
  type: StoreCreditTxnType
  reason: string
  orderId?: string | null
}): Promise<{ balance: number; applied: number }> {
  const { userId, amount, type, reason, orderId = null } = opts
  return prisma.$transaction(async tx => {
    const existing = await tx.storeCredit.findUnique({ where: { userId } })
    const credit = existing ?? await tx.storeCredit.create({ data: { userId, balance: 0 } })

    const newBalance = Math.max(0, Math.round((credit.balance + amount) * 100) / 100)
    const applied = Math.round((newBalance - credit.balance) * 100) / 100

    await tx.storeCredit.update({ where: { id: credit.id }, data: { balance: newBalance } })
    await tx.storeCreditTransaction.create({
      data: { creditId: credit.id, amount: applied, balanceAfter: newBalance, type, reason, orderId },
    })
    return { balance: newBalance, applied }
  })
}
