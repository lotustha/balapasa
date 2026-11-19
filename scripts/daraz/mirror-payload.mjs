// Build a Daraz /product/create payload that copies a product from one shop into another. Pure.
// The new SKU's SellerSku is "TW-<source SkuId>", which is how later syncs find the copy again.

const NOT_COPIED = new Set(['source', 'name_en', 'description_en'])
const SKU_FIELDS = ['package_weight', 'package_length', 'package_width', 'package_height', 'package_content']

export const sellerSkuFor = sourceSkuId => `TW-${sourceSkuId}`

// Daraz reads the sale times we send as UTC+8 and reports them back in Nepal time (UTC+5:45),
// so a time must be sent 2h15m later than the value we want to read back.
const WRITE_SHIFT_MS = 135 * 60 * 1000
export function saleTimeForWrite(nepalTime) {
  if (!nepalTime) return null
  const d = new Date(`${String(nepalTime).trim().replace(' ', 'T')}Z`)
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getTime() + WRITE_SHIFT_MS).toISOString().slice(0, 19).replace('T', ' ')
}

// `detail` is /product/item/get data from the source shop; `categoryAttrs` is that category's attribute list
// ([{ name, type: 'normal' | 'sku', mandatory, saleProp }]) as seen by the target shop.
export function buildCreatePayload(detail, categoryAttrs) {
  const known = new Map(categoryAttrs.map(a => [a.name, a]))
  const skus = (detail.skus ?? []).filter(s => s.Status === 'active' && Number(s.price) > 0)
  if (skus.length === 0) return null

  const attributes = {}
  for (const [key, value] of Object.entries(detail.attributes ?? {})) {
    if (NOT_COPIED.has(key) || value == null || value === '') continue
    if (known.get(key)?.type === 'normal') attributes[key] = value
  }

  const Sku = skus.map(s => {
    const out = { SellerSku: sellerSkuFor(s.SkuId), quantity: Number(s.quantity) || 0, price: Number(s.price) }
    const special = Number(s.special_price) || 0
    if (special > 0 && special < out.price) {
      out.special_price = special
      if (s.special_from_time) out.special_from_date = saleTimeForWrite(s.special_from_time)
      if (s.special_to_time) out.special_to_date = saleTimeForWrite(s.special_to_time)
    }
    for (const f of SKU_FIELDS) if (s[f] != null && s[f] !== '') out[f] = s[f]
    // Category-specific SKU attributes, including the sale properties that tell variants apart.
    for (const a of categoryAttrs) {
      if (a.type !== 'sku' || out[a.name] != null) continue
      const v = s.saleProp?.[a.name] ?? s[a.name]
      if (v != null && v !== '' && typeof v !== 'object') out[a.name] = v
    }
    if (s.Images?.length) out.Images = { Image: s.Images }
    return out
  })

  return {
    Request: {
      Product: {
        PrimaryCategory: String(detail.primary_category),
        Images: { Image: detail.images ?? [] },
        Attributes: attributes,
        Skus: { Sku },
      },
    },
  }
}

export function missingMandatory(payload, categoryAttrs) {
  const p = payload.Request.Product
  const lacking = new Set()
  for (const a of categoryAttrs.filter(a => a.mandatory)) {
    if (a.type === 'sku') { if (p.Skus.Sku.some(s => s[a.name] == null || s[a.name] === '')) lacking.add(a.name) }
    else if (p.Attributes[a.name] == null || p.Attributes[a.name] === '') lacking.add(a.name)
  }
  return [...lacking]
}
