// Small browser-side caches so several components on one page share a single request
// instead of each fetching the same thing.

type Json = Record<string, unknown>

let storeConfig: Promise<Json> | null = null

/** Public store settings (/api/store-config). One request per page load. */
export function getStoreConfig(): Promise<Json> {
  storeConfig ??= fetch('/api/store-config')
    .then(r => r.json() as Promise<Json>)
    .catch(() => { storeConfig = null; return {} })
  return storeConfig
}

export interface FlashDeal {
  id: string
  name: string
  slug: string
  price: number
  salePrice: number
  images: string[]
  salePriceExpiresAt?: string | null
  [key: string]: unknown
}

let flashDeals: Promise<FlashDeal[]> | null = null

/** Products with a live sale price, without their long descriptions. One request per page load. */
export function getFlashDeals(): Promise<FlashDeal[]> {
  flashDeals ??= fetch('/api/products?flash=true&limit=50&slim=1')
    .then(r => r.json())
    .then(d => (d.products ?? []) as FlashDeal[])
    .catch(() => { flashDeals = null; return [] })
  return flashDeals
}
