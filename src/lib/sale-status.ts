// Single source of truth for "is this product currently on sale?". Used by
// the products API filter, DealsSection, HeroDealOfTheDay, ProductCard, and PDP.

export type SaleStatus = 'live' | 'scheduled' | 'expired' | 'none'

export interface SaleInput {
  price:               number
  salePrice:           number | null
  salePriceStartsAt:   Date | string | null
  salePriceExpiresAt:  Date | string | null
}

function toDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null
  return d instanceof Date ? d : new Date(d)
}

export function getSaleStatus(p: SaleInput, now: Date = new Date()): SaleStatus {
  if (p.salePrice == null || p.salePrice >= p.price) return 'none'
  const starts = toDate(p.salePriceStartsAt)
  const ends   = toDate(p.salePriceExpiresAt)
  if (ends && ends <= now) return 'expired'
  if (starts && starts > now) return 'scheduled'
  return 'live'
}

export function isSaleLive(p: SaleInput, now: Date = new Date()): boolean {
  return getSaleStatus(p, now) === 'live'
}

/**
 * "% claimed" since the sale activated. Returns null when there's no baseline
 * (legacy products without saleInitialStock) so callers can fall back to a
 * cosmetic indicator instead of showing 0%/100% incorrectly.
 */
export function getClaimedPercent(p: {
  stock: number
  saleInitialStock: number | null
}): number | null {
  if (p.saleInitialStock == null || p.saleInitialStock <= 0) return null
  const claimed = Math.max(0, p.saleInitialStock - p.stock)
  const pct = (claimed / p.saleInitialStock) * 100
  return Math.min(100, Math.max(0, Math.round(pct)))
}

// Note: a `discountPercent(price, salePrice)` helper already exists in
// `@/lib/utils`. Import from there to keep one source of truth.
