// Feature flags for staged rollouts.
// Flip values here to enable/disable features in checkout, orders API, etc.
// Keep the underlying integration code intact so flipping back ON is one-line.

export const PAYMENT_METHODS = ['COD', 'PARTIAL_COD', 'ESEWA', 'KHALTI'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

// Production launch: COD only. eSewa / Khalti integrations stay in source
// for the post-launch flip. PARTIAL_COD requires an advance method (ESEWA or
// KHALTI), so it goes off too — re-enable it after wallets come back.
export const ENABLED_PAYMENT_METHODS: readonly PaymentMethod[] = ['COD']

export function isPaymentMethodEnabled(m: string): m is PaymentMethod {
  return (ENABLED_PAYMENT_METHODS as readonly string[]).includes(m)
}
