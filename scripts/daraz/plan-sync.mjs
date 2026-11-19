// Pure diff between the mapped Daraz catalog and the website's products. No I/O.

const same = (a, b) => (a == null || b == null ? a == null && b == null : Math.abs(Number(a) - Number(b)) < 0.005)
const paid = p => (p.salePrice != null && p.salePrice < p.price ? Number(p.salePrice) : Number(p.price))
const round1 = n => Math.round(n * 10) / 10

export function planSync(mapped, existing, { holdOver = 0.2, applyHeld = false } = {}) {
  const plan = { create: [], priceChanges: [], deactivate: [], reactivate: [], variantChanges: [] }
  const bySku = new Map(existing.filter(e => e.sku?.startsWith('DZ-')).map(e => [e.sku, e]))
  const seen = new Set()

  for (const m of mapped) {
    const e = bySku.get(m.sku)
    if (!e) { plan.create.push(m); continue }
    seen.add(m.sku)
    const ref = { id: e.id, sku: e.sku, name: e.name }
    if (!e.isActive) plan.reactivate.push(ref)

    if (!same(e.price, m.price) || !same(e.salePrice, m.salePrice)) {
      const before = paid(e), after = paid(m)
      const change = before > 0 ? (after - before) / before : 0
      plan.priceChanges.push({
        ...ref,
        old: { price: Number(e.price), salePrice: e.salePrice == null ? null : Number(e.salePrice) },
        new: { price: m.price, salePrice: m.salePrice, salePriceStartsAt: m.salePriceStartsAt, salePriceExpiresAt: m.salePriceExpiresAt },
        changePercent: round1(change * 100),
        held: !applyHeld && Math.abs(change) > holdOver + 1e-9,
      })
    }

    const have = new Map((e.variants ?? []).map(v => [v.sku, v]))
    const want = new Map(m.variants.map(v => [v.sku, v]))
    const vc = { productId: e.id, productSku: e.sku, priceUpdates: [], deactivate: [], reactivate: [], create: [], options: m.options }
    for (const [sku, v] of want) {
      const h = have.get(sku)
      if (!h) { vc.create.push(v); continue }
      if (!h.isActive) vc.reactivate.push({ id: h.id, sku })
      if (!same(h.price, v.price)) vc.priceUpdates.push({ id: h.id, sku, old: h.price == null ? null : Number(h.price), new: v.price })
    }
    for (const [sku, h] of have) if (!want.has(sku) && h.isActive) vc.deactivate.push({ id: h.id, sku })
    if (vc.priceUpdates.length || vc.deactivate.length || vc.reactivate.length || vc.create.length) plan.variantChanges.push(vc)
  }

  for (const [sku, e] of bySku) if (!seen.has(sku) && e.isActive) plan.deactivate.push({ id: e.id, sku, name: e.name })
  return plan
}
