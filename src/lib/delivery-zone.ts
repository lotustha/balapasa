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

// 2 PM Asia/Kathmandu — Pick & Drop same-day cut-off for the valley.
export const PND_SAMEDAY_CUTOFF_HOUR = 14

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

// Current hour in Asia/Kathmandu (UTC+5:45) — pinned, not client-local, so the
// same-day cut-off is correct regardless of the visitor's device timezone.
function ktmHour(now: Date): number {
  try {
    const h = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kathmandu', hour: '2-digit', hour12: false,
    }).format(now)
    const n = parseInt(h, 10)
    return Number.isFinite(n) ? n % 24 : now.getHours()
  } catch {
    return now.getHours()
  }
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
    const beforeCutoff = ktmHour(now) < PND_SAMEDAY_CUTOFF_HOUR
    if (beforeCutoff) {
      return {
        zone, sameDay: true,
        primary: `As fast as today, ${fmtDate(now)}`,
        short: 'Today',
        note: 'Order before 2:00 PM for same-day delivery in Kathmandu Valley (Pick & Drop)',
      }
    }
    return {
      zone, sameDay: false,
      primary: `Tomorrow, ${fmtDate(addDays(now, 1))}`,
      short: 'Tomorrow',
      note: 'Same-day cut-off (2:00 PM) has passed — arrives tomorrow',
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
