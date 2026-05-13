import 'server-only'

// ── Nominatim proxy with in-memory cache + rate limiter ──────────────────
// OSM's usage policy explicitly bans direct browser calls at any real scale.
// We proxy here from the server with:
//   1. Honest User-Agent (their policy requires one)
//   2. In-memory LRU cache (24h TTL) — most repeat queries never reach Nominatim
//   3. Token-bucket rate limiter (1 req/sec global cap — their published policy)

const UA = process.env.NOMINATIM_USER_AGENT
  ?? `Balapasa/1.0 (contact@${process.env.RESEND_FROM ? process.env.RESEND_FROM.split('@')[1]?.replace(/[>\s]+$/, '') ?? 'balapasa.com' : 'balapasa.com'})`

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const CACHE_TTL_MS   = 24 * 60 * 60 * 1000  // 24 hours
const CACHE_MAX      = 500                  // LRU cap

interface CacheEntry { value: unknown; expires: number }

const cache = new Map<string, CacheEntry>()

function cacheGet<T>(key: string): T | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (hit.expires < Date.now()) { cache.delete(key); return null }
  // Touch for LRU semantics
  cache.delete(key); cache.set(key, hit)
  return hit.value as T
}

function cacheSet(key: string, value: unknown) {
  if (cache.size >= CACHE_MAX) {
    // Evict oldest (first key in insertion order)
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS })
}

// Rate limit: 1 request per second sustained (Nominatim policy). We queue
// outgoing requests with a simple last-call timestamp.
let lastCallMs = 0
async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now()
  const gap = now - lastCallMs
  if (gap < 1000) await new Promise(r => setTimeout(r, 1000 - gap))
  lastCallMs = Date.now()
  return fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } })
}

export interface GeoSearchResult {
  name:        string
  displayName: string
  lat:         number
  lon:         number
}

export async function geocodeSearch(args: { q: string; municipality?: string; limit?: number }): Promise<GeoSearchResult[]> {
  const limit = Math.min(Math.max(args.limit ?? 7, 1), 20)
  const query = args.municipality
    ? `${args.q.trim()}, ${args.municipality}, Nepal`
    : `${args.q.trim()}, Nepal`
  const cacheKey = `s:${query.toLowerCase()}|${limit}`

  const cached = cacheGet<GeoSearchResult[]>(cacheKey)
  if (cached) return cached

  const params = new URLSearchParams({
    q:                 query,
    countrycodes:      'np',
    format:            'json',
    limit:             String(limit),
    addressdetails:    '0',
    namedetails:       '1',
    'accept-language': 'en',
  })

  const res = await rateLimitedFetch(`${NOMINATIM_BASE}/search?${params}`)
  if (!res.ok) {
    // 503/429 = back off; cache an empty result briefly to avoid hammering
    if (res.status === 503 || res.status === 429) {
      cacheSet(cacheKey, [] as GeoSearchResult[])
    }
    return []
  }

  const data = await res.json() as Array<{
    name?: string
    display_name: string
    lat: string
    lon: string
  }>

  const out: GeoSearchResult[] = data
    .map(d => ({
      name:        (d.name || d.display_name.split(',')[0] || '').trim(),
      displayName: d.display_name,
      lat:         Number(d.lat),
      lon:         Number(d.lon),
    }))
    .filter(d => d.name.length > 1 && Number.isFinite(d.lat) && Number.isFinite(d.lon))

  cacheSet(cacheKey, out)
  return out
}

export interface GeoReverseResult {
  displayName:  string
  road?:        string
  suburb?:      string  // often the "tole" equivalent
  neighbourhood?: string
  city?:        string
  district?:    string
  state?:       string  // province
  postcode?:    string
  lat:          number
  lon:          number
}

export async function geocodeReverse(args: { lat: number; lon: number }): Promise<GeoReverseResult | null> {
  const lat = args.lat.toFixed(6)
  const lon = args.lon.toFixed(6)
  const cacheKey = `r:${lat},${lon}`

  const cached = cacheGet<GeoReverseResult>(cacheKey)
  if (cached) return cached

  const params = new URLSearchParams({
    lat,
    lon,
    format:            'json',
    addressdetails:    '1',
    zoom:              '18',
    'accept-language': 'en',
  })

  const res = await rateLimitedFetch(`${NOMINATIM_BASE}/reverse?${params}`)
  if (!res.ok) return null

  const data = await res.json() as {
    display_name?: string
    address?: {
      road?: string; pedestrian?: string; footway?: string
      suburb?: string; neighbourhood?: string; quarter?: string
      city?: string; town?: string; village?: string; municipality?: string
      county?: string; state_district?: string
      state?: string; province?: string
      postcode?: string
    }
    lat?: string
    lon?: string
  }

  if (!data?.address) return null

  const a = data.address
  const result: GeoReverseResult = {
    displayName:   data.display_name ?? '',
    road:          a.road ?? a.pedestrian ?? a.footway,
    suburb:        a.suburb ?? a.neighbourhood ?? a.quarter,
    neighbourhood: a.neighbourhood,
    city:          a.city ?? a.town ?? a.village ?? a.municipality,
    district:      a.county ?? a.state_district,
    state:         a.state ?? a.province,
    postcode:      a.postcode,
    lat:           Number(data.lat ?? args.lat),
    lon:           Number(data.lon ?? args.lon),
  }

  cacheSet(cacheKey, result)
  return result
}
