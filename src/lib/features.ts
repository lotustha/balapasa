// Feature flags + payment-method types.
// Client-safe: this file is imported by both Server and Client components,
// so it MUST NOT pull in prisma, pg, or any Node-only modules. The DB-backed
// enabled-methods resolver lives in `payment-methods-server.ts`.
//
// PARTIAL_COD is intentionally dropped from the offered list. The Prisma
// enum still has the value for back-compat with historical orders but it
// is no longer offered at checkout.

export const PAYMENT_METHODS = ['COD', 'ESEWA', 'KHALTI'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

// Compile-time list of every method this build knows about. The actual list
// shown to a customer is fetched at runtime from /api/store-config, which
// reads admin toggles from app_settings.
export const ENABLED_PAYMENT_METHODS: readonly PaymentMethod[] = PAYMENT_METHODS

export function isPaymentMethodEnabled(m: string): m is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(m)
}
