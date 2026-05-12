import 'server-only'
import { getParcel as getPathaoParcel } from '@/lib/pathao'
import { getPndOrderStatus } from '@/lib/pickndrop'
import type { CarrierStatus } from '@/lib/tracking-shared'
export { ACTIVE_STATES } from '@/lib/tracking-shared'
export type { CarrierStatus, TrackingEvent } from '@/lib/tracking-shared'

const STAGE = {
  PLACED:     0,
  CONFIRMED:  1,
  PROCESSING: 2,
  SHIPPED:    3,
  DELIVERED:  4,
} as const

// Map carrier-specific status strings to our 0..4 internal stage.
// The carrier strings vary by provider and even by environment (mock vs live).
function mapPathaoStatus(raw: string): number {
  const s = raw.toLowerCase()
  if (s.includes('deliver'))                      return STAGE.DELIVERED
  if (s.includes('out for delivery') || s.includes('out_for_delivery')) return STAGE.SHIPPED
  if (s.includes('transit') || s.includes('in_transit'))                return STAGE.SHIPPED
  if (s.includes('pickup') && (s.includes('done') || s.includes('completed') || s.includes('picked'))) return STAGE.PROCESSING
  if (s.includes('pickup_requested') || s.includes('assigned'))         return STAGE.CONFIRMED
  if (s.includes('cancel'))                       return -1
  return STAGE.CONFIRMED
}

function mapPndStatus(raw: string): number {
  const s = raw.toLowerCase()
  if (s.includes('deliver'))                      return STAGE.DELIVERED
  if (s.includes('out for delivery'))             return STAGE.SHIPPED
  if (s.includes('transit'))                      return STAGE.SHIPPED
  if (s.includes('picked'))                       return STAGE.PROCESSING
  if (s.includes('confirmed') || s.includes('accepted')) return STAGE.CONFIRMED
  if (s.includes('cancel'))                       return -1
  return STAGE.CONFIRMED
}

// ── In-memory cache (60s) — avoids hammering carrier APIs on auto-refresh ──
const cache = new Map<string, { at: number; data: CarrierStatus }>()
const TTL_MS = 60 * 1000

export interface FetchCarrierInput {
  shippingProvider: string | null
  pathaoHash: string | null
  pathaoOrderId: string | null
  trackingUrl: string | null
  internalStatus: string  // current OrderStatus enum value
  shippingProviderTrackingId?: string | null
}

export async function fetchCarrierStatus(orderId: string, input: FetchCarrierInput): Promise<CarrierStatus> {
  const cached = cache.get(orderId)
  if (cached && Date.now() - cached.at < TTL_MS) return cached.data

  const out: CarrierStatus = {
    provider:    null,
    label:       null,
    liveStatus:  null,
    mappedStage: internalStatusToStage(input.internalStatus),
    eta:         null,
    rider:       null,
    events:      [],
    trackingUrl: input.trackingUrl ?? null,
    fetchedAt:   new Date().toISOString(),
    error:       null,
    isMock:      false,
  }

  try {
    if (input.shippingProvider === 'PATHAO' && input.pathaoHash) {
      out.provider = 'PATHAO'
      out.label    = 'Pathao'
      // Detect mock by hash prefix; getParcel itself throws when called against the live API in mock mode
      const isMockHash = input.pathaoHash.startsWith('mock-')
      out.isMock = isMockHash
      if (isMockHash) {
        // Synthesise a plausible status based on internal order status
        out.liveStatus  = humanForStage(out.mappedStage)
        out.events      = []
      } else {
        const res = await getPathaoParcel(input.pathaoHash) as { data?: Record<string, unknown> } | null
        const data = res?.data ?? {}
        const raw = String(data.parcel_status ?? data.status ?? '')
        if (raw) {
          out.liveStatus  = raw.replace(/_/g, ' ')
          out.mappedStage = mapPathaoStatus(raw)
        }
        const rider = (data.rider ?? {}) as Record<string, unknown>
        const rn = data.rider_name  ?? rider.name
        const rp = data.rider_phone ?? rider.phone_number
        if (rn && rp) out.rider = { name: String(rn), phone: String(rp) }
        const eta = data.delivery_eta ?? data.eta
        if (eta) out.eta = String(eta)
        // Extract event log if present (Pathao sometimes returns `parcel_logs` or `tracking_logs`)
        const logs = (data.parcel_logs ?? data.tracking_logs ?? []) as unknown[]
        if (Array.isArray(logs)) {
          out.events = logs.flatMap(l => {
            const e = l as Record<string, unknown>
            const at = String(e.created_at ?? e.timestamp ?? e.time ?? '')
            const label = String(e.status ?? e.event ?? e.message ?? '')
            return at && label ? [{ at, label }] : []
          })
        }
      }
    } else if (input.shippingProvider === 'PICKNDROP' && input.shippingProviderTrackingId) {
      out.provider = 'PICKNDROP'
      out.label    = 'Pick & Drop Nepal'
      const data = await getPndOrderStatus(input.shippingProviderTrackingId) as Record<string, unknown> | null
      if (data) {
        const raw = String(data.status ?? data.current_status ?? '')
        if (raw) {
          out.liveStatus  = raw
          out.mappedStage = mapPndStatus(raw)
        }
      }
    }
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e)
  }

  cache.set(orderId, { at: Date.now(), data: out })
  return out
}

function internalStatusToStage(status: string): number {
  switch (status) {
    case 'PENDING':    return STAGE.PLACED
    case 'CONFIRMED':  return STAGE.CONFIRMED
    case 'PROCESSING': return STAGE.PROCESSING
    case 'SHIPPED':    return STAGE.SHIPPED
    case 'DELIVERED':  return STAGE.DELIVERED
    case 'CANCELLED':  return -1
    default:           return STAGE.PLACED
  }
}

function humanForStage(stage: number): string {
  switch (stage) {
    case STAGE.DELIVERED:  return 'Delivered'
    case STAGE.SHIPPED:    return 'Out for delivery'
    case STAGE.PROCESSING: return 'Picked up'
    case STAGE.CONFIRMED:  return 'Pickup requested'
    case STAGE.PLACED:     return 'Order placed'
    default:               return 'In progress'
  }
}

