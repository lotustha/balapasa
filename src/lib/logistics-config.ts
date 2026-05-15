/**
 * Logistics config loader — reads from DB first, falls back to env vars.
 * Admins can update all values from the admin dashboard without touching .env.
 */
import { prisma } from './prisma'

export interface PathaoConfig {
  baseUrl:       string
  clientId:      string
  clientSecret:  string
  storeId:       string
  storeName:     string
  storePhone:    string
  storeAddress:  string
  storeLat:      number
  storeLng:      number
  isMock:        boolean
  isActive:      boolean
}

export interface PicknDropConfig {
  baseUrl:        string
  apiKey:         string
  apiSecret:      string
  pickupBranch:   string
  pickupArea:     string
  pickupLocation: string
  maxSurgeNpr:    number      // cap on surge passed through; 0 = no cap
  isActive:       boolean
}

// ── Module-level cache so we don't hit DB every request ───────────────────────
let _pathaoCache:  { data: PathaoConfig;    at: number } | null = null
let _pndCache:     { data: PicknDropConfig; at: number } | null = null
const TTL_MS = 30_000  // re-fetch from DB every 30 s

async function getRow(provider: string) {
  try {
    return await prisma.logisticsSettings.findUnique({ where: { provider } })
  } catch {
    return null  // DB unavailable
  }
}

// ── Pathao ────────────────────────────────────────────────────────────────────

export async function getPathaoConfig(): Promise<PathaoConfig> {
  if (_pathaoCache && Date.now() - _pathaoCache.at < TTL_MS) return _pathaoCache.data

  const row = await getRow('PATHAO')

  const cfg: PathaoConfig = {
    // Pathao Nepal merchant API. Admin can override per environment.
    baseUrl:      row?.baseUrl      ?? 'https://api-hermes.pathao.com.np',
    clientId:     row?.clientId     ?? '',
    clientSecret: row?.clientSecret ?? '',
    storeId:      row?.storeId      ?? '',
    storeName:    row?.storeName    ?? 'Balapasa Store',
    storePhone:   row?.storePhone   ?? '',
    storeAddress: row?.storeAddress ?? 'Kathmandu, Nepal',
    storeLat:     row?.storeLat     ?? 27.7172,   // Kathmandu
    storeLng:     row?.storeLng     ?? 85.3240,
    // Mock defaults to true when no DB row exists so dev environments don't
    // hit Pathao with empty credentials.
    isMock:    row !== null ? row.isMock   : true,
    isActive:  row !== null ? row.isActive : true,
  }

  _pathaoCache = { data: cfg, at: Date.now() }
  return cfg
}

/** Call this after saving settings so the next request picks up fresh values */
export function invalidatePathaoCache() { _pathaoCache = null }

// ── Pick & Drop ────────────────────────────────────────────────────────────────

export async function getPicknDropConfig(): Promise<PicknDropConfig> {
  if (_pndCache && Date.now() - _pndCache.at < TTL_MS) return _pndCache.data

  const row = await getRow('PICKNDROP')

  const cfg: PicknDropConfig = {
    baseUrl:        row?.baseUrl        ?? 'https://app-t.pickndropnepal.com',
    apiKey:         row?.apiKey         ?? '',
    apiSecret:      row?.apiSecret      ?? '',
    pickupBranch:   row?.pickupBranch   ?? 'KATHMANDU VALLEY',
    pickupArea:     row?.pickupArea     ?? 'Kathmandu',
    pickupLocation: row?.pickupLocation ?? 'Balaju',
    maxSurgeNpr:    row?.maxSurgeNpr    ?? 0,
    isActive:       row !== null ? row.isActive : true,
  }

  _pndCache = { data: cfg, at: Date.now() }
  return cfg
}

export function invalidatePndCache() { _pndCache = null }

// ── Seed defaults (called once on first admin settings page load) ──────────────

export async function seedDefaultsIfMissing() {
  try {
    await prisma.logisticsSettings.upsert({
      where:  { provider: 'PATHAO' },
      update: {},
      create: {
        provider:     'PATHAO',
        isActive:     true,
        isMock:       true,            // safe default — won't call real Pathao until admin sets credentials
        clientId:     '',
        clientSecret: '',
        storeId:      '',
        storeName:    'Balapasa Store',
        storePhone:   '',
        storeAddress: 'Kathmandu, Nepal',
        storeLat:     27.7172,         // Kathmandu
        storeLng:     85.3240,
        baseUrl:      'https://api-hermes.pathao.com.np',   // Pathao Nepal
      },
    })
    await prisma.logisticsSettings.upsert({
      where:  { provider: 'PICKNDROP' },
      update: {},
      create: {
        provider:       'PICKNDROP',
        isActive:       false,         // disabled by default until admin adds credentials
        isMock:         false,
        apiKey:         '',
        apiSecret:      '',
        baseUrl:        'https://app-t.pickndropnepal.com',
        pickupBranch:   'KATHMANDU VALLEY',
        pickupArea:     'Kathmandu',
        pickupLocation: 'Balaju',
      },
    })
  } catch {
    // DB not available — no-op
  }
}
