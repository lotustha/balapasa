import { NextRequest } from 'next/server'
import { estimateDelivery } from '@/lib/pathao'
import { calculatePndRates } from '@/lib/pickndrop'

export interface CoverageOption {
  id: string
  provider: 'PATHAO' | 'PICKNDROP' | 'STORE_PICKUP' | 'COURIER'
  providerLabel: string
  name: string
  charge: number
  dropoff_eta: number
  available: boolean
  meta?: Record<string, unknown>
}

// Kathmandu receiver default coords for Pathao Nepal estimates. Used only
// for previews when no real customer address is known. (Variable name kept
// as DHAKA_* for back-compat with downstream references.)
const DHAKA_LAT = 27.7172
const DHAKA_LNG = 85.3240

const STORE_PICKUP_PRICE      = 50
const FALLBACK_COURIER_PRICE  = 250

export async function POST(req: NextRequest) {
  const {
    province, district, municipality, ward, street,
    subtotal = 1000,
    // Optional: if frontend passes receiver coords (future GPS integration)
    receiverLat, receiverLng,
  } = await req.json()

  const fullAddress = [street, municipality, district, province]
    .filter(Boolean).join(', ') || 'Customer Address'

  const options: CoverageOption[] = []
  const errors:  string[]         = []

  // Load partner active status from logistics settings (with env fallback)
  const { getPathaoConfig, getPicknDropConfig } = await import('@/lib/logistics-config')
  const [pathaoConfig, pndConfig] = await Promise.all([
    getPathaoConfig().catch(() => ({ isActive: false, storeAddress: '', storeName: '' } as { isActive: boolean; storeAddress: string; storeName: string })),
    getPicknDropConfig().catch(() => ({ isActive: false } as { isActive: boolean })),
  ])
  const anyPartnerActive = pathaoConfig.isActive || pndConfig.isActive

  // Districts where Pathao instant/same-day delivery is realistic
  // (Kathmandu Valley only — Pathao's actual service coverage in Nepal)
  const PATHAO_SERVICEABLE = new Set(['Kathmandu', 'Lalitpur', 'Bhaktapur'])
  const pathaoCoversArea = !district || PATHAO_SERVICEABLE.has(district)

  // ── 1. Pathao (only if active AND district is in service area) ────────────────
  if (pathaoConfig.isActive && pathaoCoversArea) try {
    const lat = receiverLat ?? DHAKA_LAT
    const lng = receiverLng ?? DHAKA_LNG

    const pathaoRes = await estimateDelivery({
      receiverLat: lat,
      receiverLng: lng,
      receiverAddress: fullAddress,
      totalValue: subtotal,
      isCodActive: true,
    })

    const serviceOptions: Array<{
      id: number; name: string; distance: number;
      charge: number; charge_after_discount: number; discount: number;
      dropoff_eta: number; pickup_eta: number;
    }> = pathaoRes?.data?.service_options ?? []

    const sid = pathaoRes?.data?.sid ?? null

    if (serviceOptions.length === 0 && pathaoRes?.status === false) {
      errors.push(`Pathao: ${JSON.stringify(pathaoRes).slice(0, 120)}`)
    }

    for (const opt of serviceOptions) {
      options.push({
        id:           `pathao-${opt.id}`,
        provider:     'PATHAO',
        providerLabel:'Pathao',
        name:          opt.name,
        charge:        opt.charge,
        dropoff_eta:   opt.dropoff_eta,
        available:     true,
        meta: {
          sid,
          serviceOptionId: opt.id,
          distance:  opt.distance,
          discount:  opt.discount,
          chargeAfterDiscount: opt.charge_after_discount,
          pickupEta: opt.pickup_eta,
        },
      })
    }
  } catch (e: unknown) {
    errors.push(`Pathao: ${e instanceof Error ? e.message : String(e)}`)
  }

  // ── 2. Pick & Drop (live rate API, with hand-tuned fallback inside lib) ────
  if (pndConfig.isActive) try {
    const fromCity = 'Kathmandu'
    const toCity   = district ?? municipality ?? 'Kathmandu'
    const pndRates = await calculatePndRates(fromCity, toCity)

    for (const rate of pndRates) {
      options.push({
        id:           rate.id,
        provider:     'PICKNDROP',
        providerLabel:'Pick & Drop',
        name:          rate.name,
        charge:        rate.charge_after_discount,
        dropoff_eta:   rate.dropoff_eta,
        available:     true,
        meta: { zone: rate.zone, type: rate.type },
      })
    }
  } catch (e: unknown) {
    errors.push(`Pick & Drop: ${e instanceof Error ? e.message : String(e)}`)
  }

  // ── 3. Check if any real delivery partner returned options ──────────────────
  const hasDelivery = options.some(
    o => o.provider !== 'STORE_PICKUP' && o.provider !== 'COURIER'
  )

  // ── 4. Fallback courier — only when partners are active but don't cover area ─
  if (!hasDelivery && anyPartnerActive) {
    options.push({
      id:           'fallback-courier',
      provider:     'COURIER',
      providerLabel:'Standard Courier',
      name:         'Standard Courier Delivery',
      charge:        FALLBACK_COURIER_PRICE,
      dropoff_eta:   4 * 24 * 3600,
      available:     true,
      meta: { note: 'Estimated 3–5 business days' },
    })
  }

  // ── 5. Store pickup — only when no delivery partner is available ──────────────
  // When real delivery options exist, self-pickup is not shown to avoid clutter.
  // When no delivery option exists (no partners active or no coverage), show as fallback.
  const hasAnyDelivery = options.some(o => o.provider !== 'STORE_PICKUP')
  if (!hasAnyDelivery) {
    options.push({
      id:           'store-pickup',
      provider:     'STORE_PICKUP',
      providerLabel:'Store Pickup',
      name:         'Self Pickup from Store',
      charge:        STORE_PICKUP_PRICE,
      dropoff_eta:   0,
      available:     true,
      meta: { address: pathaoConfig.storeAddress || pathaoConfig.storeName || 'Balapasa Store' },
    })
  }

  // ── Sort cheapest first ───────────────────────────────────────────────────────
  options.sort((a, b) => a.charge - b.charge)

  return Response.json({ options, errors })
}
