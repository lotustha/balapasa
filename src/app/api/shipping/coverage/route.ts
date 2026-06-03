import { NextRequest } from 'next/server'
import { estimateDelivery } from '@/lib/pathao'
import { calculatePndRates } from '@/lib/pickndrop'
import { isKtmValley, isInValleyCoords, expressEligibility } from '@/lib/delivery-zone'

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
    province, district, municipality, ward, street, tole, landmark,
    subtotal = 1000,
    // Optional: if frontend passes receiver coords (future GPS integration)
    receiverLat, receiverLng,
    // Optional: customer-selected PnD branch (locks destination directly)
    destinationBranch,
    // Optional: cart aggregates so the rate fetch reflects the real package
    weightKg, lengthCm, widthCm, heightCm,
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
    // Every customer address fragment becomes a matching atom against each
    // branch's area[] list. Higher token overlap → that branch wins.
    const destinationAtoms = [province, district, municipality, ward, street, tole, landmark]
      .filter((s): s is string => typeof s === 'string' && !!s.trim())
    const pndRates = await calculatePndRates(fromCity, toCity, {
      destinationBranchOverride: typeof destinationBranch === 'string' && destinationBranch.trim() ? destinationBranch.trim() : undefined,
      destinationAtoms,
      // Per PnD spec: location = street/road, city_area = tole
      location: typeof street === 'string' && street.trim() ? street.trim() : undefined,
      cityArea: typeof tole   === 'string' && tole.trim()   ? tole.trim()   : undefined,
      weightKg: typeof weightKg === 'number' && weightKg > 0 ? weightKg : undefined,
      lengthCm: typeof lengthCm === 'number' && lengthCm > 0 ? lengthCm : undefined,
      widthCm:  typeof widthCm  === 'number' && widthCm  > 0 ? widthCm  : undefined,
      heightCm: typeof heightCm === 'number' && heightCm > 0 ? heightCm : undefined,
    })

    // Same-day / express eligibility (inside Kathmandu Valley only). Drives the
    // ETA label on the regular option and whether a paid Express option appears.
    const inValley =
      isKtmValley(district) || isKtmValley(municipality) ||
      (typeof receiverLat === 'number' && typeof receiverLng === 'number' && isInValleyCoords(receiverLat, receiverLng))
    const elig = expressEligibility(inValley)

    const pndOpts: CoverageOption[] = pndRates.map(rate => ({
      id:           rate.id,
      provider:     'PICKNDROP',
      providerLabel:'Pick & Drop',
      name:          rate.name,
      charge:        rate.charge_after_discount,
      dropoff_eta:   rate.dropoff_eta,
      available:     true,
      meta: {
        zone: rate.zone, type: rate.type,
        // Expose the matched PnD branch + base/surge breakdown so the quoted
        // rate is auditable from the client (which branch the address resolved
        // to and whether 150 is the branch's real base or added surge).
        branch:     rate.meta?.destinationBranch,
        basePrice:  rate.meta?.basePrice,
        surgePrice: rate.meta?.surgePrice,
        // Inside valley: regular delivery is "today" only before the 8:45 window.
        ...(inValley ? { etaLabel: elig.regularToday ? 'today' : 'tomorrow' } : {}),
      },
    }))
    options.push(...pndOpts)

    // Paid Express same-day upgrade — inside valley, 8:45 AM–1:30 PM only.
    if (elig.expressAvailable && pndOpts.length) {
      options.push({
        id:           'pnd-express',
        provider:     'PICKNDROP',
        providerLabel:'Pick & Drop',
        name:         'Pick & Drop — Express (Same-day)',
        charge:        elig.expressFee,            // flat Rs 150 total
        dropoff_eta:   6 * 3600,
        available:     true,
        meta: { ...(pndOpts[0].meta ?? {}), express: true, etaLabel: 'today' },
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
