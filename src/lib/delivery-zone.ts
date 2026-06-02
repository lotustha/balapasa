// Client-safe delivery-zone + ETA estimation for storefront UI (product page).
//
// This intentionally DUPLICATES the small zone sets + ETA bands that live in
// `src/lib/pickndrop.ts` (etaFor / ETA_SECS / fallbackRate). Reasons:
//   1. pickndrop.ts is a server module (live PnD API, Frappe auth) — importing
//      it into a client component would pull server-only code into the bundle.
//   2. That file was stabilized in production recently; an estimate shown on a
//      product page must never be able to regress real dispatch.
// The estimate here is derived from the SAME zone bands the logistics lib uses,
// so it stays truthful without a live rate-API call (which costs money per view
// and needs full address atoms). The real rate + ETA is computed at checkout.
// If you change the zone bands in pickndrop.ts, mirror them here.

export type DeliveryZone = 'SAME' | 'MID' | 'TERAI' | 'FAR'

// 2 PM Asia/Kathmandu — legacy same-day cut-off (kept for back-compat).
export const PND_SAMEDAY_CUTOFF_HOUR = 14

// ── Inside-valley same-day / express windows (Asia/Kathmandu) ─────────────────
// Store-safe cut-offs (minutes-of-day):
//   • before 8:45 AM → FREE same-day: regular delivery already arrives today.
//   • 8:45 AM – 1:30 PM → CHOOSE: regular (tomorrow) OR Express flat Rs 150 (today).
//   • after 1:30 PM → CLOSED: regular delivery, arrives next day.
export const EXPRESS_TODAY_FREE_CUTOFF_MIN = 8 * 60 + 45   // 08:45
export const EXPRESS_PAID_CUTOFF_MIN       = 13 * 60 + 30  // 13:30
export const EXPRESS_FEE = 150                              // flat, total (not a surcharge)

export type ExpressPhase = 'today_free' | 'choose' | 'closed'

export interface ExpressEligibility {
  inValley:         boolean
  phase:            ExpressPhase
  regularToday:     boolean   // standard delivery arrives today (before 8:45)
  expressAvailable: boolean   // the paid same-day upgrade is offered (8:45–1:30)
  expressFee:       number    // flat total for express
}

// Minutes-of-day in Asia/Kathmandu (UTC+5:45) — pinned, not device-local, so the
// cut-offs are correct regardless of the visitor's timezone. Minute precision is
// required for the 8:45 / 1:30 boundaries (ktmHour alone isn't enough).
function ktmMinutes(now: Date): number {
  try {
    const s = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(now)
    const m = s.match(/(\d{2}):(\d{2})/)
    if (!m) return now.getHours() * 60 + now.getMinutes()
    return (parseInt(m[1], 10) % 24) * 60 + parseInt(m[2], 10)
  } catch {
    return now.getHours() * 60 + now.getMinutes()
  }
}

// SINGLE source of truth for the express/same-day decision. Consumed by the
// coverage API, checkout pricing/display, the PDP estimate, and order-submit
// re-validation — so the rule can never drift between them. Pure + `now`-driven.
export function expressEligibility(inValley: boolean, now: Date = new Date()): ExpressEligibility {
  if (!inValley) return { inValley: false, phase: 'closed', regularToday: false, expressAvailable: false, expressFee: EXPRESS_FEE }
  const m = ktmMinutes(now)
  if (m < EXPRESS_TODAY_FREE_CUTOFF_MIN) return { inValley: true, phase: 'today_free', regularToday: true,  expressAvailable: false, expressFee: EXPRESS_FEE }
  if (m < EXPRESS_PAID_CUTOFF_MIN)       return { inValley: true, phase: 'choose',     regularToday: false, expressAvailable: true,  expressFee: EXPRESS_FEE }
  return { inValley: true, phase: 'closed', regularToday: false, expressAvailable: false, expressFee: EXPRESS_FEE }
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')

// Kathmandu Valley + same-day surrounding districts (mirrors etaFor SAME band).
const SAME_HINT = [
  'kathmandu', 'lalitpur', 'patan', 'bhaktapur', 'kirtipur', 'madhyapurthimi', 'thimi',
  'kavre', 'dhulikhel', 'banepa', 'panauti', 'sindhupalchok', 'nuwakot',
  'gokarneshwar', 'budhanilkantha',
]
const MID_HINT = ['pokhara', 'chitwan', 'kaski', 'bharatpur']
const TERAI_HINT = [
  'morang', 'biratnagar', 'sunsari', 'itahari', 'dharan', 'inaruwa', 'jhapa', 'birtamod',
  'damak', 'mechinagar', 'parsa', 'birgunj', 'bara', 'kalaiya', 'rupandehi', 'bhairahawa',
  'siddharthanagar', 'butwal',
]

// Approximate Kathmandu Valley bounding box (covers Kathmandu, Lalitpur,
// Bhaktapur + immediate fringes). Used for GPS-based zone detection without a
// reverse-geocoding API call — same "no per-view network cost" stance as the
// rest of this module. A point inside → same-day-eligible valley; outside →
// out-of-valley estimate.
export function isInValleyCoords(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= 27.55 && lat <= 27.88 &&
    lng >= 85.18 && lng <= 85.58
  )
}

export function isKtmValley(city?: string | null): boolean {
  if (!city) return false
  const c = norm(city)
  return ['kathmandu', 'lalitpur', 'patan', 'bhaktapur', 'kirtipur', 'madhyapurthimi', 'thimi']
    .some(v => c.includes(v) || v.includes(c))
}

export function deliveryZone(city?: string | null): DeliveryZone {
  const c = norm(city ?? '')
  if (!c) return 'SAME'
  if (SAME_HINT.some(v => c.includes(v))) return 'SAME'
  if (MID_HINT.some(v => c.includes(v))) return 'MID'
  if (TERAI_HINT.some(v => c.includes(v))) return 'TERAI'
  return 'FAR'
}

// Estimated calendar-day span per zone, mirroring ETA_SECS bands
// (SAME = same/next-day, MID/TERAI = 2d, FAR = 3d). A small +1 buffer on the
// max keeps the estimate honest rather than optimistic.
const ZONE_DAYS: Record<DeliveryZone, { min: number; max: number }> = {
  SAME:  { min: 1, max: 1 },
  MID:   { min: 2, max: 3 },
  TERAI: { min: 2, max: 3 },
  FAR:   { min: 3, max: 4 },
}

// Curated major-city options for the storefront "Deliver to" selector. Broad
// enough to land every visitor in a sensible zone without the full district tree.
export const DELIVERY_CITIES = [
  'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan', 'Butwal',
  'Biratnagar', 'Dharan', 'Birgunj', 'Nepalgunj', 'Dhangadhi', 'Hetauda',
]

export interface DeliveryEstimate {
  zone: DeliveryZone
  sameDay: boolean   // valley + ordered before the 2 PM cut-off
  primary: string    // headline date/label, e.g. "Today, Sat Jun 7" or a range
  short: string      // compact label for trust chips, e.g. "Today" / "2–3 days"
  note: string       // qualifying line under the headline
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-NP', { weekday: 'short', month: 'short', day: 'numeric' })

const addDays = (base: Date, days: number) => {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

// Compute a friendly, location-aware delivery estimate. Time-of-day sensitive,
// so callers MUST run this on the client (in an effect / after mount) to avoid
// an SSR↔client hydration mismatch around the 2 PM boundary.
export function estimateDelivery(city: string, now: Date = new Date()): DeliveryEstimate {
  const zone = deliveryZone(city)

  if (zone === 'SAME') {
    const e = expressEligibility(true, now)
    if (e.phase === 'today_free') {
      return {
        zone, sameDay: true,
        primary: `As fast as today, ${fmtDate(now)}`,
        short: 'Today',
        note: 'Order before 8:45 AM for same-day delivery in Kathmandu Valley (Pick & Drop)',
      }
    }
    if (e.phase === 'choose') {
      return {
        zone, sameDay: true,
        primary: `Today with Express, ${fmtDate(now)}`,
        short: 'Today (Express)',
        note: `Get it today with Express (Rs ${EXPRESS_FEE}) — order before 1:30 PM. Free standard delivery arrives tomorrow.`,
      }
    }
    return {
      zone, sameDay: false,
      primary: `Tomorrow, ${fmtDate(addDays(now, 1))}`,
      short: 'Tomorrow',
      note: 'Same-day cut-off (1:30 PM) has passed — arrives tomorrow',
    }
  }

  const { min, max } = ZONE_DAYS[zone]
  return {
    zone, sameDay: false,
    primary: `${fmtDate(addDays(now, min))} – ${fmtDate(addDays(now, max))}`,
    short: `${min}–${max} days`,
    note: 'Estimated via our delivery partner — confirmed at checkout',
  }
}

// GPS-based estimate. We can only reliably tell valley-vs-outside from raw
// coordinates (no reverse-geocode), which is exactly the granularity the
// storefront promise needs: inside the valley → the real same-day/tomorrow
// logic (2 PM cut-off); outside → a 1–2 day window. The precise rate + ETA is
// still confirmed at checkout against the full address.
export function estimateDeliveryByCoords(lat: number, lng: number, now: Date = new Date()): DeliveryEstimate {
  if (isInValleyCoords(lat, lng)) return estimateDelivery('Kathmandu', now)
  return {
    zone: 'MID', sameDay: false,
    primary: `${fmtDate(addDays(now, 1))} – ${fmtDate(addDays(now, 2))}`,
    short: '1–2 days',
    note: 'Outside Kathmandu Valley — typically 1–2 days via our delivery partner',
  }
}
