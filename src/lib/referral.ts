import 'server-only'

import { prisma } from '@/lib/prisma'
import type { ReferralStatus } from '@prisma/client'

// ── Config (app_settings, 30s cache) ────────────────────────────────────────
// REFERRAL_ENABLED          'true' | 'false'   (default true)
// REFERRAL_REFERRER_REWARD  NPR store credit to the referrer (default 100)
// REFERRAL_REFEREE_REWARD   NPR store credit to the new customer (default 100)
// REFERRAL_MIN_ORDER        min first-order subtotal to qualify (default 0)

export interface ReferralConfig {
  enabled: boolean
  referrerReward: number
  refereeReward: number
  minOrder: number
}

const DEFAULTS: ReferralConfig = { enabled: true, referrerReward: 100, refereeReward: 100, minOrder: 0 }

let _cache: { at: number; cfg: ReferralConfig } | null = null
const TTL_MS = 30_000

export async function getReferralConfig(): Promise<ReferralConfig> {
  if (_cache && Date.now() - _cache.at < TTL_MS) return _cache.cfg
  try {
    const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM app_settings
      WHERE key IN ('REFERRAL_ENABLED','REFERRAL_REFERRER_REWARD','REFERRAL_REFEREE_REWARD','REFERRAL_MIN_ORDER')
    `
    const m = Object.fromEntries(rows.map(r => [r.key, r.value]))
    const num = (v: string | undefined, d: number) => {
      const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : d
    }
    const cfg: ReferralConfig = {
      enabled:        m.REFERRAL_ENABLED == null ? DEFAULTS.enabled : m.REFERRAL_ENABLED === 'true',
      referrerReward: num(m.REFERRAL_REFERRER_REWARD, DEFAULTS.referrerReward),
      refereeReward:  num(m.REFERRAL_REFEREE_REWARD, DEFAULTS.refereeReward),
      minOrder:       num(m.REFERRAL_MIN_ORDER, DEFAULTS.minOrder),
    }
    _cache = { at: Date.now(), cfg }
    return cfg
  } catch {
    return DEFAULTS
  }
}

export function invalidateReferralConfigCache() { _cache = null }

// ── Code (deterministic per user, idempotent) ────────────────────────────────
function deriveCode(userId: string): string {
  let h = 0
  for (const ch of userId) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return 'BP' + h.toString(36).toUpperCase().padStart(6, '0').slice(0, 6)
}

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await prisma.referralCode.findUnique({ where: { userId }, select: { code: true } })
  if (existing) return existing.code
  const code = deriveCode(userId)
  try {
    await prisma.referralCode.create({ data: { userId, code } })
    return code
  } catch {
    // Unlikely collision or race — fall back to a userId-suffixed code.
    const alt = `${code}${userId.slice(-2).toUpperCase()}`
    await prisma.referralCode.create({ data: { userId, code: alt } }).catch(() => {})
    const row = await prisma.referralCode.findUnique({ where: { userId }, select: { code: true } })
    return row?.code ?? code
  }
}

// ── Attribution (called at signup with an optional code) ─────────────────────
// Links a brand-new customer to the referrer who owns `code`. No-op when the
// program is off, the code is unknown, it's the user's own code, or the referee
// is already linked. Never throws into the signup path.
export async function attributeReferral(refereeId: string, code: string | null | undefined): Promise<boolean> {
  try {
    const cfg = await getReferralConfig()
    if (!cfg.enabled) return false
    const clean = (code ?? '').trim().toUpperCase()
    if (!clean) return false

    const owner = await prisma.referralCode.findUnique({ where: { code: clean }, select: { userId: true } })
    if (!owner || owner.userId === refereeId) return false

    const already = await prisma.referral.findUnique({ where: { refereeId }, select: { id: true } })
    if (already) return false

    await prisma.referral.create({
      data: { referrerId: owner.userId, refereeId, code: clean, status: 'PENDING' },
    })
    return true
  } catch (e) {
    console.warn('[referral] attribute failed (non-fatal):', e)
    return false
  }
}

// ── Reward (called when the referee's order is delivered) ────────────────────
// Idempotent: rewards the single PENDING referral for this order's owner and
// flips it to REWARDED, so re-firing (admin + webhook) is a no-op. Credits both
// sides' wallets atomically. Skips guests, disabled program, and sub-min orders.
export async function rewardReferralForOrder(orderId: string): Promise<{ rewarded: boolean }> {
  const cfg = await getReferralConfig()
  if (!cfg.enabled) return { rewarded: false }

  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true, subtotal: true } })
  if (!order?.userId) return { rewarded: false }
  if ((order.subtotal ?? 0) < cfg.minOrder) return { rewarded: false }

  const ref = await prisma.referral.findFirst({
    where:  { refereeId: order.userId, status: 'PENDING' },
    select: { id: true, referrerId: true, refereeId: true },
  })
  if (!ref) return { rewarded: false }

  await prisma.$transaction(async tx => {
    // Re-check status inside the tx to avoid a double-reward race.
    const fresh = await tx.referral.findUnique({ where: { id: ref.id }, select: { status: true } })
    if (!fresh || fresh.status !== 'PENDING') return

    const grant = async (userId: string, amount: number, reason: string) => {
      if (amount <= 0) return
      const credit = await tx.storeCredit.findUnique({ where: { userId } })
        ?? await tx.storeCredit.create({ data: { userId, balance: 0 } })
      const newBalance = Math.round((credit.balance + amount) * 100) / 100
      await tx.storeCredit.update({ where: { id: credit.id }, data: { balance: newBalance } })
      await tx.storeCreditTransaction.create({
        data: { creditId: credit.id, amount, balanceAfter: newBalance, type: 'GRANT', reason, orderId },
      })
    }

    await grant(ref.referrerId, cfg.referrerReward, 'Referral reward — your friend’s first order')
    await grant(ref.refereeId, cfg.refereeReward, 'Welcome referral bonus')

    await tx.referral.update({
      where: { id: ref.id },
      data:  { status: 'REWARDED', orderId, rewardAmount: cfg.referrerReward + cfg.refereeReward, rewardedAt: new Date() },
    })
  })
  return { rewarded: true }
}

// ── Summary (account view) ───────────────────────────────────────────────────
export interface ReferralRow { id: string; status: ReferralStatus; createdAt: Date; rewardedAt: Date | null }

export async function getReferralSummary(userId: string): Promise<{
  config: ReferralConfig; code: string; referrals: ReferralRow[]; totalEarned: number; rewardedCount: number
}> {
  const config = await getReferralConfig()
  const code = await getOrCreateReferralCode(userId)
  const referrals = await prisma.referral.findMany({
    where:   { referrerId: userId },
    orderBy: { createdAt: 'desc' },
    take:    100,
    select:  { id: true, status: true, createdAt: true, rewardedAt: true },
  })
  const rewardedCount = referrals.filter(r => r.status === 'REWARDED').length
  const totalEarned = rewardedCount * config.referrerReward
  return {
    config, code,
    referrals: referrals.map(r => ({ id: r.id, status: r.status, createdAt: r.createdAt, rewardedAt: r.rewardedAt })),
    totalEarned, rewardedCount,
  }
}
