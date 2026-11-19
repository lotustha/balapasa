import { createHmac } from 'node:crypto'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const BASE_URL = 'https://api.daraz.com.np/rest'

export function sign(apiPath, params, secret) {
  const base = apiPath + Object.keys(params).sort().map(k => k + params[k]).join('')
  return createHmac('sha256', secret).update(base).digest('hex').toUpperCase()
}

export async function darazGet(apiPath, params = {}, opts = {}) {
  const appKey = process.env.DARAZ_APP_KEY
  const secret = process.env.DARAZ_APP_SECRET
  if (!appKey || !secret) throw new Error('DARAZ_APP_KEY / DARAZ_APP_SECRET missing from environment')

  const all = { ...params, app_key: appKey, timestamp: String(Date.now()), sign_method: 'sha256' }
  if (opts.accessToken) all.access_token = opts.accessToken
  all.sign = sign(apiPath, all, secret)

  const res = await fetch(`${BASE_URL}${apiPath}?${new URLSearchParams(all)}`)
  if (!res.ok) throw new Error(`Daraz ${apiPath}: HTTP ${res.status}`)
  const body = await res.json()
  if (body.code !== '0') throw new Error(`Daraz ${apiPath}: ${body.code} ${body.message ?? ''}`.trim())
  return body
}

const PAGE = 50

export async function fetchProducts(accessToken) {
  const products = []
  for (let offset = 0; ; offset += PAGE) {
    const res = await darazGet('/products/get', { filter: 'all', limit: String(PAGE), offset: String(offset) }, { accessToken })
    const page = res.data?.products ?? []
    products.push(...page)
    if (page.length < PAGE) return products
    await new Promise(r => setTimeout(r, 300))
  }
}

// Daraz category id → names from the top level down to that category.
export async function fetchCategoryPaths(accessToken) {
  const tree = await darazGet('/category/tree/get', { language_code: 'en_US' }, { accessToken })
  const paths = new Map()
  const walk = (nodes, trail) => { for (const n of nodes ?? []) { const p = [...trail, n.name]; paths.set(String(n.category_id), p); walk(n.children, p) } }
  walk(tree.data, [])
  return paths
}
