/**
 * Snapshot the TrendWave Daraz catalog to scripts/daraz/snapshots/trendwave-<date>.json
 * Run: node scripts/daraz/fetch-catalog.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { darazGet } from './api.mjs'

const accessToken = process.env.DARAZ_ACCESS_TOKEN
if (!accessToken) throw new Error('DARAZ_ACCESS_TOKEN missing from environment')

const PAGE = 50
const products = []
for (let offset = 0; ; offset += PAGE) {
  const res = await darazGet('/products/get', { filter: 'all', limit: String(PAGE), offset: String(offset) }, { accessToken })
  const page = res.data?.products ?? []
  products.push(...page)
  if (page.length < PAGE) break
  await new Promise(r => setTimeout(r, 300))
}

const tree = await darazGet('/category/tree/get', { language_code: 'en_US' }, { accessToken })
const names = new Map()
const walk = nodes => { for (const n of nodes ?? []) { names.set(String(n.category_id), n.name); walk(n.children) } }
walk(tree.data)

const active = products.filter(p => p.status === 'Active')
const wanted = [...new Set(active.map(p => String(p.primary_category)))]
const categories = {}
const unresolved = []
for (const id of wanted) names.has(id) ? (categories[id] = names.get(id)) : unresolved.push(id)

const seller = await darazGet('/seller/get', {}, { accessToken })
const snapshot = { fetchedAt: new Date().toISOString(), sellerId: String(seller.data.seller_id), products, categories }

mkdirSync('scripts/daraz/snapshots', { recursive: true })
const file = `scripts/daraz/snapshots/trendwave-${snapshot.fetchedAt.slice(0, 10)}.json`
writeFileSync(file, JSON.stringify(snapshot))

const byStatus = {}
for (const p of products) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1
console.log(`products: ${products.length} (${Object.entries(byStatus).map(([k, v]) => `${k} ${v}`).join(', ')})`)
console.log(`categories resolved: ${Object.keys(categories).length} / ${wanted.length}`)
if (unresolved.length) console.log(`unresolved category ids: ${unresolved.join(', ')}`)
console.log(`wrote ${file}`)
