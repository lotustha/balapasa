/**
 * Logistics config loader — reads from DB first, falls back to env vars.
 * Admins can update all values from the admin dashboard without touching .env.
 */
import { prisma } from './prisma'

// Per-provider parcel ceilings used to warn on the product form and hide an
// over-limit carrier on the order-assignment UI. Defaults reflect each
// carrier's real-world capacity; admins can override per provider.
export interface CarrierLimits {
  maxWeightKg: number
  maxLengthCm: number
  maxWidthCm:  number
  maxHeightCm: number
}

const PATHAO_LIMIT_DEFAULTS: CarrierLimits = { maxWeightKg: 25, maxLengthCm: 60,  maxWidthCm: 60, maxHeightCm: 60 }
const PND_LIMIT_DEFAULTS:    CarrierLimits = { maxWeightKg: 50, maxLengthCm: 120, maxWidthCm: 80, maxHeightCm: 80 }

export interface PathaoConfig extends CarrierLimits {
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

export interface PicknDropConfig extends CarrierLimits {
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
    maxWeightKg: row?.maxWeightKg ?? PATHAO_LIMIT_DEFAULTS.maxWeightKg,
    maxLengthCm: row?.maxLengthCm ?? PATHAO_LIMIT_DEFAULTS.maxLengthCm,
    maxWidthCm:  row?.maxWidthCm  ?? PATHAO_LIMIT_DEFAULTS.maxWidthCm,
    maxHeightCm: row?.maxHeightCm ?? PATHAO_LIMIT_DEFAULTS.maxHeightCm,
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

  // Env fallback (dev convenience). DB wins when set; env fills in any
  // empty field. Remove once the DB row is the canonical source on prod.
  const envBaseUrl        = process.env.PICKNDROP_BASE_URL        ?? ''
  const envApiKey         = process.env.PICKNDROP_API_KEY         ?? ''
  const envApiSecret      = process.env.PICKNDROP_API_SECRET      ?? ''
  const envPickupBranch   = process.env.PICKNDROP_PICKUP_BRANCH   ?? ''
  const envPickupArea     = process.env.PICKNDROP_PICKUP_AREA     ?? ''
  const envPickupLocation = process.env.PICKNDROP_PICKUP_LOCATION ?? ''

  const baseUrl    = (row?.baseUrl    && row.baseUrl.trim())    || envBaseUrl   || 'https://app-t.pickndropnepal.com'
  const apiKey     = (row?.apiKey     && row.apiKey.trim())     || envApiKey
  const apiSecret  = (row?.apiSecret  && row.apiSecret.trim())  || envApiSecret
  const pickupBranch   = (row?.pickupBranch   && row.pickupBranch.trim())   || envPickupBranch   || 'KATHMANDU VALLEY'
  const pickupArea     = (row?.pickupArea     && row.pickupArea.trim())     || envPickupArea     || 'Kathmandu'
  const pickupLocation = (row?.pickupLocation && row.pickupLocation.trim()) || envPickupLocation || 'Balaju'

  // Auto-activate when creds are present (DB or env). Explicit DB isActive=false
  // still wins so admins can disable without clearing credentials.
  const hasCreds  = Boolean(apiKey && apiSecret)
  const dbActive  = row?.isActive
  const isActive  = dbActive === false ? false : (dbActive === true || (row === null && hasCreds))

  const cfg: PicknDropConfig = {
    baseUrl,
    apiKey,
    apiSecret,
    pickupBranch,
    pickupArea,
    pickupLocation,
    maxSurgeNpr: row?.maxSurgeNpr ?? 0,
    isActive,
    maxWeightKg: row?.maxWeightKg ?? PND_LIMIT_DEFAULTS.maxWeightKg,
    maxLengthCm: row?.maxLengthCm ?? PND_LIMIT_DEFAULTS.maxLengthCm,
    maxWidthCm:  row?.maxWidthCm  ?? PND_LIMIT_DEFAULTS.maxWidthCm,
    maxHeightCm: row?.maxHeightCm ?? PND_LIMIT_DEFAULTS.maxHeightCm,
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
        maxWeightKg:  PATHAO_LIMIT_DEFAULTS.maxWeightKg,
        maxLengthCm:  PATHAO_LIMIT_DEFAULTS.maxLengthCm,
        maxWidthCm:   PATHAO_LIMIT_DEFAULTS.maxWidthCm,
        maxHeightCm:  PATHAO_LIMIT_DEFAULTS.maxHeightCm,
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
        maxWeightKg:    PND_LIMIT_DEFAULTS.maxWeightKg,
        maxLengthCm:    PND_LIMIT_DEFAULTS.maxLengthCm,
        maxWidthCm:     PND_LIMIT_DEFAULTS.maxWidthCm,
        maxHeightCm:    PND_LIMIT_DEFAULTS.maxHeightCm,
      },
    })
  } catch {
    // DB not available — no-op
  }
}
