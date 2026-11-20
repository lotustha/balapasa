// One rule for "sold out" across the storefront: a product is sold out only when its stock is
// tracked and has run out. A product with tracking switched off is always orderable, whatever its
// stock number says. Callers that do not know `trackInventory` are treated as tracked.

export interface StockInfo { stock: number; trackInventory?: boolean | null }

export function isSoldOut(p: StockInfo): boolean {
  return p.trackInventory !== false && p.stock <= 0
}

/** Quantity a shopper may pick for an untracked product (there is no real stock figure to cap at). */
export const UNTRACKED_MAX_QTY = 99
