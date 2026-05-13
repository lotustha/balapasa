// Feature flags for staged rollouts.
// Flip values here to enable/disable features in checkout, orders API, etc.
// Keep the underlying integration code intact so flipping back ON is one-line.

export const PAYMENT_METHODS = ['COD', 'PARTIAL_COD', 'ESEWA', 'KHALTI'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

// All payment methods enabled. eSewa + Khalti require working sandbox/prod
// credentials in .env.local (ESEWA_MERCHANT_CODE, ESEWA_SECRET_KEY,
// KHALTI_SECRET_KEY) — see src/lib/payment.ts for the contract. PARTIAL_COD
// works because at least one wallet (ESEWA or KHALTI) is enabled.
export const ENABLED_PAYMENT_METHODS: readonly PaymentMethod[] = ['COD', 'ESEWA', 'KHALTI', 'PARTIAL_COD']

export function isPaymentMethodEnabled(m: string): m is PaymentMethod {
  return (ENABLED_PAYMENT_METHODS as readonly string[]).includes(m)
}
