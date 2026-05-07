const BASE_URL = process.env.PICKNDROP_BASE_URL ?? 'https://app-t.pickndropnepal.com'
const API_KEY = process.env.PICKNDROP_API_KEY ?? 'bf1a7ce75dacf51'
const API_SECRET = process.env.PICKNDROP_API_SECRET ?? '63b8931e70aee27'

const AUTH = `token ${API_KEY}:${API_SECRET}`

// ── Branch list (cached for 1h in module scope) ───────────────────────────

let branchCache: PndBranch[] | null = null
let branchCacheAt = 0

export interface PndBranch {
  name: string
  branch_name: string
  branch_code: string
  area: string[]
  status: string
  branch_type: string
}

export async function getBranches(): Promise<PndBranch[]> {
  if (branchCache && Date.now() - branchCacheAt < 3_600_000) return branchCache
  const res = await fetch(`${BASE_URL}/api/method/logi360.api.get_branches`, {
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    next: { revalidate: 3600 },
  })
  const json = await res.json()
  const branches: PndBranch[] = json?.message?.data?.branches ?? []
  branchCache = branches
  branchCacheAt = Date.now()
  return branches
}

// ── Standard rate matrix (branch-to-branch, published tariff) ────────────
// Pick & Drop Nepal published standard rates:
//   Same zone (within city):   NPR 100
//   Zone B (nearby district):  NPR 150
//   Zone C (mid-Nepal):        NPR 200
//   Zone D (far/remote):       NPR 250
//
// Express surcharge: +80% on top of standard rate
// COD surcharge: 1.5% of parcel value, min NPR 30

export const PND_STANDARD_RATE: Record<string, number> = {
  SAME: 100,
  NEAR: 150,
  MID:  200,
  FAR:  250,
}

export const PND_ZONES: Record<string, Record<string, 'SAME' | 'NEAR' | 'MID' | 'FAR'>> = {
  KATHMANDU: { KATHMANDU: 'SAME', LALITPUR: 'SAME', BHAKTAPUR: 'NEAR', POKHARA: 'MID', CHITWAN: 'MID', BUTWAL: 'FAR', BIRATNAGAR: 'FAR' },
  LALITPUR:  { LALITPUR: 'SAME', KATHMANDU: 'SAME', BHAKTAPUR: 'NEAR', POKHARA: 'MID', CHITWAN: 'MID', BUTWAL: 'FAR', BIRATNAGAR: 'FAR' },
  BHAKTAPUR: { BHAKTAPUR: 'SAME', KATHMANDU: 'NEAR', LALITPUR: 'NEAR', POKHARA: 'MID', CHITWAN: 'MID', BUTWAL: 'FAR', BIRATNAGAR: 'FAR' },
  POKHARA:   { POKHARA: 'SAME', BUTWAL: 'NEAR', KATHMANDU: 'MID', LALITPUR: 'MID', CHITWAN: 'MID', BHAKTAPUR: 'FAR', BIRATNAGAR: 'FAR' },
  CHITWAN:   { CHITWAN: 'SAME', KATHMANDU: 'MID', BUTWAL: 'NEAR', POKHARA: 'MID', LALITPUR: 'MID', BHAKTAPUR: 'MID', BIRATNAGAR: 'FAR' },
  BUTWAL:    { BUTWAL: 'SAME', POKHARA: 'NEAR', CHITWAN: 'NEAR', KATHMANDU: 'FAR', LALITPUR: 'FAR', BHAKTAPUR: 'FAR', BIRATNAGAR: 'FAR' },
  BIRATNAGAR:{ BIRATNAGAR: 'SAME', KATHMANDU: 'FAR', LALITPUR: 'FAR', POKHARA: 'FAR', CHITWAN: 'FAR', BUTWAL: 'FAR', BHAKTAPUR: 'FAR' },
}

function cityKey(city: string) {
  return city.toUpperCase().replace(/\s+/g, '')
}

export interface PndServiceOption {
  id: string
  provider: 'PICKNDROP'
  name: string
  type: 'STANDARD' | 'EXPRESS'
  charge: number
  charge_after_discount: number
  discount: number
  dropoff_eta: number   // seconds
  distance: number      // metres (0 = branch-based)
  zone: string
}

export function calculatePndRates(fromCity: string, toCity: string): PndServiceOption[] {
  const from = cityKey(fromCity)
  const to   = cityKey(toCity)
  const zone = PND_ZONES[from]?.[to] ?? 'FAR'
  const base  = PND_STANDARD_RATE[zone]
  const express = Math.round(base * 1.8)

  const ETA: Record<string, number> = { SAME: 28800, NEAR: 86400, MID: 172800, FAR: 259200 }

  return [
    {
      id: `pnd-standard-${zone}`,
      provider: 'PICKNDROP',
      name: 'Pick & Drop Standard',
      type: 'STANDARD',
      charge: base,
      charge_after_discount: base,
      discount: 0,
      dropoff_eta: ETA[zone],
      distance: 0,
      zone,
    },
    {
      id: `pnd-express-${zone}`,
      provider: 'PICKNDROP',
      name: 'Pick & Drop Express',
      type: 'EXPRESS',
      charge: express,
      charge_after_discount: express,
      discount: 0,
      dropoff_eta: Math.round(ETA[zone] / 2),
      distance: 0,
      zone,
    },
  ]
}

// ── Order creation ────────────────────────────────────────────────────────

export interface CreatePndOrderParams {
  customerName: string
  senderName: string
  senderPhone: string
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  fromBranch: string
  toBranch: string
  itemValue: number
  codAmount?: number
  serviceType: 'STANDARD' | 'EXPRESS'
  orderId: string
}

export async function createPndOrder(params: CreatePndOrderParams) {
  const res = await fetch(`${BASE_URL}/api/method/logi360.api.create_order`, {
    method: 'POST',
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_name: params.customerName,
      sender_name: params.senderName,
      sender_phone: params.senderPhone,
      receiver_name: params.receiverName,
      receiver_phone: params.receiverPhone,
      receiver_address: params.receiverAddress,
      from_branch: params.fromBranch,
      to_branch: params.toBranch,
      item_value: params.itemValue,
      cod_amount: params.codAmount ?? 0,
      service_type: params.serviceType,
      reference: params.orderId,
    }),
  })
  return res.json()
}
