// Pure helpers for copying Daraz orders: shaping API rows for the database and wording alerts.

export const SHOPS = {
  balapasa:  { label: 'Bala Pasa', control: 'ordersBalapasa' },
  trendwave: { label: 'TrendWave', control: 'ordersTrendwave' },
}

/** "2026-11-20 01:05:00 +0800" → Date. Returns null for anything unparseable. */
export function parseDarazTime(text) {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})\s*([+-]\d{2}):?(\d{2})$/.exec(String(text ?? '').trim())
  if (!m) return null
  const d = new Date(`${m[1]}T${m[2]}${m[3]}:${m[4]}`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Date → the ISO 8601 form the orders API wants ("2026-11-20T01:05:00+00:00"). */
export const darazTimeParam = date => date.toISOString().replace(/\.\d+Z$/, '+00:00')

const text = v => (v == null ? '' : String(v).trim())
const money = v => Number(v) || 0

/** One /orders/get row → a marketplace_orders row (without id). */
export function mapOrder(o, shop) {
  const a = o.address_shipping ?? {}
  const name = [a.first_name, a.last_name].map(text).filter(Boolean).join(' ')
    || [o.customer_first_name, o.customer_last_name].map(text).filter(Boolean).join(' ')
  const placedAt = parseDarazTime(o.created_at)
  if (!o.order_id || !placedAt) return null
  return {
    shop,
    externalId: String(o.order_id),
    status: (Array.isArray(o.statuses) ? o.statuses : [o.statuses]).map(text).filter(Boolean).join(', ') || 'unknown',
    itemsCount: Number(o.items_count) || 0,
    total: money(o.price),
    shippingFee: money(o.shipping_fee),
    paymentMethod: text(o.payment_method),
    customerName: name,
    phone: text(a.phone),
    city: [a.address3, a.city].map(text).filter(Boolean)[0] ?? '',
    address: [a.address1, a.address2, a.address5, a.address4, a.address3].map(text).filter(Boolean).join(', '),
    placedAt,
    changedAt: parseDarazTime(o.updated_at) ?? placedAt,
  }
}

/** One order-item row → a marketplace_order_items row (without id / orderId). */
export function mapItem(i) {
  if (!i.order_item_id) return null
  return {
    externalItemId: String(i.order_item_id),
    externalOrderId: String(i.order_id),
    name: text(i.name) || 'Item',
    sku: text(i.sku),
    variation: text(i.variation),
    image: text(i.product_main_image) || null,
    itemPrice: money(i.item_price),
    paidPrice: money(i.paid_price),
    status: text(i.status),
    trackingCode: text(i.tracking_code),
    cancelReason: text(i.reason),
    productUrl: text(i.product_detail_url) || null,
  }
}

const CLOSED = /cancel|returned|failed|delivered|lost|damaged/i

/** Which freshly seen orders deserve an alert: new to us, still open, and placed recently.
 *  `firstRun` (nothing stored yet for the shop) alerts nothing, so linking a shop cannot flood the chat. */
export function ordersToAlert(mapped, knownIds, { firstRun = false, now = new Date(), maxAgeHours = 48 } = {}) {
  if (firstRun) return []
  return mapped.filter(o =>
    !knownIds.has(o.externalId)
    && !CLOSED.test(o.status)
    && now.getTime() - o.placedAt.getTime() <= maxAgeHours * 3_600_000)
}

/** WhatsApp text for new orders of one shop. `itemsByOrder` maps externalId → mapped items. */
export function alertText(shopLabel, orders, itemsByOrder = new Map()) {
  const lines = [`New Daraz order${orders.length === 1 ? '' : 's'} in ${shopLabel}: ${orders.length}`]
  for (const o of orders.slice(0, 8)) {
    lines.push(`#${o.externalId}  Rs ${Math.round(o.total)}  ${o.paymentMethod || 'payment n/a'}  ${o.city}`.trimEnd())
    for (const i of (itemsByOrder.get(o.externalId) ?? []).slice(0, 4)) {
      lines.push(`  - ${i.name.slice(0, 60)}${i.variation ? ` (${i.variation.slice(0, 40)})` : ''}`)
    }
  }
  if (orders.length > 8) lines.push(`and ${orders.length - 8} more`)
  return lines.join('\n')
}
