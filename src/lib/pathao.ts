import { getPathaoConfig } from './logistics-config'

// ── In-memory token cache ─────────────────────────────────────────────────────
let _token:  string | null = null
let _expiry: Date   | null = null

async function getAccessToken(): Promise<string> {
  if (_token && _expiry && _expiry > new Date()) return _token

  // Try DB-cached token first
  try {
    const { prisma } = await import('./prisma')
    const stored = await prisma.pathaoToken.findFirst({ orderBy: { createdAt: 'desc' } })
    if (stored && stored.expiresAt > new Date()) {
      _token = stored.accessToken; _expiry = stored.expiresAt
      return _token
    }
  } catch { /* DB unavailable */ }

  const cfg = await getPathaoConfig()
  const res = await fetch(`${cfg.baseUrl}/api/v1/auth/generate-access-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: cfg.clientId, client_secret: cfg.clientSecret }),
  })
  if (!res.ok) throw new Error(`Pathao auth ${res.status}`)
  const data = await res.json()
  _token  = data.data.access_token as string
  _expiry = new Date(data.data.expires_at)

  try {
    const { prisma } = await import('./prisma')
    await prisma.pathaoToken.create({ data: { accessToken: _token, expiresAt: _expiry } })
  } catch { /* DB unavailable */ }

  return _token
}

// ── Mock estimate ─────────────────────────────────────────────────────────────
function mockEstimate(_params: EstimateParams) {
  return {
    status: true,
    data: {
      sid: `mock-sid-${Date.now()}`,
      is_cod_active: true,
      total_value: _params.totalValue,
      service_options: [
        { id: 1, name: 'Instant Delivery',  distance: 8500, charge: 180, discount: 0, charge_after_discount: 180, dropoff_eta: 3600,  pickup_eta: 1800, dropoff_deadline: 0 },
        { id: 2, name: 'Same Day Delivery', distance: 8500, charge: 120, discount: 0, charge_after_discount: 120, dropoff_eta: 14400, pickup_eta: 3600, dropoff_deadline: 0 },
      ],
    },
  }
}

// ── Delivery estimate ─────────────────────────────────────────────────────────

export interface EstimateParams {
  receiverLat:     number
  receiverLng:     number
  receiverAddress: string
  totalValue:      number
  isCodActive:     boolean
}

export async function estimateDelivery(params: EstimateParams) {
  const cfg = await getPathaoConfig()
  if (!cfg.isActive) throw new Error('Pathao is disabled in logistics settings')
  if (cfg.isMock)   return mockEstimate(params)

  const token = await getAccessToken()
  const res = await fetch(`${cfg.baseUrl}/api/v1/ondemand/parcels/estimation?lang=en`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      city_id: 1, country_id: 1,
      is_cod_active: params.isCodActive,
      will_pay: 'receiver',
      total_value: params.totalValue,
      is_creator_receiver: false,
      external_store_id: cfg.storeId,
      pickup: {
        address: cfg.storeAddress, address_notes: '',
        name: cfg.storeName, phone_number: cfg.storePhone,
        latitude: cfg.storeLat, longitude: cfg.storeLng,
        source: 'USER_LOCATION', total_item_value: params.totalValue,
      },
      receiver: [{
        address: params.receiverAddress, address_notes: '', delivery_notes: '',
        house: '', item_price: params.totalValue, total_item_value: params.totalValue,
        latitude: params.receiverLat, longitude: params.receiverLng,
        name: 'Customer', parcel_type: 104,
        phone_number: '01800000000', road: '', source: 'USER_LOCATION',
      }],
    }),
  })
  if (!res.ok) { const t = await res.text(); throw new Error(`Pathao estimate ${res.status}: ${t.slice(0, 200)}`) }
  return res.json()
}

// ── Parcel creation ───────────────────────────────────────────────────────────

export interface CreateParcelParams {
  sid:             string
  serviceOptionId: number
  receiverName:    string
  receiverPhone:   string
  receiverAddress: string
  receiverHouse?:  string
  receiverRoad?:   string
  receiverLat:     number
  receiverLng:     number
  totalValue:      number
  externalRefId:   string
  isCod:           boolean
  parcelType?:     number
}

function mockCreateParcel(params: CreateParcelParams) {
  const orderId  = params.externalRefId.slice(0, 7).toUpperCase()
  const hashedId = `mock-${Math.random().toString(36).slice(2, 10)}`
  return {
    data: {
      order_id:     orderId,
      hashed_id:    hashedId,
      charge:       1200,
      payable_charge: 1200,
      tracking_url: `https://pages.p-stageenv.xyz/receiver-tracking/${hashedId}`,
    },
  }
}

export async function createParcel(params: CreateParcelParams) {
  const cfg = await getPathaoConfig()
  if (!cfg.isActive) throw new Error('Pathao is disabled in logistics settings')
  if (cfg.isMock)   return mockCreateParcel(params)

  const token = await getAccessToken()
  const res = await fetch(`${cfg.baseUrl}/api/v1/ondemand/parcels?lang=en`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sid: params.sid, service_option_id: params.serviceOptionId,
      external_ref_id: params.externalRefId,
      is_payment_on_delivery: params.isCod,
      will_pay: 'sender', total_value: params.totalValue,
      is_creator_receiver: false, external_store_id: cfg.storeId,
      pickup: {
        address: cfg.storeAddress, address_notes: '', pickup_notes: '',
        latitude: cfg.storeLat, longitude: cfg.storeLng,
        house: '', road: '', name: cfg.storeName, phone_number: cfg.storePhone,
        parcel_type: params.parcelType ?? 104,
        total_item_value: params.totalValue, items: [],
      },
      receiver: [{
        address: params.receiverAddress, address_notes: '', delivery_notes: '',
        house: params.receiverHouse ?? '', road: params.receiverRoad ?? '',
        latitude: params.receiverLat, longitude: params.receiverLng,
        name: params.receiverName, parcel_type: params.parcelType ?? 104,
        phone_number: params.receiverPhone,
        item_price: 0, total_item_value: params.totalValue, items: [],
      }],
    }),
  })
  if (!res.ok) { const t = await res.text(); throw new Error(`Pathao create ${res.status}: ${t.slice(0, 200)}`) }
  const json = await res.json()
  // Normalise field names from the API response
  const d = json.data ?? {}
  return {
    ...json,
    data: {
      ...d,
      order_id:     d.order_id    ?? d.parcel_id ?? '',
      hashed_id:    d.hashed_id   ?? d.parcel_hash ?? d.hash ?? '',
      tracking_url: d.tracking_url ?? null,
      charge:       d.charge       ?? d.payable_charge ?? 0,
    },
  }
}

// ── Cancel parcel ─────────────────────────────────────────────────────────────

export async function cancelParcel(hashedId: string, reason = 'customer-cancelled-order') {
  const cfg = await getPathaoConfig()
  if (!cfg.isActive) throw new Error('Pathao is disabled')
  if (cfg.isMock) return { parcel: { parcel_status: 'CANCELLED' } }

  const token = await getAccessToken()
  const res = await fetch(`${cfg.baseUrl}/api/v1/ondemand/parcels/${hashedId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'CANCELLED', cancellation_reason: { slug: reason, additional_text: '' } }),
  })
  if (!res.ok) { const t = await res.text(); throw new Error(`Pathao cancel ${res.status}: ${t.slice(0, 200)}`) }
  return res.json()
}

// ── Get parcel details ────────────────────────────────────────────────────────

export async function getParcel(hashedId: string) {
  const cfg = await getPathaoConfig()
  if (!cfg.isActive) throw new Error('Pathao is disabled')

  const token = await getAccessToken()
  const res = await fetch(`${cfg.baseUrl}/api/v1/ondemand/parcels/${hashedId}?user_type=user&localization=en`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) { const t = await res.text(); throw new Error(`Pathao get ${res.status}: ${t.slice(0, 200)}`) }
  return res.json()
}
