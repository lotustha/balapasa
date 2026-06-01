import 'server-only'

import { prisma } from '@/lib/prisma'

// A bundle (Product.kind === 'BUNDLE') is a kit of regular products. Its
// availability and order-time stock deduction are DERIVED from its components
// (the bundle's own stock is unused). This module is the single source of truth
// for component expansion + availability, shared by the order route, the
// restore-stock path, cart-flags, and the PDP so the math never drifts.

export interface BundleComponent {
  componentProductId: string
  quantity: number          // units of this component per ONE bundle
  name: string
  slug: string
  price: number
  salePrice: number | null
  image: string | null
  stock: number
  trackInventory: boolean
  isActive: boolean
  missing: boolean          // component product was deleted → bundle unavailable
}

// Light component rows (id + qty) for many bundles at once. Used on the hot
// order / restore paths where we only need to expand a bundle into the
// (componentProductId, quantity) pairs to deduct or restore.
export async function getBundleItemRows(
  bundleProductIds: string[],
): Promise<Map<string, Array<{ componentProductId: string; quantity: number }>>> {
  const map = new Map<string, Array<{ componentProductId: string; quantity: number }>>()
  if (bundleProductIds.length === 0) return map
  const rows = await prisma.bundleItem.findMany({
    where:   { bundleProductId: { in: bundleProductIds } },
    select:  { bundleProductId: true, componentProductId: true, quantity: true },
    orderBy: { sortOrder: 'asc' },
  })
  for (const r of rows) {
    const list = map.get(r.bundleProductId) ?? []
    list.push({ componentProductId: r.componentProductId, quantity: r.quantity })
    map.set(r.bundleProductId, list)
  }
  return map
}

// Components resolved with their product fields (for PDP / cart-flags / admin
// display + availability + savings). A deleted component is returned with
// missing=true so callers can mark the bundle unavailable.
export async function getBundleComponents(bundleProductId: string): Promise<BundleComponent[]> {
  const items = await prisma.bundleItem.findMany({
    where:   { bundleProductId },
    orderBy: { sortOrder: 'asc' },
    select:  { componentProductId: true, quantity: true },
  })
  if (items.length === 0) return []

  const products = await prisma.product.findMany({
    where:  { id: { in: items.map(i => i.componentProductId) } },
    select: {
      id: true, name: true, slug: true, price: true, salePrice: true,
      images: true, stock: true, trackInventory: true, isActive: true,
    },
  })
  const byId = new Map(products.map(p => [p.id, p]))

  return items.map(i => {
    const p = byId.get(i.componentProductId)
    if (!p) {
      return {
        componentProductId: i.componentProductId, quantity: i.quantity,
        name: 'Unavailable item', slug: '', price: 0, salePrice: null, image: null,
        stock: 0, trackInventory: true, isActive: false, missing: true,
      }
    }
    return {
      componentProductId: p.id, quantity: i.quantity,
      name: p.name, slug: p.slug, price: p.price, salePrice: p.salePrice,
      image: p.images[0] ?? null, stock: p.stock, trackInventory: p.trackInventory,
      isActive: p.isActive, missing: false,
    }
  })
}

// How many whole bundles can currently be fulfilled. Deleted/inactive component
// → 0 (bundle is unavailable). Non-tracked component → unconstrained. An empty
// bundle (no components) → 0. Capped sentinel for all-untracked so the UI shows
// "in stock" without a misleading huge number.
export function bundleAvailability(components: BundleComponent[]): number {
  if (components.length === 0) return 0
  let min = Infinity
  for (const c of components) {
    if (c.missing || !c.isActive) return 0
    if (!c.trackInventory) continue
    const can = Math.floor(c.stock / Math.max(1, c.quantity))
    if (can < min) min = can
  }
  return min === Infinity ? 9999 : min
}

// Sum of component prices at their effective (sale) price for ONE bundle — the
// "regular" total a customer would pay buying the items separately. Drives the
// "you save X" line against the bundle's own Product.price.
export function bundleComponentsTotal(components: BundleComponent[]): number {
  return components.reduce((s, c) => s + (c.salePrice ?? c.price) * c.quantity, 0)
}
