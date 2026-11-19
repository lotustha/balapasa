// Creating one mirrored listing: shared by the one-off bulk copy and the daily mirror sync.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { darazGet, darazPost } from './api.mjs'
import { buildCreatePayload, missingMandatory } from './mirror-payload.mjs'

const CACHE = 'scripts/daraz/snapshots/category-attrs.json'
let catCache = null

async function categoryAttrs(id, targetToken) {
  catCache ??= existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {}
  if (!catCache[id] || catCache[id].some(a => a.options === undefined)) {
    const r = await darazGet('/category/attributes/get', { primary_category_id: id, language_code: 'en_US' }, { accessToken: targetToken })
    catCache[id] = (r.data ?? []).map(a => ({ name: a.name, type: a.attribute_type, mandatory: a.is_mandatory == 1, saleProp: a.is_sale_prop == 1, options: (a.options ?? []).map(o => o.name) }))
    mkdirSync('scripts/daraz/snapshots', { recursive: true })
    writeFileSync(CACHE, JSON.stringify(catCache))
  }
  return catCache[id]
}

// Returns { created: data } | { skipped: [missing attribute names] }. Throws when Daraz rejects the listing.
// Required fields the source lacks are filled only with neutral values: an explicit override, Daraz's own
// "Other" choice, or a package-contents line in the form the seller already uses.
export async function createMirror(sourceItemId, { sourceToken, targetToken, overrides = {}, dryRun = false }) {
  const detail = (await darazGet('/product/item/get', { item_id: String(sourceItemId) }, { accessToken: sourceToken })).data
  const attrs = await categoryAttrs(String(detail.primary_category), targetToken)
  const payload = buildCreatePayload(detail, attrs)
  if (!payload) return { skipped: ['active sku'] }

  const product = payload.Request.Product
  for (const name of missingMandatory(payload, attrs)) {
    const attr = attrs.find(a => a.name === name)
    const value = overrides[name] ?? (attr.options.includes('Other') ? 'Other' : name === 'package_content' ? `1 x ${product.Attributes.name}`.slice(0, 250) : null)
    if (value == null) continue
    if (attr.type === 'sku') for (const sku of product.Skus.Sku) sku[name] ??= value
    else product.Attributes[name] = value
  }
  const lacking = missingMandatory(payload, attrs)
  if (lacking.length) return { skipped: lacking }
  if (dryRun) return { created: null }

  const res = await darazPost('/product/create', { payload: JSON.stringify(payload) }, { accessToken: targetToken })
  return { created: res.data }
}
