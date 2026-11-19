/**
 * Snapshot the TrendWave Daraz catalog to scripts/daraz/snapshots/trendwave-<date>.json
 * Run: node scripts/daraz/fetch-catalog.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { darazGet, fetchProducts, fetchCategoryPaths } from './api.mjs'

const accessToken = process.env.DARAZ_ACCESS_TOKEN
if (!accessToken) throw new Error('DARAZ_ACCESS_TOKEN missing from environment')

const products = await fetchProducts(accessToken)
const paths = await fetchCategoryPaths(accessToken)
const names = new Map([...paths].map(([id, path]) => [id, path.at(-1)]))

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
writeFileSync('scripts/daraz/snapshots/category-paths.json', JSON.stringify(Object.fromEntries(paths)))

const byStatus = {}
for (const p of products) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1
console.log(`products: ${products.length} (${Object.entries(byStatus).map(([k, v]) => `${k} ${v}`).join(', ')})`)
console.log(`categories resolved: ${Object.keys(categories).length} / ${wanted.length}`)
if (unresolved.length) console.log(`unresolved category ids: ${unresolved.join(', ')}`)
console.log(`wrote ${file}`)
