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
    baseUrl:      row?.baseUrl      ?? process.env.PATHAO_BASE_URL      ?? 'https://enterprise-api.pathao.com',
    clientId:     row?.clientId     ?? process.env.PATHAO_CLIENT_ID     ?? 'dev_5e5612b011f438ca5b30a2d6',
    clientSecret: row?.clientSecret ?? process.env.PATHAO_CLIENT_SECRET ?? 'F62z4qB1IazJzzgMYhKyBpdRWWRoAiikbQdR-SDrYdI',
    storeId:      row?.storeId      ?? process.env.PATHAO_STORE_ID      ?? 'MROQI3O9',
    storeName:    row?.storeName    ?? process.env.PATHAO_PICKUP_NAME   ?? 'Balapasa Store',
    storePhone:   row?.storePhone   ?? process.env.PATHAO_PICKUP_PHONE  ?? '01772793058',
    storeAddress: row?.storeAddress ?? process.env.PATHAO_PICKUP_ADDRESS ?? 'Concord Silvy Height, 73/A, Gulshan 1',
    storeLat:     row?.storeLat     ?? parseFloat(process.env.PATHAO_PICKUP_LAT ?? '23.784519208568934'),
    storeLng:     row?.storeLng     ?? parseFloat(process.env.PATHAO_PICKUP_LNG ?? '90.4169082847168'),
    // Mock: DB row wins, then env var, then default true (safe for dev)
    isMock:    row !== null ? row.isMock   : (process.env.PATHAO_MOCK === 'true'),
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
    baseUrl:        row?.baseUrl        ?? process.env.PICKNDROP_BASE_URL        ?? 'https://app-t.pickndropnepal.com',
    apiKey:         row?.apiKey         ?? process.env.PICKNDROP_API_KEY         ?? 'bf1a7ce75dacf51',
    apiSecret:      row?.apiSecret      ?? process.env.PICKNDROP_API_SECRET      ?? '63b8931e70aee27',
    pickupBranch:   row?.pickupBranch   ?? process.env.PICKNDROP_PICKUP_BRANCH   ?? 'KATHMANDU VALLEY',
    pickupArea:     row?.pickupArea     ?? process.env.PICKNDROP_PICKUP_AREA     ?? 'Kathmandu',
    pickupLocation: row?.pickupLocation ?? process.env.PICKNDROP_PICKUP_LOCATION ?? 'Balaju',
    maxSurgeNpr:    row?.maxSurgeNpr ?? Number(process.env.PICKNDROP_MAX_SURGE_NPR ?? 0),
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
        isMock:       true,
        clientId:     process.env.PATHAO_CLIENT_ID     ?? 'dev_5e5612b011f438ca5b30a2d6',
        clientSecret: process.env.PATHAO_CLIENT_SECRET ?? 'F62z4qB1IazJzzgMYhKyBpdRWWRoAiikbQdR-SDrYdI',
        storeId:      process.env.PATHAO_STORE_ID      ?? 'MROQI3O9',
        storeName:    process.env.PATHAO_PICKUP_NAME   ?? 'Balapasa Store',
        storePhone:   process.env.PATHAO_PICKUP_PHONE  ?? '01772793058',
        storeAddress: process.env.PATHAO_PICKUP_ADDRESS ?? 'Concord Silvy Height, 73/A, Gulshan 1',
        storeLat:     parseFloat(process.env.PATHAO_PICKUP_LAT ?? '23.784519208568934'),
        storeLng:     parseFloat(process.env.PATHAO_PICKUP_LNG ?? '90.4169082847168'),
        baseUrl:      process.env.PATHAO_BASE_URL ?? 'https://enterprise-api.pathao.com',
      },
    })
    await prisma.logisticsSettings.upsert({
      where:  { provider: 'PICKNDROP' },
      update: {},
      create: {
        provider:       'PICKNDROP',
        isActive:       true,
        isMock:         false,
        apiKey:         process.env.PICKNDROP_API_KEY         ?? 'bf1a7ce75dacf51',
        apiSecret:      process.env.PICKNDROP_API_SECRET      ?? '63b8931e70aee27',
        baseUrl:        process.env.PICKNDROP_BASE_URL        ?? 'https://app-t.pickndropnepal.com',
        pickupBranch:   process.env.PICKNDROP_PICKUP_BRANCH   ?? 'KATHMANDU VALLEY',
        pickupArea:     process.env.PICKNDROP_PICKUP_AREA     ?? 'Kathmandu',
        pickupLocation: process.env.PICKNDROP_PICKUP_LOCATION ?? 'Balaju',
      },
    })
  } catch {
    // DB not available — no-op
  }
}
