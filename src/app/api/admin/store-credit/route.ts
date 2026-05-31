import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { adjustCredit, getStoreCreditSummary } from '@/lib/store-credit'
import type { StoreCreditTxnType } from '@prisma/client'

// GET /api/admin/store-credit            → all wallets with customer name/email
// GET /api/admin/store-credit?userId=…   → one customer's balance + ledger
// StoreCredit.userId has no FK, so profiles are joined manually (same pattern as
// admin subscriptions). Secured + mobile-ready via requireRole('MANAGER').
export async function GET(req: NextRequest) {
  const auth = await requireRole('MANAGER')
  if ('error' in auth) return auth.error

  const userId = req.nextUrl.searchParams.get('userId')?.trim()

  try {
    if (userId) {
      const [summary, profile] = await Promise.all([
        getStoreCreditSummary(userId),
        prisma.profile.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } }),
      ])
      return Response.json({ ...summary, user: profile })
    }

    const wallets = await prisma.storeCredit.findMany({ orderBy: { updatedAt: 'desc' }, take: 200 })
    const ids = wallets.map(w => w.userId)
    const profiles = ids.length
      ? await prisma.profile.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } })
      : []
    const byId = new Map(profiles.map(p => [p.id, p]))

    return Response.json({
      wallets: wallets.map(w => ({
        userId: w.userId,
        balance: w.balance,
        updatedAt: w.updatedAt,
        user: byId.get(w.userId) ?? null,
      })),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg, wallets: [] }, { status: 500 })
  }
}

// POST /api/admin/store-credit  { userId, amount, reason, type? }
// Grant (positive) or adjust/deduct (negative) a customer's store credit.
export async function POST(req: NextRequest) {
  const auth = await requireRole('MANAGER')
  if ('error' in auth) return auth.error

  try {
    const { userId, amount, reason, type } = await req.json()
    const amt = Number(amount)
    if (!userId || typeof userId !== 'string') return Response.json({ error: 'userId required' }, { status: 400 })
    if (!Number.isFinite(amt) || amt === 0) return Response.json({ error: 'amount must be a non-zero number' }, { status: 400 })
    if (!reason || typeof reason !== 'string' || !reason.trim()) return Response.json({ error: 'reason required' }, { status: 400 })

    const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { id: true } })
    if (!profile) return Response.json({ error: 'Customer not found' }, { status: 404 })

    const resolvedType: StoreCreditTxnType = type ?? (amt < 0 ? 'ADJUSTMENT' : 'GRANT')
    const result = await adjustCredit({ userId, amount: amt, type: resolvedType, reason: reason.trim().slice(0, 200) })

    return Response.json({ balance: result.balance, applied: result.applied })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
