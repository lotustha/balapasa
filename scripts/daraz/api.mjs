import { createHmac } from 'node:crypto'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const BASE_URL = 'https://api.daraz.com.np/rest'

export function sign(apiPath, params, secret) {
  const base = apiPath + Object.keys(params).sort().map(k => k + params[k]).join('')
  return createHmac('sha256', secret).update(base).digest('hex').toUpperCase()
}

const RATE_LIMIT_DELAYS_MS = [1500, 3000, 6000, 12000]

// Daraz answers bursts with ApiCallLimit and a ban of a second or so; wait and try again.
export async function retrying(fn, { delays = RATE_LIMIT_DELAYS_MS, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (!/ApiCallLimit/.test(err.message) || attempt >= delays.length) throw err
      await sleep(delays[attempt])
    }
  }
}

export function darazGet(apiPath, params = {}, opts = {}) {
  return retrying(() => darazCall('GET', apiPath, params, opts))
}

// The token endpoints only accept POST.
export function darazPost(apiPath, params = {}, opts = {}) {
  return retrying(() => darazCall('POST', apiPath, params, opts))
}

async function darazCall(method, apiPath, params, opts) {
  const appKey = process.env.DARAZ_APP_KEY
  const secret = process.env.DARAZ_APP_SECRET
  if (!appKey || !secret) throw new Error('DARAZ_APP_KEY / DARAZ_APP_SECRET missing from environment')

  const all = { ...params, app_key: appKey, timestamp: String(Date.now()), sign_method: 'sha256' }
  if (opts.accessToken) all.access_token = opts.accessToken
  all.sign = sign(apiPath, all, secret)

  const res = method === 'POST'
    ? await fetch(`${BASE_URL}${apiPath}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body: new URLSearchParams(all) })
    : await fetch(`${BASE_URL}${apiPath}?${new URLSearchParams(all)}`)
  if (!res.ok) throw new Error(`Daraz ${apiPath}: HTTP ${res.status}`)
  const body = await res.json()
  if (body.code !== '0') throw new Error(`Daraz ${apiPath}: ${body.code} ${body.message ?? ''}`.trim())
  return body
}

const PAGE = 50

export async function fetchProducts(accessToken, { get = darazGet, pause = 300 } = {}) {
  const byId = new Map()
  let total = NaN
  for (let offset = 0; ; ) {
    const res = await get('/products/get', { filter: 'all', limit: String(PAGE), offset: String(offset) }, { accessToken })
    const page = res.data?.products ?? []
    total = Number(res.data?.total_products)
    for (const p of page) byId.set(String(p.item_id), p)
    offset += PAGE
    if (page.length === 0) break
    if (Number.isFinite(total) ? offset >= total : page.length < PAGE) break
    if (pause) await new Promise(r => setTimeout(r, pause))
  }
  // A short page mid-catalogue would otherwise look like hundreds of delisted products.
  if (Number.isFinite(total) && byId.size < total) throw new Error(`Daraz /products/get: expected ${total} products, got ${byId.size}`)
  return [...byId.values()]
}

// Daraz category id → names from the top level down to that category.
export async function fetchCategoryPaths(accessToken) {
  const tree = await darazGet('/category/tree/get', { language_code: 'en_US' }, { accessToken })
  const paths = new Map()
  const walk = (nodes, trail) => { for (const n of nodes ?? []) { const p = [...trail, n.name]; paths.set(String(n.category_id), p); walk(n.children, p) } }
  walk(tree.data, [])
  return paths
}
