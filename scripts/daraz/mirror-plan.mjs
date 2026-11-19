// Pure diff between the source shop (TrendWave) and its mirror (Bala Pasa). No I/O.
import { sellerSkuFor, saleTimeForWrite } from './mirror-payload.mjs'

export { saleTimeForWrite }

const sellable = sku => sku.Status === 'active' && Number(sku.price) > 0
const num = v => Number(v) || 0

function desired(sku) {
  const price = num(sku.price), special = num(sku.special_price)
  const onSale = special > 0 && special < price
  return {
    price,
    salePrice: onSale ? special : 0,
    saleFrom: onSale ? sku.special_from_time ?? null : null,
    saleTo: onSale ? sku.special_to_time ?? null : null,
    quantity: num(sku.quantity),
  }
}

function current(sku) {
  // Daraz reports a listing without a sale as special_price equal to price.
  const special = num(sku.special_price) < num(sku.price) ? num(sku.special_price) : 0
  return { price: num(sku.price), salePrice: special, saleFrom: special ? sku.special_from_time ?? null : null, saleTo: special ? sku.special_to_time ?? null : null, quantity: num(sku.quantity) }
}

export function planMirror(sourceProducts, mirrorProducts, { skipCreate = new Set() } = {}) {
  const mirrorSkus = new Map()
  for (const p of mirrorProducts) for (const s of p.skus ?? []) if (String(s.SellerSku).startsWith('TW-')) mirrorSkus.set(s.SellerSku, { item: p, sku: s })

  const plan = { create: [], updates: [], soldOut: [], partial: [] }
  const live = new Set()

  for (const p of sourceProducts) {
    if (p.status !== 'Active') continue
    const skus = (p.skus ?? []).filter(sellable)
    if (skus.length === 0) continue
    const pairs = skus.map(s => [s, mirrorSkus.get(sellerSkuFor(s.SkuId))])
    if (pairs.every(([, m]) => !m)) { if (!skipCreate.has(String(p.item_id))) plan.create.push(p); continue }
    // A variant added to an existing listing cannot be appended through this API path; report it.
    if (pairs.some(([, m]) => !m)) plan.partial.push({ itemId: p.item_id, name: p.attributes?.name ?? '', missing: pairs.filter(([, m]) => !m).map(([s]) => sellerSkuFor(s.SkuId)) })

    for (const [s, m] of pairs) {
      if (!m) continue
      live.add(m.sku.SellerSku)
      const want = desired(s), have = current(m.sku)
      const changed = Object.keys(want).filter(k => want[k] !== have[k])
      if (changed.length) plan.updates.push({ itemId: m.item.item_id, skuId: m.sku.SkuId, sellerSku: m.sku.SellerSku, name: m.item.attributes?.name ?? '', ...want, changed, old: have })
    }
  }

  // The source stopped selling it: keep the listing and its history, but make it unbuyable.
  for (const [sellerSku, m] of mirrorSkus) {
    if (!live.has(sellerSku) && num(m.sku.quantity) > 0) plan.soldOut.push({ itemId: m.item.item_id, skuId: m.sku.SkuId, sellerSku, name: m.item.attributes?.name ?? '' })
  }
  return plan
}

export function priceQuantityXml(entries) {
  const tag = (name, value) => `<${name}>${value ?? ''}</${name}>`
  const skus = entries.map(e => {
    const parts = [tag('ItemId', e.itemId), tag('SkuId', e.skuId)]
    if (e.price != null) {
      parts.push(tag('Price', e.price), tag('SalePrice', e.salePrice || 0))
      if (e.salePrice) parts.push(tag('SaleStartDate', saleTimeForWrite(e.saleFrom)), tag('SaleEndDate', saleTimeForWrite(e.saleTo)))
    }
    parts.push(tag('Quantity', e.quantity))
    return `<Sku>${parts.join('')}</Sku>`
  })
  return `<Request><Product><Skus>${skus.join('')}</Skus></Product></Request>`
}
