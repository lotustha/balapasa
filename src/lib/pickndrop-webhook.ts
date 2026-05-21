import 'server-only'

import { prisma } from '@/lib/prisma'
import { notifyDeliveryDispatched } from '@/lib/notify-delivery-dispatched'
import { notifyPaymentReceipt } from '@/lib/notify-payment-receipt'
import { render as renderEmail } from '@/lib/emails/registry'
import { sendEmailLogged } from '@/lib/email'
import { getSiteSettings } from '@/lib/site-settings'
import { pushOrderEvent } from '@/lib/push'
import { restoreStockForOrder } from '@/lib/restore-stock'
import type { DeliveryExceptionKind } from '@/lib/emails/types'

// ── PnD event shape ─────────────────────────────────────────────────────────

export interface PndWebhookEvent {
  tracking_number: string
  status:          string
  timestamp:       string
  comments?:       string | null
  epod?:           string | null
  package_type?:   string | null
}

// ── Status map ──────────────────────────────────────────────────────────────
//
// Each PnD raw status maps to:
//   - mappedStatus: an OrderStatus value to *advance* to, OR null to leave alone
//   - paid:          true → also flip paymentStatus → PAID (used for COD on delivered)
//   - emailKind:     which customer email to fire (if any)
//   - pushTitle:     push notification headline (if any)
//   - dispatchedCourier: if set, fire delivery-dispatched email with this name
//
// "Advance" means: only flip when the new status is later in our flow.
// We never regress (e.g., once DELIVERED we don't move back to SHIPPED).

export type MappedStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

interface Mapping {
  mappedStatus:       MappedStatus | null
  paidOnCod?:         boolean
  emailKind?:         DeliveryExceptionKind | 'DISPATCHED' | 'DELIVERED'
  pushTitle?:         string
}

export const PND_STATUS_MAP: Record<string, Mapping> = {
  package_pickup_assigned:                          { mappedStatus: null },
  waiting_for_drop_off:                             { mappedStatus: null },
  package_pickup_success:                           { mappedStatus: 'SHIPPED', emailKind: 'DISPATCHED', pushTitle: 'Your order has been picked up' },
  package_arrived_at_hub:                           { mappedStatus: 'SHIPPED' },
  package_received_at_hub:                          { mappedStatus: 'SHIPPED' },
  received_at_lastmile_station:                     { mappedStatus: 'SHIPPED' },
  package_ready_to_dispatch_last_mile_station:      { mappedStatus: 'SHIPPED' },
  package_dispatched_to_last_mile_station_transporter: { mappedStatus: 'SHIPPED' },
  package_stationed_in_from_transporter:            { mappedStatus: 'SHIPPED' },
  ready_for_dispatched_last_mile_hero:              { mappedStatus: 'SHIPPED' },
  out_for_delivery:                                 { mappedStatus: 'SHIPPED', pushTitle: 'Out for delivery' },
  about_to_deliver:                                 { mappedStatus: 'SHIPPED', pushTitle: 'Your rider is nearby' },
  delivered:                                        { mappedStatus: 'DELIVERED', paidOnCod: true, emailKind: 'DELIVERED', pushTitle: 'Order delivered!' },

  // Pickup-side failure (rare for our flow; logged but no customer email)
  package_pickup_1st_attempt_failed:                { mappedStatus: null, emailKind: 'PICKUP_FAILED' },
  package_pickup_reattempt_failed:                  { mappedStatus: null, emailKind: 'PICKUP_FAILED' },

  '1st_attempt_failed':                             { mappedStatus: null, emailKind: 'DELIVERY_ATTEMPT_FAILED' },
  package_redelivery:                               { mappedStatus: null, emailKind: 'REDELIVERY' },
  package_reattempts_failed:                        { mappedStatus: 'CANCELLED', emailKind: 'REATTEMPTS_FAILED' },
  delivery_failed_and_cancelled:                    { mappedStatus: 'CANCELLED', emailKind: 'CANCELLED' },

  return_at_transit_hub:                            { mappedStatus: 'CANCELLED', emailKind: 'CANCELLED' },
  package_returned_from_transit_hub_to_transporter: { mappedStatus: 'CANCELLED' },
  received_from_transporter_to_dispatched_hub:      { mappedStatus: 'CANCELLED' },
  fd_package_ready_to_return_to_shipper:            { mappedStatus: 'CANCELLED' },
  package_returned:                                 { mappedStatus: 'CANCELLED', emailKind: 'CANCELLED' },
  package_returned_from_lastmile_sation_to_transporter: { mappedStatus: 'CANCELLED' },
  cr_package_ready_to_delivered_to_qcc:             { mappedStatus: 'CANCELLED' },
}

const STATUS_RANK: Record<MappedStatus, number> = {
  PENDING:    0,
  CONFIRMED:  1,
  PROCESSING: 2,
  SHIPPED:    3,
  DELIVERED:  4,
  CANCELLED:  4, // terminal; treated as same rank as DELIVERED for the "no regress" check
}

export function canAdvanceStatus(current: MappedStatus, next: MappedStatus): boolean {
  if (current === 'DELIVERED' || current === 'CANCELLED') return false
  return STATUS_RANK[next] >= STATUS_RANK[current]
}

// ── Idempotency helper ──────────────────────────────────────────────────────

export async function alreadyLogged(orderId: string, rawStatus: string, isoTimestamp: string | null): Promise<boolean> {
  // We treat (orderId, rawStatus, timestamp) as the unique key. Without a real
  // composite unique constraint we just query — webhook volume is low.
  const existing = await prisma.orderStatusLog.findFirst({
    where: {
      orderId,
      rawStatus,
      ...(isoTimestamp ? { createdAt: { gte: new Date(new Date(isoTimestamp).getTime() - 1000), lte: new Date(new Date(isoTimestamp).getTime() + 1000) } } : {}),
    },
    select: { id: true },
  })
  return existing != null
}

// ── Process a single event ──────────────────────────────────────────────────
//
// Caller responsibility: HMAC verification + parsing. This function assumes
// `event` is trusted JSON.

export interface ProcessResult {
  matched:     boolean
  orderId:     string | null
  logged:      boolean
  advanced:    MappedStatus | null
  notifications: string[]   // names of notifications fired, for return / logging
}

export async function processPndWebhookEvent(event: PndWebhookEvent): Promise<ProcessResult> {
  const result: ProcessResult = { matched: false, orderId: null, logged: false, advanced: null, notifications: [] }

  // Find the order by PnD tracking number.
  const order = await prisma.order.findFirst({
    where: { pndOrderId: event.tracking_number },
    select: { id: true, status: true, paymentStatus: true, paymentMethod: true, transactionId: true },
  })
  if (!order) return result   // matched stays false; caller returns 200 OK so PnD doesn't retry forever
  result.matched = true
  result.orderId = order.id

  const mapping = PND_STATUS_MAP[event.status] ?? { mappedStatus: null }
  const isoTs   = parsePndTimestamp(event.timestamp)

  if (await alreadyLogged(order.id, event.status, isoTs)) {
    return result
  }

  // Persist the log first so even if downstream notifications fail, we keep the audit row.
  await prisma.orderStatusLog.create({
    data: {
      orderId:      order.id,
      source:       'PICKNDROP',
      rawStatus:    event.status,
      mappedStatus: mapping.mappedStatus,
      comment:      event.comments ?? null,
      epodUrl:      event.epod     ?? null,
      payload:      event as unknown as object,
      ...(isoTs ? { createdAt: new Date(isoTs) } : {}),
    },
  })
  result.logged = true

  // Advance order.status if the mapping says so AND we wouldn't regress.
  const dataUpdate: Record<string, unknown> = {}
  if (mapping.mappedStatus) {
    const current = (order.status ?? 'PENDING') as MappedStatus
    if (canAdvanceStatus(current, mapping.mappedStatus)) {
      dataUpdate.status = mapping.mappedStatus
      result.advanced = mapping.mappedStatus
    }
  }
  // Flip payment status when delivered + COD.
  let firePaymentReceipt = false
  if (mapping.paidOnCod && order.paymentMethod === 'COD' && order.paymentStatus !== 'PAID') {
    dataUpdate.paymentStatus = 'PAID'
    firePaymentReceipt = true
  }
  if (Object.keys(dataUpdate).length > 0) {
    await prisma.order.update({ where: { id: order.id }, data: dataUpdate })
  }

  // When PnD cancels the order, restore stock so the inventory ledger stays
  // honest. Idempotent — re-firing the webhook won't double-credit.
  if (dataUpdate.status === 'CANCELLED') {
    await restoreStockForOrder(order.id, 'PICKNDROP').catch(e =>
      console.warn('[pickndrop-webhook] stock restore failed (non-fatal):', e),
    )
  }

  // Fan-out notifications.
  switch (mapping.emailKind) {
    case 'DISPATCHED':
      notifyDeliveryDispatched({ orderId: order.id, courierName: 'Pick & Drop', trackingNumber: event.tracking_number })
      result.notifications.push('delivery-dispatched')
      break
    case 'DELIVERED':
      await sendShipmentUpdate(order.id, 'DELIVERED')
      result.notifications.push('shipment-update:DELIVERED')
      break
    case 'PICKUP_FAILED':
    case 'DELIVERY_ATTEMPT_FAILED':
    case 'REDELIVERY':
    case 'REATTEMPTS_FAILED':
    case 'CANCELLED':
      await sendDeliveryException(order.id, mapping.emailKind, event.comments ?? null)
      result.notifications.push(`delivery-exception:${mapping.emailKind}`)
      break
  }

  if (firePaymentReceipt) {
    notifyPaymentReceipt({ orderId: order.id, method: 'COD', transactionId: order.transactionId })
    result.notifications.push('payment-receipt')
  }

  if (mapping.pushTitle) {
    pushOrderEvent({
      userId:  null,
      orderId: order.id,
      title:   mapping.pushTitle,
      body:    event.comments ?? '',
    }).catch(() => {})
    result.notifications.push('push')
  }

  return result
}

function parsePndTimestamp(s: string | null | undefined): string | null {
  if (!s) return null
  // PnD format example: "02-16-2026 14:19:53" — MM-DD-YYYY HH:mm:ss
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/)
  if (!m) {
    // Fall back: try native Date parse
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  const [, mm, dd, yyyy, hh, mi, ss] = m
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}Z`).toISOString()
}

// ── Side-effects helpers (kept local so processPndWebhookEvent is concise) ──

async function sendShipmentUpdate(orderId: string, status: 'SHIPPED' | 'DELIVERED' | 'CANCELLED'): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderCode: true, name: true, email: true, shippingOption: true, trackingUrl: true },
  })
  if (!order?.email) return
  const settings = await getSiteSettings()
  const { subject, html } = await renderEmail('shipment-update', {
    orderId:        order.id,
    recipientName:  order.name,
    status,
    trackingUrl:    null,                                       // internal page only
    shippingOption: order.shippingOption ?? null,
    siteUrl:        settings.storeUrl,
    siteName:       settings.siteName,
    tagline:        settings.seo.description,
  })
  await sendEmailLogged('shipment-update', { to: order.email, subject, html, context: { orderId: order.id, status, source: 'pickndrop-webhook' } })
}

async function sendDeliveryException(orderId: string, kind: DeliveryExceptionKind, comment: string | null): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderCode: true, name: true, email: true },
  })
  if (!order?.email) return
  const settings = await getSiteSettings()
  const code     = order.orderCode ?? order.id.slice(0, 8).toUpperCase()
  const { subject, html } = await renderEmail('delivery-exception', {
    orderId:       order.id,
    orderCode:     order.orderCode,
    recipientName: order.name,
    kind,
    comment,
    orderUrl:      `${settings.storeUrl}/track-order/${encodeURIComponent(code)}`,
    siteUrl:       settings.storeUrl,
    siteName:      settings.siteName,
    tagline:       settings.seo.description,
  })
  await sendEmailLogged('delivery-exception', { to: order.email, subject, html, context: { orderId: order.id, kind } })
}
