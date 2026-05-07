import { NextRequest } from 'next/server'
import { estimateDelivery } from '@/lib/pathao'
import { calculatePndRates, type PndServiceOption } from '@/lib/pickndrop'

export interface UnifiedShippingOption {
  id: string
  provider: 'PATHAO' | 'PICKNDROP'
  providerLabel: string
  name: string
  charge: number
  charge_after_discount: number
  discount: number
  dropoff_eta: number
  distance: number
  meta?: Record<string, unknown>   // pathao sid, pnd zone, etc.
}

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Kathmandu:  { lat: 27.7172, lng: 85.3240 },
  Lalitpur:   { lat: 27.6644, lng: 85.3188 },
  Bhaktapur:  { lat: 27.6710, lng: 85.4298 },
  Pokhara:    { lat: 28.2096, lng: 83.9856 },
  Chitwan:    { lat: 27.5291, lng: 84.3542 },
  Butwal:     { lat: 27.7006, lng: 83.4532 },
  Biratnagar: { lat: 26.4525, lng: 87.2718 },
}

export async function POST(req: NextRequest) {
  const { address, city, subtotal, isCodActive } = await req.json()

  const coords = CITY_COORDS[city] ?? CITY_COORDS.Kathmandu
  const originCity = 'Kathmandu' // store pickup location

  // Fetch Pathao + Pick & Drop in parallel
  const [pathaoResult, pndOptions] = await Promise.allSettled([
    estimateDelivery({
      receiverLat:     coords.lat,
      receiverLng:     coords.lng,
      receiverAddress: `${address}, ${city}`,
      totalValue:      subtotal,
      isCodActive,
    }),
    Promise.resolve(calculatePndRates(originCity, city)),
  ])

  const options: UnifiedShippingOption[] = []

  // Pathao options
  if (pathaoResult.status === 'fulfilled') {
    const data = pathaoResult.value?.data
    const sid  = data?.sid ?? null
    for (const opt of (data?.service_options ?? [])) {
      options.push({
        id:                   `pathao-${opt.id}`,
        provider:             'PATHAO',
        providerLabel:        'Pathao',
        name:                 opt.name,
        charge:               opt.charge,
        charge_after_discount: opt.charge_after_discount,
        discount:             opt.discount,
        dropoff_eta:          opt.dropoff_eta,
        distance:             opt.distance,
        meta:                 { sid, serviceOptionId: opt.id },
      })
    }
  }

  // Pick & Drop options
  if (pndOptions.status === 'fulfilled') {
    for (const opt of (pndOptions.value as PndServiceOption[])) {
      options.push({
        id:                   opt.id,
        provider:             'PICKNDROP',
        providerLabel:        'Pick & Drop',
        name:                 opt.name,
        charge:               opt.charge,
        charge_after_discount: opt.charge_after_discount,
        discount:             opt.discount,
        dropoff_eta:          opt.dropoff_eta,
        distance:             opt.distance,
        meta:                 { zone: opt.zone, type: opt.type },
      })
    }
  }

  // Sort by price
  options.sort((a, b) => a.charge_after_discount - b.charge_after_discount)

  return Response.json({ options })
}
