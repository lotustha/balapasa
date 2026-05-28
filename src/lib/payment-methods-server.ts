// Server-only resolver for which payment methods are currently offered.
// Reads PAYMENT_<METHOD>_ENABLED keys from app_settings (admin Settings
// → Payments toggles). Cached for 30 s; invalidated by the admin settings
// POST handler so a flip in the dashboard takes effect immediately.
//
// NEVER import this file from a Client Component — it pulls in `prisma`
// which depends on `pg` (Node-only). Use `@/lib/features` for shared
// types and constants instead.

import { prisma } from '@/lib/prisma'
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/features'

let _cache: { at: number; methods: PaymentMethod[] } | null = null
const TTL_MS = 30_000

export async function getEnabledPaymentMethods(): Promise<PaymentMethod[]> {
  if (_cache && Date.now() - _cache.at < TTL_MS) return _cache.methods
  try {
    const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM app_settings
      WHERE key IN (
        'PAYMENT_COD_ENABLED', 'PAYMENT_DIGITAL_ENABLED',
        'PAYMENT_ESEWA_ENABLED', 'PAYMENT_KHALTI_ENABLED'
      )
    `
    const flag = (k: string, defaultOn = true) => {
      const v = rows.find(r => r.key === k)?.value
      return v == null ? defaultOn : v === 'true'
    }
    const digitalOn = flag('PAYMENT_DIGITAL_ENABLED')
    const methods: PaymentMethod[] = []
    if (flag('PAYMENT_COD_ENABLED'))                        methods.push('COD')
    if (digitalOn && flag('PAYMENT_ESEWA_ENABLED'))         methods.push('ESEWA')
    if (digitalOn && flag('PAYMENT_KHALTI_ENABLED'))        methods.push('KHALTI')
    // Safety: never return zero methods — fall back to COD.
    if (methods.length === 0) methods.push('COD')
    _cache = { at: Date.now(), methods }
    return methods
  } catch {
    return [...PAYMENT_METHODS]
  }
}

export function invalidateEnabledPaymentMethodsCache() { _cache = null }
