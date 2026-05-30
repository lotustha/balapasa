// Pick & Drop Nepal client — wraps the logi360.api.* endpoints documented at
// the apidog spec (site 755693). Field names below match the live API exactly
// (camelCase for create_order, snake_case for query/rate endpoints).
//
// Configuration (baseUrl, auth, pickup branch/area/location) is loaded per call
// via getPicknDropConfig() so admin saves take effect without a restart.

import { getPicknDropConfig } from '@/lib/logistics-config'
import { matchBranchForAddress, rankBranches, normPnd } from '@/lib/pndBranchMatch'

// Default package dims/weight when caller doesn't supply them. PnD rate is
// usually weight-zone driven, so a sensible mid-sized box (10×10×10 cm @ 1 kg)
// gives a representative estimate without under-billing tiny accessories.
const DEFAULT_PKG = { lengthCm: 10, widthCm: 10, heightCm: 10, weightKg: 1 }

function authHeader(apiKey: string, apiSecret: string) { return `token ${apiKey}:${apiSecret}` }

// ── Branches ──────────────────────────────────────────────────────────────────

export interface PndBranch {
  name: string
  branch_name: string
  branch_code: string
  area: string[]
  status: string
  branch_type: string
}

let branchCache: PndBranch[] | null = null
let branchCacheAt = 0

export async function getBranches(force = false): Promise<PndBranch[]> {
  if (!force && branchCache && Date.now() - branchCacheAt < 3_600_000) return branchCache
  try {
    const cfg = await getPicknDropConfig()
    const res = await fetch(`${cfg.baseUrl}/api/method/logi360.api.get_branches`, {
      headers: { Authorization: authHeader(cfg.apiKey, cfg.apiSecret), 'Content-Type': 'application/json' },
      next: { revalidate: 3600 },
    })
    const json = await res.json()
    const branches: PndBranch[] = json?.message?.data?.branches ?? []
    branchCache = branches
    branchCacheAt = Date.now()
    return branches
  } catch {
    return branchCache ?? []
  }
}

// Bust branch cache when admin changes baseUrl/credentials
export function invalidatePndBranchCache() { branchCache = null; branchCacheAt = 0 }

// Reverse-lookup: customer's city/area → which branch covers it.
// PnD branches list a coverage `area[]` (e.g. ["Lalitpur Valley", "Kupantool"]).
// We match against the branch.name AND every entry in area[].
export async function resolveBranchForArea(cityOrArea: string): Promise<PndBranch | null> {
  if (!cityOrArea) return null
  const needle = norm(cityOrArea)
  const branches = await getBranches()
  for (const b of branches) {
    if (b.status !== 'Active') continue
    if (norm(b.branch_name) === needle || norm(b.name) === needle) return b
    if (b.area.some(a => norm(a) === needle || norm(a).includes(needle) || needle.includes(norm(a)))) return b
  }
  return null
}

function norm(s: string) { return s.toLowerCase().replace(/\s+/g, '') }

// Multi-atom branch resolver — mirrors the scoring match used by checkout's
// coverage endpoint so an order that successfully quoted a PnD rate can always
// be dispatched to the same branch. The single-atom resolveBranchForArea()
// above fails for valley addresses whose `city` is just "Kathmandu" (no branch
// is named that, nor lists it in area[]); this resolver scores the full address
// (Sitapaila → Kalanki, etc.).
//
// Returns the best branch *only* when it clears `minScore` (an exact area-token
// hit scores 5, an exact branch-name hit 10 — so a floor of 3 keeps real
// matches while rejecting weak single-substring noise that could mis-route a
// parcel). When nothing clears the floor, `branch` is null and `candidates`
// holds ranked suggestions for an admin to pick from.
export async function resolveBranchForAddress(
  atoms: Array<string | null | undefined>,
  minScore = 3,
): Promise<{ branch: PndBranch | null; score: number; candidates: PndBranch[] }> {
  const clean = atoms.filter((s): s is string => typeof s === 'string' && !!s.trim())
  const active = (await getBranches()).filter(b => b.status === 'Active')
  if (clean.length === 0 || active.length === 0) return { branch: null, score: 0, candidates: [] }

  const m = matchBranchForAddress(active, clean)
  if (m && m.score >= minScore) return { branch: m.branch, score: m.score, candidates: [m.branch] }

  const candidates = rankBranches(active, clean.join(' '), 5)
  return { branch: null, score: m?.score ?? 0, candidates }
}

// Tokenise a free-text address string ("Sitapaila marga, Nagarjun, Kathmandu")
// into matching atoms. Used when only the flattened Order.address is available
// (the structured province/district/municipality atoms aren't persisted on the
// Order row, only on the Address table).
export function addressAtoms(address?: string | null, city?: string | null): string[] {
  const out: string[] = []
  if (address) for (const piece of address.split(/[,/]/)) { const p = piece.trim(); if (p) out.push(p) }
  if (city && city.trim()) out.push(city.trim())
  return out
}

// Maps municipality names to the PnD branch/district name used as
// `destination_branch` in the create_order API call. Valley municipalities map
// to their parent district (Kirtipur → "Kathmandu", Godawari → "Lalitpur",
// etc.) so the branch matcher finds the right pick-up hub. All other cities are
// returned capitalised as-is — PnD typically names branches after the city
// (e.g. "Biratnagar", "Pokhara", "Butwal").
const _KTM_MUNI = new Set([
  'kathmandu','kirtipur','nagarjun','tokha','budhanilkantha','tarakeshwor',
  'shankharapur','gokarneshwor','kageshworimanohara','chandragiri','dakshinkali',
])
const _LAL_MUNI = new Set(['lalitpur','godawari','mahalaxmi','bagmati'])
const _BHK_MUNI = new Set(['bhaktapur','madhyapurthimi','suryabinayak','changunarayan'])

export function cityToDistrict(city: string): string {
  const key = city.toLowerCase().replace(/[\s-_]/g, '')
  if (_KTM_MUNI.has(key)) return 'Kathmandu'
  if (_LAL_MUNI.has(key)) return 'Lalitpur'
  if (_BHK_MUNI.has(key)) return 'Bhaktapur'
  return city.charAt(0).toUpperCase() + city.slice(1)
}

// ── Live delivery rate ────────────────────────────────────────────────────────

export interface PndRateInput {
  destinationBranch: string             // PnD branch name (e.g. "Lalitpur")
  cityArea:          string             // customer's city/area free text
  location?:         string             // customer's neighbourhood (location field)
  pickupBranch?:     string             // defaults to config.pickupBranch
  weightKg?:         number             // default 1
  lengthCm?:         number             // default 1
  widthCm?:          number             // default 1
  heightCm?:         number             // default 1
}

export interface PndRateResult {
  delivery_amount:    number
  surge_price:        number
  total_delivery_sum: number
}

const rateCache = new Map<string, { at: number; data: PndRateResult }>()
const RATE_TTL = 60 * 60 * 1000   // 1h

export async function getDeliveryRate(input: PndRateInput): Promise<PndRateResult> {
  const cfg    = await getPicknDropConfig()
  const pickup = input.pickupBranch ?? cfg.pickupBranch
  const length = input.lengthCm ?? DEFAULT_PKG.lengthCm
  const width  = input.widthCm  ?? DEFAULT_PKG.widthCm
  const height = input.heightCm ?? DEFAULT_PKG.heightCm
  const weight = input.weightKg ?? DEFAULT_PKG.weightKg
  const dims   = `${length}x${width}x${height}@${weight}`
  const key    = `${pickup}|${input.destinationBranch}|${input.cityArea}|${input.location ?? ''}|${dims}`

  const hit = rateCache.get(key)
  if (hit && Date.now() - hit.at < RATE_TTL) return hit.data

  const res = await fetch(`${cfg.baseUrl}/api/method/logi360.api.get_delivery_rate`, {
    method: 'POST',   // OAS marks GET but the real endpoint accepts POST with JSON body
    headers: { Authorization: authHeader(cfg.apiKey, cfg.apiSecret), 'Content-Type': 'application/json', Accept: '*/*' },
    body: JSON.stringify({
      pickup_branch:      pickup,
      destination_branch: input.destinationBranch,
      // Per PnD, `location` and `city_area` describe the destination drop-off
      // context (customer's street/road and tole). Fall back to vendor pickup
      // config only when the caller didn't supply either.
      location:           input.location  ?? cfg.pickupLocation,
      city_area:          input.cityArea  ?? cfg.pickupArea,
      package_width:      width,
      package_height:     height,
      package_length:     length,
      package_weight:     weight,
      size_uom:           'cm',
      weight_uom:         'kg',
    }),
  })
  if (!res.ok) throw new Error(`PnD rate ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = await res.json()
  const msg  = json?.message ?? {}
  const data: PndRateResult = {
    delivery_amount:    Number(msg?.data?.delivery_amount ?? 0),
    surge_price:        Number(msg?.surge_price ?? 0),
    total_delivery_sum: Number(msg?.total_delivery_sum ?? msg?.data?.delivery_amount ?? 0),
  }
  // Visibility: when a quote looks wrong (e.g. 250 for Pokhara when the base is
  // 150), this line in the server log shows exactly which server answered and
  // how the number breaks down — base vs surge vs the test env (app-t.*) which
  // zeroes surge. Without it the rate is a black box.
  console.info('[pnd] rate', {
    baseUrl: cfg.baseUrl,
    pickup, destinationBranch: input.destinationBranch,
    cityArea: input.cityArea, location: input.location ?? cfg.pickupLocation, dims,
    delivery_amount: data.delivery_amount,
    surge_price: data.surge_price,
    total_delivery_sum: data.total_delivery_sum,
  })
  rateCache.set(key, { at: Date.now(), data })
  return data
}

export function invalidatePndRateCache() { rateCache.clear() }

// ── Quote builder for the checkout UI ────────────────────────────────────────

export interface PndServiceOption {
  id: string
  provider: 'PICKNDROP'
  name: string
  type: 'STANDARD'
  charge: number
  charge_after_discount: number
  discount: number
  dropoff_eta: number   // seconds
  distance: number
  zone: string          // branch name (replaces old SAME/NEAR/etc tier label)
  meta: { destinationBranch: string; surgePrice: number }
}

// Resolves the destination branch from the customer's address (multi-atom
// match against each branch's area[] tokens — highest overlap wins), then
// asks PnD for the live delivery rate. Falls back to a hand-tuned matrix if
// the API call fails so checkout never breaks.
//
// `opts.destinationAtoms` — list of customer address fragments (province,
//    district, municipality, ward, street, tole, landmark). Used for branch
//    matching. The toCity string is folded into this list as a fallback.
// `opts.destinationBranchOverride` — explicit branch name (skips matching).
// `opts.location` / `opts.cityArea` — strings sent in the rate-API body's
//    `location` and `city_area` fields. Per integration spec these carry the
//    customer's street/road and tole respectively.
export async function calculatePndRates(
  _fromCity: string,
  toCity: string,
  opts?: {
    weightKg?: number; lengthCm?: number; widthCm?: number; heightCm?: number
    location?: string
    cityArea?: string
    destinationAtoms?: string[]
    destinationBranchOverride?: string
  },
): Promise<PndServiceOption[]> {
  let branchName = ''
  let charge     = 0
  let surge      = 0
  let zoneLabel  = ''

  let branchAreas: string[] = []

  try {
    const cfg    = await getPicknDropConfig()
    const isTest = /app-t\.pickndropnepal\.com/i.test(cfg.baseUrl)
    let branch: PndBranch | null = null

    if (opts?.destinationBranchOverride) {
      const all = await getBranches()
      const needle = normPnd(opts.destinationBranchOverride)
      branch = all.find(b => b.status === 'Active' && normPnd(b.branch_name) === needle) ?? null
    }

    if (!branch && opts?.destinationAtoms && opts.destinationAtoms.length > 0) {
      const all = await getBranches()
      const active = all.filter(b => b.status === 'Active')
      const atoms = [...opts.destinationAtoms, toCity].filter(Boolean)
      const m = matchBranchForAddress(active, atoms)
      branch = m?.branch ?? null
    }

    if (!branch) branch = await resolveBranchForArea(toCity)

    if (branch) {
      branchName  = branch.branch_name
      branchAreas = branch.area ?? []
      const rate = await getDeliveryRate({
        destinationBranch: branchName,
        cityArea:  opts?.cityArea ?? toCity,
        location:  opts?.location,
        weightKg:  opts?.weightKg,
        lengthCm:  opts?.lengthCm,
        widthCm:   opts?.widthCm,
        heightCm:  opts?.heightCm,
      })
      // Test env (app-t.*): drop surge — the test API returns synthetic surge
      // on every request (e.g. 100 + 69 = 169 for KTM→KTM), which doesn't
      // reflect actual peak-traffic conditions. Production: pass real surge through.
      const liveSurge = isTest ? 0 : rate.surge_price
      // Base = delivery_amount. The API's total_delivery_sum already INCLUDES
      // surge, so when delivery_amount is missing we must subtract surge back
      // out before re-adding it — otherwise surge double-counts.
      const base = rate.delivery_amount || Math.max(0, rate.total_delivery_sum - rate.surge_price)
      charge    = base + liveSurge
      surge     = liveSurge
      zoneLabel = branchName
    }
  } catch {
    // fall through to fallback below
  }

  // Fallback: hand-tuned matrix when API/branch lookup fails
  if (!charge) {
    const fb = fallbackRate(toCity)
    charge    = fb.charge
    zoneLabel = fb.zone
    branchName = fb.branchHint
  }

  // ETA bands (seconds) — PnD doesn't return ETA from rate endpoint; we infer
  // from branch (KTM Valley = same-day, Terai/Mid = 1-2d, Far = 3d).
  // Real PnD branch names don't always contain the city (e.g. "Capital" covers
  // Kathmandu via its area[] list), so we feed both name and areas + the
  // customer's typed city into the matcher.
  const eta = etaFor(zoneLabel, branchAreas, toCity)

  return [{
    id: `pnd-standard-${norm(zoneLabel)}`,
    provider: 'PICKNDROP',
    name: 'Pick & Drop',
    type: 'STANDARD',
    charge,
    charge_after_discount: charge,
    discount: 0,
    dropoff_eta: eta,
    distance: 0,
    zone: zoneLabel,
    meta: { destinationBranch: branchName, surgePrice: surge },
  }]
}

// ── Fallback pricing (used only when live API unavailable) ────────────────────
// Hand-tuned tiers verified against owner-provided lane prices. Kept as a
// safety net so checkout works in dev without credentials.

type Zone = 'SAME' | 'NEAR' | 'TERAI' | 'MID' | 'FAR'
const STANDARD_RATE: Record<Zone, number> = { SAME: 100, NEAR: 150, TERAI: 170, MID: 200, FAR: 250 }
const ETA_SECS:      Record<Zone, number> = { SAME: 28800, NEAR: 86400, TERAI: 172800, MID: 172800, FAR: 259200 }

const TERAI_HINT = new Set([
  'morang','biratnagar','sunsari','itahari','dharan','inaruwa','jhapa','birtamod','damak','mechinagar',
  'parsa','birgunj','bara','kalaiya','rupandehi','bhairahawa','siddharthanagar','butwal',
])
const KTM_VALLEY = new Set(['kathmandu','lalitpur','bhaktapur'])
const MID_HINT   = new Set(['pokhara','kaski','chitwan','bharatpur'])

function fallbackRate(toCity: string): { charge: number; zone: string; branchHint: string } {
  const c = toCity.toLowerCase().replace(/\s+/g, '')
  let zone: Zone = 'FAR'
  let hint = 'KATHMANDU VALLEY'
  if (KTM_VALLEY.has(c))      { zone = 'SAME';  hint = 'KATHMANDU VALLEY' }
  else if (TERAI_HINT.has(c)) { zone = 'TERAI'; hint = 'BIRATNAGAR' }
  else if (MID_HINT.has(c))   { zone = 'MID';   hint = 'POKHARA' }
  return { charge: STANDARD_RATE[zone], zone, branchHint: hint }
}

function etaFor(branchOrZone: string, branchAreas: string[] = [], cityArea = ''): number {
  // Combine every signal we have about the destination — branch name plus its
  // coverage area list plus the customer's typed city — so a branch named
  // "Capital" with area ["Kathmandu", "Lalitpur"] still resolves to SAME.
  const haystack = [branchOrZone, ...branchAreas, cityArea].join(' ').toLowerCase()
  const compact  = haystack.replace(/\s+/g, '')
  if (/kathmandu|lalitpur|bhaktapur|kavre|sindhupalchok|nuwakot|kirtipur|gokarneshwar|budhanilkantha/.test(haystack)) return ETA_SECS.SAME
  if (/pokhara|chitwan|kaski|bharatpur/.test(haystack))                                                                return ETA_SECS.MID
  for (const t of TERAI_HINT) if (compact.includes(t))                                                                 return ETA_SECS.TERAI
  return ETA_SECS.FAR
}

// ── Order creation ────────────────────────────────────────────────────────────

export interface CreatePndOrderParams {
  // Required by API
  customerName:      string
  primaryMobileNo:   string             // 10 digits
  destinationBranch: string             // resolved branch name from getBranches/resolveBranchForArea
  codAmount:         number             // 0 if pre-paid; else product + delivery
  orderDescription:  string

  // Optional
  secondaryMobileNo?:   string
  destinationCityArea?: string
  landmark?:            string
  weightKg?:            number
  dimWeight?:           { lengthCm: number; widthCm: number; heightCm: number }
  instruction?:         string
  businessAddress?:     string          // only if vendor has multiple pickup addresses
  customerLatitude?:    number | string
  customerLongitude?:   number | string
  vendorTrackingNumber: string          // our internal order id (used as PnD reference)
  orderType?:           'Regular'
}

export interface PndOrderResult {
  trackingId:  string                   // PnD orderID e.g. "XGAC-17"
  trackingUrl: string
  charge:      number
  status:      string
  raw:         unknown
}

export async function createPndOrder(p: CreatePndOrderParams): Promise<PndOrderResult> {
  const cfg = await getPicknDropConfig()
  const body: Record<string, unknown> = {
    customerName:      p.customerName,
    primaryMobileNo:   p.primaryMobileNo,
    destinationBranch: p.destinationBranch,
    codAmount:         p.codAmount,
    orderDescription:  p.orderDescription,
    orderType:         p.orderType ?? 'Regular',
    vendorTrackingNumber: p.vendorTrackingNumber,
    ref:               'balapasa-ecommerce',
  }
  if (p.secondaryMobileNo)   body.secondaryMobileNo   = p.secondaryMobileNo
  if (p.destinationCityArea) body.destinationCityArea = p.destinationCityArea
  if (p.landmark)            body.landmark            = p.landmark
  if (p.weightKg)            body.weight              = p.weightKg
  if (p.instruction)         body.instruction         = p.instruction
  if (p.businessAddress)     body.businessAddress     = p.businessAddress
  if (p.customerLatitude  != null) body.customerLatitude  = String(p.customerLatitude)
  if (p.customerLongitude != null) body.customerLongitude = String(p.customerLongitude)
  if (p.dimWeight) {
    body.dimWeight = {
      length: p.dimWeight.lengthCm,
      width:  p.dimWeight.widthCm,
      height: p.dimWeight.heightCm,
      unit:   'cm',
    }
  }

  const res = await fetch(`${cfg.baseUrl}/api/method/logi360.api.create_order`, {
    method: 'POST',
    headers: { Authorization: authHeader(cfg.apiKey, cfg.apiSecret), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PnD create ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = await res.json()
  const msg  = json?.message ?? json
  const data = msg?.data ?? {}

  return {
    trackingId:  String(data?.orderID ?? data?.vendor_tracking_number ?? p.vendorTrackingNumber),
    trackingUrl: String(data?.tracking_url ?? `${cfg.baseUrl}/tracking/${data?.orderID ?? ''}`),
    charge:      Number(data?.delivery_charge ?? 0),
    status:      String(data?.status ?? 'Open'),
    raw:         json,
  }
}

// ── Order status / details ────────────────────────────────────────────────────

export interface PndOrderDetails {
  order_name:        string
  status:            string
  delivery_amount:   string
  cod_amount:        string
  customer_name:     string
  primary_mobile_no: string
  pickup_branch:     string
  destination_branch:string
  status_logs:       Array<{ timestamp: string; status: string; log?: string }>
  [key: string]: unknown
}

export async function getPndOrderDetails(orderId: string): Promise<PndOrderDetails | null> {
  if (!orderId) return null
  try {
    const cfg = await getPicknDropConfig()
    const url = `${cfg.baseUrl}/api/method/logi360.api.get_order_details?order_id=${encodeURIComponent(orderId)}`
    const res = await fetch(url, { headers: { Authorization: authHeader(cfg.apiKey, cfg.apiSecret) } })
    if (!res.ok) return null
    const json = await res.json()
    const msg  = json?.message ?? json
    const arr  = Array.isArray(msg?.data) ? msg.data : (msg?.data ? [msg.data] : [])
    return (arr[0] as PndOrderDetails) ?? null
  } catch {
    return null
  }
}

// Backward-compat alias for existing tracking.ts; thin wrapper that returns
// the same first-detail object getPndOrderDetails returns.
export const getPndOrderStatus = getPndOrderDetails

// ── Vendor business addresses (for dropdown when multiple pickup points) ─────

export interface PndBusinessAddresses { vendor_name: string; addresses: string[] }

export async function getBusinessAddresses(): Promise<PndBusinessAddresses | null> {
  try {
    const cfg = await getPicknDropConfig()
    const res = await fetch(`${cfg.baseUrl}/api/method/logi360.api.business_address`, {
      headers: { Authorization: authHeader(cfg.apiKey, cfg.apiSecret), 'Content-Type': 'application/json' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const json = await res.json()
    const data = json?.message?.data
    if (!data) return null
    return { vendor_name: String(data.vendor_name ?? ''), addresses: data.addresses ?? [] }
  } catch {
    return null
  }
}

// Variant that takes overrides — used during admin save before the new
// credentials have been flushed through getPicknDropConfig()'s 30s cache.
export async function fetchBusinessAddressesWithCreds(
  cfg: { baseUrl: string; apiKey: string; apiSecret: string },
): Promise<PndBusinessAddresses | null> {
  if (!cfg.apiKey || !cfg.apiSecret || !cfg.baseUrl) return null
  try {
    const res = await fetch(`${cfg.baseUrl}/api/method/logi360.api.business_address`, {
      headers: { Authorization: authHeader(cfg.apiKey, cfg.apiSecret), 'Content-Type': 'application/json' },
    })
    if (!res.ok) return null
    const json = await res.json()
    const data = json?.message?.data
    if (!data) return null
    return { vendor_name: String(data.vendor_name ?? ''), addresses: data.addresses ?? [] }
  } catch {
    return null
  }
}

// Same as the cached version of getBranches() but accepts overridden creds so
// the admin save flow can resolve a branch from freshly-saved API keys before
// the in-memory cache rotates.
export async function fetchBranchesWithCreds(
  cfg: { baseUrl: string; apiKey: string; apiSecret: string },
): Promise<PndBranch[]> {
  if (!cfg.apiKey || !cfg.apiSecret || !cfg.baseUrl) return []
  try {
    const res = await fetch(`${cfg.baseUrl}/api/method/logi360.api.get_branches`, {
      headers: { Authorization: authHeader(cfg.apiKey, cfg.apiSecret), 'Content-Type': 'application/json' },
    })
    if (!res.ok) return []
    const json = await res.json()
    return json?.message?.data?.branches ?? []
  } catch {
    return []
  }
}

// Parse a vendor address string into the three structured atoms PnD's rate
// API expects. The address is human-typed ("Balaju, Kathmandu") so we use the
// branch list as ground truth: any segment that matches a branch's area[] is
// our city_area; the branch covering it is the pickup_branch; the segment to
// the left (or the whole string before the matched area) is the location.
export function parseVendorAddress(
  address: string,
  branches: PndBranch[],
): { pickupBranch?: string; pickupArea?: string; pickupLocation?: string } {
  if (!address) return {}
  const segments = address.split(',').map(s => s.trim()).filter(Boolean)
  if (segments.length === 0) return {}

  // Walk segments right-to-left looking for a branch.area[] match — the area
  // is usually the city at the tail of the string (e.g. "..., Kathmandu").
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i]
    const segN = norm(seg)
    for (const b of branches) {
      if (b.status !== 'Active') continue
      const hit = b.area.some(a => norm(a) === segN || norm(a).includes(segN) || segN.includes(norm(a)))
        || norm(b.branch_name) === segN
      if (hit) {
        const before = segments.slice(0, i).join(', ').trim()
        return {
          pickupBranch:   b.branch_name,
          pickupArea:     seg,
          pickupLocation: before || seg,
        }
      }
    }
  }

  // No branch matched — best-effort split: last segment = area, rest = location.
  const area     = segments[segments.length - 1]
  const location = segments.slice(0, -1).join(', ') || area
  return { pickupArea: area, pickupLocation: location }
}
