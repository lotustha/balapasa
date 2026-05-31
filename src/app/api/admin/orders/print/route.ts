import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import QRCode from 'qrcode'
import bwipjs from 'bwip-js/node'

// Env-based defaults. DB-backed shop info (from app_settings) is overlaid per
// request in buildStore(); `url` always stays on env — it backs functional QR
// links (track-order, /follow), so a blank/typo DB value must never break it.
const STORE = {
  name:    process.env.NEXT_PUBLIC_APP_NAME ?? 'Balapasa',
  url:     process.env.NEXT_PUBLIC_APP_URL  ?? 'https://balapasa.com',
  phone:   process.env.STORE_PHONE  ?? '9800000000',
  email:   process.env.STORE_EMAIL  ?? 'hello@balapasa.com',
  address: process.env.STORE_ADDRESS ?? 'Kathmandu, Nepal',
  pan:     process.env.STORE_PAN    ?? '',
}
type Store = typeof STORE

// Overlay admin-editable app_settings over env defaults. `||` (not `??`) so an
// existing-but-empty DB row falls back to env instead of rendering blank.
function buildStore(db: Record<string, string>): Store {
  return {
    name:    db.STORE_NAME    || STORE.name,
    url:     STORE.url,
    phone:   db.STORE_PHONE   || STORE.phone,
    email:   db.STORE_EMAIL   || STORE.email,
    address: db.STORE_ADDRESS || STORE.address,
    pan:     db.STORE_PAN     || STORE.pan,
  }
}
const VAT_RATE = 0.13

// ── Generators ────────────────────────────────────────────────────────────────

async function generateBarcodePng(text: string): Promise<string> {
  if (!text) return ''
  try {
    const png = await bwipjs.toBuffer({ bcid: 'code128', text, scale: 3, height: 15, includetext: true, textxalign: 'center' })
    return `data:image/png;base64,${Buffer.from(png).toString('base64')}`
  } catch { return '' }
}

async function generateBarcodes(orders: Awaited<ReturnType<typeof fetchOrders>>): Promise<string[]> {
  return Promise.all(orders.map(order => {
    const text = order.pathaoOrderId || order.pndOrderId || order.orderCode || order.id.slice(0, 12).toUpperCase()
    return generateBarcodePng(text)
  }))
}

async function generateQRSvgs(orders: Awaited<ReturnType<typeof fetchOrders>>, store: Store): Promise<string[]> {
  return Promise.all(orders.map(async order => {
    const url = order.orderCode
      ? `${store.url}/track-order?code=${encodeURIComponent(order.orderCode)}`
      : `${store.url}/track-order?id=${order.id}`
    try {
      const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 512 })
      return svg.replace('<svg ', '<svg width="100%" height="100%" ')
    } catch { return '' }
  }))
}

// ── Document generators ───────────────────────────────────────────────────────

// Invoice A6 — 105mm × 148mm compact
function invoice(orders: Awaited<ReturnType<typeof fetchOrders>>, store: Store, logoUrl = '', socialQrSvg = '') {
  return orders.map((order) => {
    const trackId   = order.pathaoOrderId || order.pndOrderId || null
    const invNo     = order.orderCode || order.id.slice(0, 8).toUpperCase()
    const isPartial = order.paymentMethod === 'PARTIAL_COD'
    const isCod     = order.paymentMethod === 'COD' || isPartial
    const collect   = isPartial ? (order.codAmount ?? order.total) : order.total
    const addr      = [order.house, order.road, order.address].filter(Boolean).join(', ')
    const date      = new Date(order.createdAt).toLocaleDateString('en-NP', {day:'numeric',month:'short',year:'numeric'})
    return `
<div class="page inv-a6">
  <div class="inv-a6-hdr">
    <div class="inv-a6-lhs">
      ${logoUrl ? `<img src="${logoUrl}" alt="${store.name}" class="inv-logo-sm" />` : ''}
      <div class="${logoUrl ? 'inv-a6-name-sub' : 'inv-a6-brand'}">${store.name}</div>
      <div class="inv-a6-store">${store.address}</div>
      <div class="inv-a6-store">${store.phone}${store.email ? ' · ' + store.email : ''}</div>
      ${store.pan ? `<div class="inv-a6-store">PAN: ${store.pan}</div>` : ''}
    </div>
    <div class="inv-a6-hdr-r">
      <div class="inv-a6-title">INVOICE</div>
      <div class="inv-a6-no">#${invNo}</div>
      <div class="inv-a6-date">${date}</div>
      <div class="inv-a6-badge ${order.paymentStatus === 'PAID' ? 'paid' : 'unpaid'}">${order.paymentStatus}</div>
    </div>
  </div>
  <div class="inv-a6-cust">
    <div class="inv-a6-sec">BILL TO / SHIP TO</div>
    <div class="inv-a6-cust-name">${order.name}</div>
    <div class="inv-a6-cust-line">${[addr, order.city].filter(Boolean).join(' — ')}</div>
    <div class="inv-a6-cust-line">${order.phone}${order.email ? ' · ' + order.email : ''}</div>
    ${trackId ? `<div class="inv-a6-track">Tracking: ${trackId}</div>` : ''}
  </div>
  <table class="inv-a6-tbl">
    <thead><tr>
      <th class="inv-a6-th-item">Item</th>
      <th class="inv-a6-th-q">Qty</th>
      <th class="inv-a6-th-a">Amount</th>
    </tr></thead>
    <tbody>${order.items.map(it => `
      <tr>
        <td class="inv-a6-td-item">${it.name}<br><span class="inv-a6-unit">@ NPR ${it.price.toLocaleString()}</span></td>
        <td class="inv-a6-td-c">${it.quantity}</td>
        <td class="inv-a6-td-r">NPR ${(it.price * it.quantity).toLocaleString()}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="inv-a6-totals">
    <div class="inv-a6-tr"><span>Subtotal</span><span>NPR ${order.subtotal.toLocaleString()}</span></div>
    ${order.hasVat ? `<div class="inv-a6-tr sm"><span>VAT (13%) incl.</span><span>NPR ${order.vatAmount.toLocaleString()}</span></div>` : ''}
    ${order.deliveryCharge > 0 ? `<div class="inv-a6-tr"><span>Delivery</span><span>NPR ${order.deliveryCharge.toLocaleString()}</span></div>` : ''}
    <div class="inv-a6-tr grand"><span>TOTAL</span><span>NPR ${order.total.toLocaleString()}</span></div>
    ${isCod ? `<div class="inv-a6-cod${isPartial ? ' partial' : ''}"><span>${isPartial ? 'COLLECT ON DELIVERY' : 'CASH ON DELIVERY'}</span><span>NPR ${collect.toLocaleString()}</span></div>` : ''}
  </div>
  <div class="inv-a6-footer">
    ${socialQrSvg ? `
    <div class="inv-footer-social">
      <div class="inv-a6-footer-qr">${socialQrSvg}</div>
      <div class="inv-footer-follow">Follow us</div>
    </div>` : ''}
  </div>
</div>`
  }).join('')
}

// Invoice A5 — 148mm × 210mm standard
function invoiceA5(orders: Awaited<ReturnType<typeof fetchOrders>>, store: Store, logoUrl = '', socialQrSvg = '') {
  return orders.map((order) => {
    const trackId   = order.pathaoOrderId || order.pndOrderId || null
    const invNo     = order.orderCode || order.id.slice(0, 8).toUpperCase()
    const isPartial = order.paymentMethod === 'PARTIAL_COD'
    const isCod     = order.paymentMethod === 'COD' || isPartial
    const collect   = isPartial ? (order.codAmount ?? order.total) : order.total
    const addr      = [order.house, order.road, order.address].filter(Boolean).join(', ')
    const date      = new Date(order.createdAt).toLocaleDateString('en-NP', {day:'numeric',month:'short',year:'numeric'})
    return `
<div class="page inv-a5">
  <div class="inv-a5-hdr">
    <div class="inv-a5-lhs">
      ${logoUrl ? `<img src="${logoUrl}" alt="${store.name}" class="inv-logo-md" />` : ''}
      <div class="${logoUrl ? 'inv-a5-name-sub' : 'inv-a5-brand'}">${store.name}</div>
      <div class="inv-a5-store">${store.address}</div>
      <div class="inv-a5-store">${store.phone}${store.email ? ' · ' + store.email : ''}</div>
      ${store.pan ? `<div class="inv-a5-store">PAN: ${store.pan}</div>` : ''}
    </div>
    <div class="inv-a5-hdr-r">
      <div class="inv-a5-title">INVOICE</div>
      <div class="inv-a5-no">#${invNo}</div>
      <div class="inv-a5-date">${date}</div>
      <div class="inv-a5-badge ${order.paymentStatus === 'PAID' ? 'paid' : 'unpaid'}">${order.paymentStatus}</div>
    </div>
  </div>
  <div class="inv-a5-cust">
    <div class="inv-a5-sec">BILL TO / SHIP TO</div>
    <div class="inv-a5-cust-name">${order.name}</div>
    <div class="inv-a5-cust-line">${[addr, order.city].filter(Boolean).join(' — ')}</div>
    <div class="inv-a5-cust-line">${order.phone}${order.email ? ' · ' + order.email : ''}</div>
    ${trackId ? `<div class="inv-a5-track">Tracking: ${trackId}</div>` : ''}
  </div>
  <table class="inv-a5-tbl">
    <thead><tr>
      <th class="inv-a5-th-item">Item</th>
      <th class="inv-a5-th-q">Qty</th>
      <th class="inv-a5-th-a">Amount</th>
    </tr></thead>
    <tbody>${order.items.map(it => `
      <tr>
        <td class="inv-a5-td-item">${it.name}<br><span class="inv-a5-unit">@ NPR ${it.price.toLocaleString()}</span></td>
        <td class="inv-a5-td-c">${it.quantity}</td>
        <td class="inv-a5-td-r">NPR ${(it.price * it.quantity).toLocaleString()}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="inv-a5-totals">
    <div class="inv-a5-tr"><span>Subtotal</span><span>NPR ${order.subtotal.toLocaleString()}</span></div>
    ${order.hasVat ? `<div class="inv-a5-tr sm"><span>VAT (13%) incl.</span><span>NPR ${order.vatAmount.toLocaleString()}</span></div>` : ''}
    ${order.deliveryCharge > 0 ? `<div class="inv-a5-tr"><span>Delivery</span><span>NPR ${order.deliveryCharge.toLocaleString()}</span></div>` : ''}
    <div class="inv-a5-tr grand"><span>TOTAL</span><span>NPR ${order.total.toLocaleString()}</span></div>
    ${isCod ? `<div class="inv-a5-cod${isPartial ? ' partial' : ''}"><span>${isPartial ? 'COLLECT ON DELIVERY' : 'CASH ON DELIVERY'}</span><span>NPR ${collect.toLocaleString()}</span></div>` : ''}
  </div>
  <div class="inv-a5-footer">
    <div class="inv-a5-footer-mid">
      <div class="inv-a5-footer-thanks">Thank you for your order!</div>
      <div class="inv-a5-footer-sub">${store.url}</div>
    </div>
    ${socialQrSvg ? `
    <div class="inv-footer-social">
      <div class="inv-a5-footer-qr">${socialQrSvg}</div>
      <div class="inv-footer-follow">Follow us</div>
    </div>` : ''}
  </div>
</div>`
  }).join('')
}

// Invoice A4 — 210mm × 297mm full-page professional
function invoiceA4(orders: Awaited<ReturnType<typeof fetchOrders>>, store: Store, logoUrl = '', socialQrSvg = '') {
  return orders.map((order) => {
    const trackId   = order.pathaoOrderId || order.pndOrderId || null
    const invNo     = order.orderCode || order.id.slice(0, 8).toUpperCase()
    const isPartial = order.paymentMethod === 'PARTIAL_COD'
    const isCod     = order.paymentMethod === 'COD' || isPartial
    const collect   = isPartial ? (order.codAmount ?? order.total) : order.total
    const addr      = [order.house, order.road, order.address].filter(Boolean).join(', ')
    const date      = new Date(order.createdAt).toLocaleDateString('en-NP', {day:'numeric',month:'long',year:'numeric'})
    return `
<div class="page inv-a4-page">
  <div class="inv-a4-hdr">
    <div class="inv-a4-lhs">
      ${logoUrl ? `<img src="${logoUrl}" alt="${store.name}" class="inv-logo-lg" />` : ''}
      <div class="${logoUrl ? 'inv-a4-name-sub' : 'brand'}">${store.name}</div>
      <div class="inv-a4-store-detail">${store.address}</div>
      <div class="inv-a4-store-detail">${store.phone}${store.email ? ' · ' + store.email : ''}</div>
      ${store.pan ? `<div class="inv-a4-store-detail">PAN: ${store.pan}</div>` : ''}
    </div>
    <div class="inv-a4-rhs">
      <div class="doc-title">INVOICE</div>
      <div class="inv-meta"><span class="label">Invoice No.</span><span class="value">#${invNo}</span></div>
      <div class="inv-meta"><span class="label">Date</span><span class="value">${date}</span></div>
      <div class="inv-meta"><span class="label">Payment</span><span class="value">${order.paymentMethod}</span></div>
      <div class="status-badge ${order.paymentStatus === 'PAID' ? 'paid' : 'unpaid'}">${order.paymentStatus}</div>
    </div>
  </div>
  <div class="addr-row">
    <div class="addr-box">
      <div class="addr-label">Bill To</div>
      <div class="addr-name">${order.name}</div>
      <div class="addr-line">${addr || order.address}</div>
      <div class="addr-line">${order.city}</div>
      ${order.phone ? `<div class="addr-line">${order.phone}</div>` : ''}
      ${order.email ? `<div class="addr-line">${order.email}</div>` : ''}
    </div>
    <div class="addr-box">
      <div class="addr-label">Ship To</div>
      <div class="addr-name">${order.name}</div>
      <div class="addr-line">${addr || order.address}</div>
      <div class="addr-line">${order.city}</div>
      <div class="addr-line">${order.phone}</div>
      ${trackId ? `<div class="addr-line inv-a4-tracking">Tracking: ${trackId}</div>` : ''}
    </div>
  </div>
  <table class="items-table">
    <thead><tr>
      <th style="width:36px">#</th>
      <th>Item Description</th>
      <th style="width:50px">Qty</th>
      <th style="width:80px">Unit Price</th>
      <th style="width:90px">Amount</th>
    </tr></thead>
    <tbody>${order.items.map((it, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${it.name}</td>
        <td class="center">${it.quantity}</td>
        <td class="right">NPR ${it.price.toLocaleString()}</td>
        <td class="right">NPR ${(it.price * it.quantity).toLocaleString()}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="totals-section">
    <div class="totals-box">
      <div class="total-row"><span>Subtotal</span><span>NPR ${order.subtotal.toLocaleString()}</span></div>
      ${order.hasVat ? `<div class="total-row muted"><span>VAT (13%) incl.</span><span>NPR ${order.vatAmount.toLocaleString()}</span></div>` : ''}
      ${order.deliveryCharge > 0 ? `<div class="total-row"><span>Delivery Charge</span><span>NPR ${order.deliveryCharge.toLocaleString()}</span></div>` : ''}
      <div class="total-row grand"><span>TOTAL</span><span>NPR ${order.total.toLocaleString()}</span></div>
    </div>
  </div>
  <div class="inv-a4-footer">
    ${isCod ? `
    <div class="inv-a4-footer-cod">
      <span class="inv-a4-footer-cod-tag">${isPartial ? 'COLLECT ON DELIVERY' : 'CASH ON DELIVERY'}</span>
      <span class="inv-a4-footer-cod-amt">NPR ${collect.toLocaleString()}</span>
    </div>
    ${isPartial && order.advancePaid ? `<div class="inv-a4-footer-cod-sub">Advance paid: NPR ${order.advancePaid.toLocaleString()} via ${order.advanceMethod ?? 'online'}</div>` : ''}
    ` : ''}
    <div class="inv-a4-footer-row">
      <div class="inv-a4-footer-mid">
        <div class="inv-a4-footer-thanks">Thank you for your order!</div>
        <div class="inv-a4-footer-note">${store.url}</div>
        <div class="inv-a4-footer-note">Computer-generated document · No signature required</div>
      </div>
      ${socialQrSvg ? `
      <div class="inv-footer-social">
        <div class="inv-a4-footer-qr">${socialQrSvg}</div>
        <div class="inv-a4-footer-scan">Follow us</div>
      </div>` : ''}
    </div>
  </div>
</div>`
  }).join('')
}

// Shipping Label — A6 (105mm × 148mm), one per page. Bottom: Code 128 barcode.
function shippingLabel(orders: Awaited<ReturnType<typeof fetchOrders>>, store: Store, barcodePngs: string[] = []) {
  return orders.map((order, idx) => {
    const barcodeDataUri = barcodePngs[idx] ?? ''
    const trackId   = order.pathaoOrderId || order.pndOrderId || null
    const displayNo = order.orderCode || order.id.slice(0, 8).toUpperCase()
    const isPartial = order.paymentMethod === 'PARTIAL_COD'
    const isCod     = order.paymentMethod === 'COD' || isPartial
    const collect   = isPartial ? (order.codAmount ?? order.total) : order.total
    const totalItems = order.items.reduce((s, i) => s + i.quantity, 0)
    const addr      = [order.house, order.road, order.address].filter(Boolean).join(', ')
    return `
<div class="page label-page">
  <div class="lbl-hdr">
    <div class="lbl-brand">${store.name}</div>
    <div class="lbl-ordno">#${displayNo}</div>
  </div>
  <div class="lbl-from">
    <span class="lbl-sec">FROM</span>
    <span class="lbl-from-name">${store.name}</span>
    <span class="lbl-from-addr">${store.address} · ${store.phone}</span>
  </div>
  <div class="lbl-divider">▼ &nbsp; ▼ &nbsp; ▼ &nbsp;&nbsp; DELIVER TO &nbsp;&nbsp; ▼ &nbsp; ▼ &nbsp; ▼</div>
  <div class="lbl-to">
    <div class="lbl-to-name">${order.name}</div>
    ${addr ? `<div class="lbl-to-addr">${addr}</div>` : ''}
    <div class="lbl-to-city">${order.city.toUpperCase()}</div>
    <div class="lbl-to-phone">${order.phone}</div>
  </div>
  ${trackId ? `
  <div class="lbl-track">
    <span class="lbl-sec lbl-sec-inv">TRACKING</span>
    <span class="lbl-track-num">${trackId}</span>
  </div>` : ''}
  <div class="lbl-bottom">
    <div class="lbl-cod ${isCod ? 'cod' : 'prepaid'}">
      <div class="lbl-cod-tag">${isCod ? (isPartial ? 'PARTIAL COD' : 'CASH ON DELIVERY') : 'PREPAID'}</div>
      <div class="lbl-cod-amt">NPR ${collect.toLocaleString()}</div>
    </div>
    <div class="lbl-items">
      <div class="lbl-items-n">${totalItems}</div>
      <div class="lbl-items-l">ITEM${totalItems !== 1 ? 'S' : ''}</div>
    </div>
  </div>
  <div class="lbl-contents">
    <div class="lbl-sec">CONTENTS</div>
    <div class="lbl-contents-items">
      ${order.items.map(it => `<span class="lbl-contents-item"><strong>${it.quantity}×</strong> ${it.name}</span>`).join('')}
    </div>
  </div>
  <div class="lbl-bc-wrap">
    ${barcodeDataUri
      ? `<img src="${barcodeDataUri}" class="lbl-bc-img" alt="${trackId ?? displayNo}" />`
      : `<div class="lbl-bc-fallback">${trackId ?? displayNo}</div>`}
  </div>
</div>`
  }).join('')
}

// Air Waybill — unified for A6 (105×148mm) and A5 (148×210mm)
function awb(orders: Awaited<ReturnType<typeof fetchOrders>>, store: Store, qrSvgs: string[] = [], size: 'a6' | 'a5' = 'a6') {
  const pageCls = size === 'a5' ? 'awb-a5-page' : 'awb-page'
  const qrDim   = size === 'a5' ? '35mm' : '26mm'
  return orders.map((order, idx) => {
    const qrSvg    = qrSvgs[idx] ?? ''
    const trackId  = order.pathaoOrderId || order.pndOrderId || null
    const awbNo    = trackId || order.orderCode || order.id.slice(0, 8).toUpperCase()
    const displayNo = order.orderCode || order.id.slice(0, 8).toUpperCase()
    const isPartial = order.paymentMethod === 'PARTIAL_COD'
    const isCod     = order.paymentMethod === 'COD' || isPartial
    const collect   = isPartial ? (order.codAmount ?? order.total) : order.total
    const totalItems = order.items.reduce((s, i) => s + i.quantity, 0)
    return `
<div class="page ${pageCls}">
  <div class="awb-hdr">
    <div class="awb-brand">${store.name}</div>
    <div class="awb-orderno">#${displayNo}</div>
  </div>
  <div class="awb-from-row">
    <span class="awb-from-label">FROM</span>
    <span class="awb-from-val">${store.name} · ${store.address} · ${store.phone}</span>
  </div>
  <div class="awb-to-box">
    <div class="awb-to-label">DELIVER TO</div>
    <div class="awb-to-name">${order.name}</div>
    <div class="awb-to-addr">${[order.house, order.road, order.address].filter(Boolean).join(', ')}</div>
    <div class="awb-to-city">${order.city.toUpperCase()}</div>
    <div class="awb-to-phone">${order.phone}</div>
  </div>
  ${trackId ? `
  <div class="awb-track-box">
    <div class="awb-track-label">TRACKING NUMBER</div>
    <div class="awb-track-num">${trackId}</div>
  </div>` : ''}
  <div class="awb-items-wrap">
    <div class="awb-items-label">ITEMS (${totalItems} pc${totalItems !== 1 ? 's' : ''})</div>
    <table class="awb-tbl">
      ${order.items.map(it => `
        <tr>
          <td class="awb-tbl-qty">${it.quantity}×</td>
          <td class="awb-tbl-name">${it.name}</td>
          <td class="awb-tbl-price">NPR ${(it.price * it.quantity).toLocaleString()}</td>
        </tr>`).join('')}
      <tr class="awb-tbl-total">
        <td colspan="2">Total</td>
        <td class="awb-tbl-price">NPR ${order.total.toLocaleString()}</td>
      </tr>
    </table>
  </div>
  ${order.notes ? `<div class="awb-notes"><strong>Note:</strong> ${order.notes}</div>` : ''}
  <div class="awb-pay-block ${isCod ? 'cod' : 'prepaid'}">
    <div class="awb-pay-tag">${isCod ? 'CASH ON DELIVERY' : 'PREPAID'}</div>
    <div class="awb-pay-amt">NPR ${collect.toLocaleString()}</div>
    ${isPartial && order.advancePaid ? `<div class="awb-pay-sub">Advance: NPR ${order.advancePaid.toLocaleString()} · Collect: NPR ${collect.toLocaleString()}</div>` : ''}
  </div>
  <div class="awb-qr-wrap">
    ${qrSvg ? `<div class="awb-qr" style="width:${qrDim};height:${qrDim}">${qrSvg}</div>` : ''}
    <div class="awb-qr-label">${awbNo} &nbsp;·&nbsp; ${new Date(order.createdAt).toLocaleDateString('en-NP',{day:'2-digit',month:'short',year:'numeric'})}</div>
  </div>
</div>`
  }).join('')
}

// Air Waybill A4 — 210mm × 297mm professional layout
function awbA4(orders: Awaited<ReturnType<typeof fetchOrders>>, store: Store, qrSvgs: string[] = []) {
  return orders.map((order, idx) => {
    const qrSvg    = qrSvgs[idx] ?? ''
    const trackId  = order.pathaoOrderId || order.pndOrderId || null
    const awbNo    = trackId || order.orderCode || order.id.slice(0, 8).toUpperCase()
    const displayNo = order.orderCode || order.id.slice(0, 8).toUpperCase()
    const isPartial = order.paymentMethod === 'PARTIAL_COD'
    const isCod     = order.paymentMethod === 'COD' || isPartial
    const collect   = isPartial ? (order.codAmount ?? order.total) : order.total
    const totalItems = order.items.reduce((s, i) => s + i.quantity, 0)
    const addr      = [order.house, order.road, order.address].filter(Boolean).join(', ')
    const date      = new Date(order.createdAt).toLocaleDateString('en-NP', {day:'numeric',month:'long',year:'numeric'})
    return `
<div class="page awb-a4-page">
  <div class="awb-a4-hdr">
    <div class="awb-a4-brand">${store.name}</div>
    <div class="awb-a4-title-block">
      <div class="awb-a4-title">AIR WAYBILL</div>
      <div class="awb-a4-no">#${displayNo}</div>
      <div class="awb-a4-date">${date}</div>
    </div>
  </div>
  <div class="awb-a4-addr-row">
    <div class="awb-a4-addr-box">
      <div class="awb-a4-addr-label">SENDER</div>
      <div class="awb-a4-addr-name">${store.name}</div>
      <div class="awb-a4-addr-line">${store.address}</div>
      <div class="awb-a4-addr-line">${store.phone}</div>
      ${store.email ? `<div class="awb-a4-addr-line">${store.email}</div>` : ''}
    </div>
    <div class="awb-a4-addr-box awb-a4-addr-to">
      <div class="awb-a4-addr-label">RECIPIENT</div>
      <div class="awb-a4-addr-name">${order.name}</div>
      <div class="awb-a4-addr-line">${addr || order.address}</div>
      <div class="awb-a4-addr-line awb-a4-city">${order.city.toUpperCase()}</div>
      <div class="awb-a4-addr-line awb-a4-phone">${order.phone}</div>
    </div>
  </div>
  ${trackId ? `
  <div class="awb-a4-track-block">
    <div class="awb-a4-track-label">TRACKING NUMBER</div>
    <div class="awb-a4-track-num">${trackId}</div>
  </div>` : ''}
  <table class="awb-a4-tbl">
    <thead><tr>
      <th style="width:36px">#</th>
      <th>Item Description</th>
      <th style="width:50px">Qty</th>
      <th style="width:90px">Unit Price</th>
      <th style="width:100px">Amount</th>
    </tr></thead>
    <tbody>
      ${order.items.map((it, i) => `
        <tr>
          <td class="center">${i + 1}</td>
          <td>${it.name}</td>
          <td class="center">${it.quantity}</td>
          <td class="right">NPR ${it.price.toLocaleString()}</td>
          <td class="right">NPR ${(it.price * it.quantity).toLocaleString()}</td>
        </tr>`).join('')}
      <tr class="awb-a4-tbl-total">
        <td colspan="4">Total (${totalItems} item${totalItems !== 1 ? 's' : ''})</td>
        <td class="right">NPR ${order.total.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>
  ${order.notes ? `<div class="notes-box"><strong>Note:</strong> ${order.notes}</div>` : ''}
  ${isCod ? `
  <div class="inv-a4-cod">
    <div>
      <div class="inv-a4-cod-tag">${isPartial ? 'COLLECT ON DELIVERY' : 'CASH ON DELIVERY'}</div>
      ${isPartial && order.advancePaid ? `<div class="inv-a4-cod-sub">Advance paid: NPR ${order.advancePaid.toLocaleString()} · Collect: NPR ${collect.toLocaleString()}</div>` : ''}
    </div>
    <div class="inv-a4-cod-amt">NPR ${collect.toLocaleString()}</div>
  </div>` : ''}
  <div class="awb-a4-footer">
    ${qrSvg ? `<div class="awb-a4-qr">${qrSvg}</div>` : ''}
    <div class="awb-a4-footer-text">
      <div class="awb-a4-awbno">${awbNo}</div>
      <div class="awb-a4-footer-meta">${store.name} &nbsp;·&nbsp; ${store.url} &nbsp;·&nbsp; ${store.phone}</div>
    </div>
  </div>
</div>`
  }).join('')
}

// Compact list-style packing slip — multiple orders per A4 page
function packingSlipCompact(orders: Awaited<ReturnType<typeof fetchOrders>>, store: Store) {
  const rows = orders.map((order, idx) => {
    const itemCount = order.items.reduce((s, i) => s + i.quantity, 0)
    const codText = order.paymentMethod === 'COD'
      ? `COD ${order.total.toLocaleString()}`
      : order.paymentMethod === 'PARTIAL_COD'
      ? `PARTIAL COD ${(order.codAmount ?? order.total).toLocaleString()}`
      : 'PREPAID'
    return `
    <div class="psc-row">
      <div class="psc-head">
        <div class="psc-idx">${idx + 1}</div>
        <div class="psc-customer">
          <div class="psc-name">${order.name} <span class="psc-phone">· ${order.phone}</span></div>
          <div class="psc-addr">${[order.house, order.road, order.address].filter(Boolean).join(', ')} — <strong>${order.city.toUpperCase()}</strong></div>
        </div>
        <div class="psc-meta">
          <div class="psc-order">#${order.id.slice(0, 8).toUpperCase()}</div>
          <div class="psc-pay ${order.paymentMethod === 'COD' || order.paymentMethod === 'PARTIAL_COD' ? 'cod' : 'paid'}">${codText}</div>
          ${order.pathaoOrderId ? `<div class="psc-track">${order.pathaoOrderId}</div>` : ''}
        </div>
      </div>
      <div class="psc-items">
        ${order.items.map(it => `<span class="psc-item"><strong>${it.quantity}×</strong> ${it.name}</span>`).join('')}
      </div>
      <div class="psc-foot">
        <span>Total items: <strong>${itemCount}</strong></span>
        <span class="psc-check">Packed ☐&nbsp;&nbsp;&nbsp;Checked ☐</span>
      </div>
    </div>`
  }).join('')
  return `
<div class="page psc-page">
  <div class="psc-pageheader">
    <div>
      <div class="brand">${store.name}</div>
      <div class="muted">${store.address} · ${store.phone}</div>
    </div>
    <div style="text-align:right">
      <div class="doc-title" style="font-size:20px">PACKING LIST</div>
      <div class="muted">${new Date().toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })} · ${orders.length} order${orders.length !== 1 ? 's' : ''}</div>
    </div>
  </div>
  ${rows}
  <div class="psc-totals">
    <strong>Total orders:</strong> ${orders.length}
    &nbsp;·&nbsp;
    <strong>Total items:</strong> ${orders.reduce((s, o) => s + o.items.reduce((x, i) => x + i.quantity, 0), 0)}
  </div>
</div>`
}

function packingSlip(orders: Awaited<ReturnType<typeof fetchOrders>>, store: Store) {
  return orders.map(order => `
<div class="page packing-page">
  <div class="ps-header">
    <div>
      <div class="brand">${store.name}</div>
      <div class="doc-title" style="font-size:18px">PACKING SLIP</div>
    </div>
    <div style="text-align:right">
      <div class="inv-meta"><span class="label">Order</span><span class="value">#${order.id.slice(0,8).toUpperCase()}</span></div>
      <div class="inv-meta"><span class="label">Date</span><span class="value">${new Date(order.createdAt).toLocaleDateString('en-NP',{day:'numeric',month:'short',year:'numeric'})}</span></div>
    </div>
  </div>
  <div class="addr-row">
    <div class="addr-box">
      <div class="addr-label">Ship To</div>
      <div class="addr-name">${order.name}</div>
      <div class="addr-line">${[order.house,order.road,order.address].filter(Boolean).join(', ')}</div>
      <div class="addr-line">${order.city}</div>
      <div class="addr-line">${order.phone}</div>
    </div>
    <div class="addr-box" style="text-align:right">
      <div class="addr-label">Packed By</div>
      <div class="addr-line">_______________</div>
      <div class="addr-label" style="margin-top:12px">Checked By</div>
      <div class="addr-line">_______________</div>
    </div>
  </div>
  <table class="items-table">
    <thead><tr>
      <th style="width:40px">#</th>
      <th>Item</th>
      <th style="width:80px">Qty</th>
      <th style="width:60px">Packed</th>
    </tr></thead>
    <tbody>${order.items.map((item,i) => `
      <tr>
        <td class="center">${i+1}</td>
        <td>${item.name}</td>
        <td class="center">${item.quantity}</td>
        <td class="center">☐</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="ps-summary">
    <span>Total Items: <strong>${order.items.reduce((s,i)=>s+i.quantity,0)}</strong></span>
    <span>Payment: <strong class="${order.paymentMethod==='COD'?'cod-text':'paid-text'}">${order.paymentMethod}</strong></span>
    ${order.pathaoOrderId ? `<span>Tracking: <strong>${order.pathaoOrderId}</strong></span>` : ''}
  </div>
  <div class="ps-message">
    <strong>Thank you for your order!</strong>
    <span>Questions? Contact us at ${store.email} or ${store.phone}</span>
  </div>
</div>`).join('')
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #111; background: #fff; }
.page { page-break-after: always; }
.page:last-child { page-break-after: auto; }

/* ── Logos ── */
.inv-logo-sm { height: 9mm; width: auto; object-fit: contain; display: block; max-width: 24mm; margin-bottom: 1.5mm; }
.inv-logo-md { height: 12mm; width: auto; object-fit: contain; display: block; max-width: 36mm; margin-bottom: 2mm; }
.inv-logo-lg { height: 18mm; width: auto; object-fit: contain; display: block; max-width: 52mm; margin-bottom: 2mm; }

/* ── Shared utility (A4 invoice + packing slip + AWB A4) ── */
.brand { font-size: 22px; font-weight: 900; letter-spacing: -1px; color: #16A34A; }
.doc-title { font-size: 24px; font-weight: 900; color: #111; letter-spacing: 1px; }
.inv-meta { display: flex; gap: 8px; justify-content: flex-end; margin-top: 3px; font-size: 11px; }
.inv-meta .label { color: #666; }
.inv-meta .value { font-weight: 700; }
.status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-top: 4px; }
.status-badge.paid { background: #d1fae5; color: #065f46; }
.status-badge.unpaid { background: #fef3c7; color: #92400e; }
.addr-row { display: flex; gap: 10mm; margin-bottom: 6mm; }
.addr-box { flex: 1; }
.addr-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #999; margin-bottom: 4px; }
.addr-name { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
.addr-line { font-size: 11px; color: #444; line-height: 1.6; }
.items-table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
.items-table th { background: #f8f9fa; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #dee2e6; }
.items-table td { padding: 8px; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
.items-table .center { text-align: center; }
.items-table .right { text-align: right; }
.totals-section { display: flex; justify-content: flex-end; margin-bottom: 6mm; }
.totals-box { min-width: 80mm; }
.total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
.total-row.muted { color: #888; font-size: 11px; }
.total-row.grand { font-size: 16px; font-weight: 900; border-top: 2px solid #111; border-bottom: none; padding-top: 6px; }
.muted { color: #888; font-size: 11px; }
.notes-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 4mm 5mm; margin-bottom: 6mm; font-size: 12px; }

/* ── Invoice A4 ── */
.inv-a4-page { padding: 14mm 16mm; width: 210mm; margin: 0; }
.inv-a4-hdr { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 6mm; border-bottom: 3px solid #111; margin-bottom: 7mm; gap: 10mm; }
.inv-a4-lhs { flex: 1; }
.inv-a4-rhs { text-align: right; flex-shrink: 0; }
.inv-a4-name-sub { font-size: 22px; font-weight: 900; letter-spacing: -1px; color: #16A34A; }
.inv-a4-store-detail { font-size: 11px; color: #666; line-height: 1.65; }
.inv-a4-tracking { color: #16A34A; font-weight: 700; font-family: monospace; }
.inv-a4-cod { border: 2px solid #f59e0b; background: #fef3c7; border-radius: 8px; padding: 5mm 7mm; margin-bottom: 6mm; display: flex; align-items: center; justify-content: space-between; gap: 4mm; }
.inv-a4-cod-tag { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #78350f; }
.inv-a4-cod-sub { font-size: 10px; color: #92400e; margin-top: 2px; }
.inv-a4-cod-amt { font-size: 26px; font-weight: 900; color: #111; white-space: nowrap; }
.inv-a4-footer { margin-top: auto; padding-top: 5mm; border-top: 1.5px solid #e5e7eb; display: flex; flex-direction: column; gap: 3mm; flex-shrink: 0; break-inside: avoid; page-break-inside: avoid; }
.inv-a4-footer-cod { display: flex; justify-content: space-between; align-items: center; background: #fef3c7; border: 2px solid #f59e0b; border-radius: 6px; padding: 3.5mm 5mm; }
.inv-a4-footer-cod-tag { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #78350f; }
.inv-a4-footer-cod-amt { font-size: 22px; font-weight: 900; color: #111; white-space: nowrap; }
.inv-a4-footer-cod-sub { font-size: 9px; color: #92400e; margin-top: -2mm; }
.inv-a4-footer-row { display: flex; align-items: center; gap: 8mm; }
.inv-a4-footer-mid { flex: 1; }
.inv-a4-footer-thanks { font-size: 15px; font-weight: 700; color: #111; margin-bottom: 1.5mm; }
.inv-a4-footer-note { font-size: 9.5px; color: #9ca3af; line-height: 1.6; }
.inv-a4-footer-qr { width: 26mm; height: 26mm; display: block; }
.inv-a4-footer-qr svg { width: 100% !important; height: 100% !important; display: block; }
.inv-a4-footer-scan { font-size: 8px; color: #9ca3af; text-align: center; margin-top: 1.5mm; text-transform: uppercase; letter-spacing: 0.5px; }
/* Shared social follow block across all invoice sizes */
.inv-footer-social { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.inv-footer-follow { font-size: 6.5px; color: #9ca3af; text-align: center; margin-top: 0.5mm; text-transform: uppercase; letter-spacing: 0.5px; }

/* ── Invoice A6 (105mm × 148mm) ── */
.inv-a6 { width: 105mm; min-height: 148mm; padding: 4mm 5mm; margin: 0; display: flex; flex-direction: column; gap: 2mm; box-sizing: border-box; }
.inv-a6 * { box-sizing: border-box; word-break: break-word; overflow-wrap: anywhere; }
.inv-a6-hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 2mm; gap: 3mm; flex-shrink: 0; }
.inv-a6-lhs { flex: 1; min-width: 0; }
.inv-a6-brand { font-size: 15px; font-weight: 900; color: #16A34A; letter-spacing: -0.5px; }
.inv-a6-name-sub { font-size: 11px; font-weight: 800; color: #333; letter-spacing: -0.3px; }
.inv-a6-store { font-size: 7.5px; color: #888; line-height: 1.55; }
.inv-a6-hdr-r { text-align: right; flex-shrink: 0; }
.inv-a6-title { font-size: 11px; font-weight: 900; letter-spacing: 1.5px; color: #111; text-transform: uppercase; }
.inv-a6-no { font-family: monospace; font-size: 11px; font-weight: 700; color: #333; margin-top: 1px; }
.inv-a6-date { font-size: 8px; color: #888; margin-top: 1px; }
.inv-a6-badge { display: inline-block; padding: 1.5px 6px; border-radius: 10px; font-size: 8px; font-weight: 800; text-transform: uppercase; margin-top: 2px; }
.inv-a6-badge.paid { background: #d1fae5; color: #065f46; }
.inv-a6-badge.unpaid { background: #fef3c7; color: #92400e; }
.inv-a6-cust { border: 1px solid #e5e7eb; border-radius: 3px; padding: 1.5mm 2mm; flex-shrink: 0; }
.inv-a6-sec { font-size: 6.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #aaa; margin-bottom: 1mm; }
.inv-a6-cust-name { font-size: 13px; font-weight: 800; line-height: 1.2; }
.inv-a6-cust-line { font-size: 8.5px; color: #444; line-height: 1.5; }
.inv-a6-track { font-size: 8px; font-weight: 700; color: #16A34A; font-family: monospace; margin-top: 1px; }
.inv-a6-tbl { width: 100%; border-collapse: collapse; flex-shrink: 0; }
.inv-a6-tbl thead tr { background: #111; }
.inv-a6-th-item { text-align: left; padding: 2.5px 3px; font-size: 7.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #fff; }
.inv-a6-th-q { text-align: center; padding: 2.5px 3px; font-size: 7.5px; font-weight: 700; text-transform: uppercase; color: #fff; width: 9mm; }
.inv-a6-th-a { text-align: right; padding: 2.5px 3px; font-size: 7.5px; font-weight: 700; text-transform: uppercase; color: #fff; width: 26mm; }
.inv-a6-td-item { padding: 2.5px 3px; font-size: 9px; line-height: 1.35; vertical-align: top; border-bottom: 1px solid #f0f0f0; }
.inv-a6-unit { font-size: 7.5px; color: #999; }
.inv-a6-td-c { text-align: center; padding: 2.5px 3px; font-size: 9px; font-weight: 700; vertical-align: top; border-bottom: 1px solid #f0f0f0; }
.inv-a6-td-r { text-align: right; padding: 2.5px 3px; font-size: 9px; font-weight: 600; vertical-align: top; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
.inv-a6-totals { border-top: 1.5px solid #111; padding-top: 1.5mm; flex-shrink: 0; break-inside: avoid; page-break-inside: avoid; }
.inv-a6-tr { display: flex; justify-content: space-between; font-size: 9px; padding: 1px 0; color: #333; }
.inv-a6-tr.sm { color: #888; font-size: 8px; }
.inv-a6-tr.grand { font-size: 14px; font-weight: 900; border-top: 1.5px solid #111; padding-top: 2px; margin-top: 2px; color: #111; }
.inv-a6-cod { display: flex; justify-content: space-between; font-size: 10px; font-weight: 800; margin-top: 2mm; padding: 1.5mm 2mm; border-radius: 3px; background: #fef3c7; border: 1.5px solid #f59e0b; color: #92400e; }
.inv-a6-cod.partial { background: #fff7ed; border-color: #fb923c; color: #c2410c; }
.inv-a6-notes { font-size: 8px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 2px; padding: 1mm 1.5mm; flex-shrink: 0; }
.inv-a6-footer { margin-top: auto; padding-top: 2mm; border-top: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; gap: 2mm; flex-shrink: 0; break-inside: avoid; page-break-inside: avoid; }
.inv-a6-footer-info { flex: 1; min-width: 0; }
.inv-a6-footer-brand { font-size: 11px; font-weight: 900; color: #16A34A; letter-spacing: -0.3px; }
.inv-a6-footer-meta { font-size: 7px; color: #9ca3af; line-height: 1.5; margin-top: 0.5mm; }
.inv-a6-footer-qr { width: 13mm; height: 13mm; flex-shrink: 0; display: block; }
.inv-a6-footer-qr svg { width: 100% !important; height: 100% !important; display: block; }

/* ── Invoice A5 (148mm × 210mm) ── */
.inv-a5 { width: 148mm; min-height: 210mm; padding: 6mm 8mm; margin: 0; display: flex; flex-direction: column; gap: 3mm; box-sizing: border-box; }
.inv-a5 * { box-sizing: border-box; word-break: break-word; overflow-wrap: anywhere; }
.inv-a5-hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 3mm; gap: 4mm; flex-shrink: 0; }
.inv-a5-lhs { flex: 1; min-width: 0; }
.inv-a5-brand { font-size: 20px; font-weight: 900; color: #16A34A; letter-spacing: -0.5px; }
.inv-a5-name-sub { font-size: 15px; font-weight: 800; color: #333; }
.inv-a5-store { font-size: 9.5px; color: #888; line-height: 1.6; }
.inv-a5-hdr-r { text-align: right; flex-shrink: 0; }
.inv-a5-title { font-size: 14px; font-weight: 900; letter-spacing: 2px; color: #111; text-transform: uppercase; }
.inv-a5-no { font-family: monospace; font-size: 13px; font-weight: 700; color: #333; margin-top: 2px; }
.inv-a5-date { font-size: 10px; color: #888; margin-top: 2px; }
.inv-a5-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 800; text-transform: uppercase; margin-top: 3px; }
.inv-a5-badge.paid { background: #d1fae5; color: #065f46; }
.inv-a5-badge.unpaid { background: #fef3c7; color: #92400e; }
.inv-a5-cust { border: 1px solid #e5e7eb; border-radius: 4px; padding: 2mm 3mm; flex-shrink: 0; }
.inv-a5-sec { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #aaa; margin-bottom: 1.5mm; }
.inv-a5-cust-name { font-size: 16px; font-weight: 800; line-height: 1.2; }
.inv-a5-cust-line { font-size: 10px; color: #444; line-height: 1.6; }
.inv-a5-track { font-size: 9.5px; font-weight: 700; color: #16A34A; font-family: monospace; margin-top: 2px; }
.inv-a5-tbl { width: 100%; border-collapse: collapse; flex-shrink: 0; }
.inv-a5-tbl thead tr { background: #111; }
.inv-a5-th-item { text-align: left; padding: 3px 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #fff; }
.inv-a5-th-q { text-align: center; padding: 3px 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #fff; width: 11mm; }
.inv-a5-th-a { text-align: right; padding: 3px 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #fff; width: 33mm; }
.inv-a5-td-item { padding: 3px 4px; font-size: 11px; line-height: 1.4; vertical-align: top; border-bottom: 1px solid #f0f0f0; }
.inv-a5-unit { font-size: 9px; color: #999; }
.inv-a5-td-c { text-align: center; padding: 3px 4px; font-size: 11px; font-weight: 700; vertical-align: top; border-bottom: 1px solid #f0f0f0; }
.inv-a5-td-r { text-align: right; padding: 3px 4px; font-size: 11px; font-weight: 600; vertical-align: top; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
.inv-a5-totals { border-top: 1.5px solid #111; padding-top: 2mm; flex-shrink: 0; break-inside: avoid; page-break-inside: avoid; }
.inv-a5-tr { display: flex; justify-content: space-between; font-size: 11px; padding: 1.5px 0; color: #333; }
.inv-a5-tr.sm { color: #888; font-size: 10px; }
.inv-a5-tr.grand { font-size: 18px; font-weight: 900; border-top: 1.5px solid #111; padding-top: 3px; margin-top: 3px; color: #111; }
.inv-a5-cod { display: flex; justify-content: space-between; font-size: 13px; font-weight: 800; margin-top: 3mm; padding: 2mm 3mm; border-radius: 4px; background: #fef3c7; border: 2px solid #f59e0b; color: #92400e; }
.inv-a5-cod.partial { background: #fff7ed; border-color: #fb923c; color: #c2410c; }
.inv-a5-notes { font-size: 10px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 3px; padding: 1.5mm 2mm; flex-shrink: 0; }
.inv-a5-footer { margin-top: auto; padding-top: 3mm; border-top: 1px solid #e5e7eb; display: flex; align-items: center; gap: 5mm; flex-shrink: 0; break-inside: avoid; page-break-inside: avoid; }
.inv-a5-footer-info { flex: 1; min-width: 0; }
.inv-a5-footer-brand { font-size: 15px; font-weight: 900; color: #16A34A; letter-spacing: -0.3px; }
.inv-a5-footer-meta { font-size: 9px; color: #9ca3af; line-height: 1.55; margin-top: 1mm; }
.inv-a5-footer-mid { flex: 1; }
.inv-a5-footer-thanks { font-size: 13px; font-weight: 700; color: #111; }
.inv-a5-footer-sub { font-size: 8.5px; color: #9ca3af; margin-top: 1mm; }
.inv-a5-footer-qr { width: 18mm; height: 18mm; flex-shrink: 0; display: block; }
.inv-a5-footer-qr svg { width: 100% !important; height: 100% !important; display: block; }

/* ── Shipping Label A6 (105mm × 148mm) ── */
.label-page { width: 105mm; height: 148mm; padding: 4mm 5mm; margin: 0; display: flex; flex-direction: column; gap: 2mm; box-sizing: border-box; overflow: hidden; }
.label-page * { box-sizing: border-box; word-break: break-word; overflow-wrap: anywhere; }
.lbl-hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111; padding-bottom: 2mm; flex-shrink: 0; gap: 2mm; }
.lbl-brand { font-size: 15px; font-weight: 900; color: #16A34A; letter-spacing: -0.5px; }
.lbl-ordno { font-family: monospace; font-size: 12px; font-weight: 900; background: #111; color: #fff; padding: 1mm 2.5mm; flex-shrink: 0; }
.lbl-from { display: flex; align-items: baseline; gap: 1.5mm; background: #f8f9fa; padding: 1.5mm 2mm; border-radius: 3px; flex-shrink: 0; flex-wrap: wrap; }
.lbl-sec { font-size: 7px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #aaa; flex-shrink: 0; }
.lbl-sec-inv { color: #fff; opacity: 0.7; }
.lbl-from-name { font-size: 9px; font-weight: 700; color: #333; }
.lbl-from-addr { font-size: 8.5px; color: #888; }
.lbl-divider { text-align: center; font-size: 8.5px; font-weight: 700; letter-spacing: 0.5px; color: #555; border-top: 1px dashed #bbb; border-bottom: 1px dashed #bbb; padding: 1.5mm 0; flex-shrink: 0; }
.lbl-to { border: 2px solid #16A34A; border-radius: 4px; padding: 2.5mm 3mm; background: #f0fdf4; flex-shrink: 0; }
.lbl-to-name { font-size: 18px; font-weight: 900; line-height: 1.15; }
.lbl-to-addr { font-size: 9.5px; color: #444; line-height: 1.4; margin-top: 1mm; }
.lbl-to-city { font-size: 14px; font-weight: 900; letter-spacing: 0.3px; margin-top: 1mm; }
.lbl-to-phone { font-size: 14px; font-weight: 700; font-family: monospace; letter-spacing: 0.5px; }
.lbl-track { display: flex; align-items: center; gap: 2mm; background: #111; color: #fff; border-radius: 3px; padding: 1.5mm 2.5mm; flex-shrink: 0; }
.lbl-track-num { font-size: 14px; font-weight: 900; font-family: monospace; letter-spacing: 1.5px; word-break: break-all; }
.lbl-bottom { display: flex; gap: 2mm; align-items: stretch; flex-shrink: 0; }
.lbl-cod { flex: 1; border-radius: 4px; padding: 2mm 2.5mm; }
.lbl-cod.cod { background: #fef3c7; border: 1.5px solid #f59e0b; }
.lbl-cod.prepaid { background: #d1fae5; border: 1.5px solid #10b981; }
.lbl-cod-tag { font-size: 7px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 1px; }
.lbl-cod-amt { font-size: 20px; font-weight: 900; color: #111; line-height: 1.1; }
.lbl-items { width: 19mm; border: 1.5px solid #ddd; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
.lbl-items-n { font-size: 24px; font-weight: 900; line-height: 1; color: #111; }
.lbl-items-l { font-size: 6.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #aaa; }
.lbl-contents { flex: 1; border: 1px solid #e5e7eb; border-radius: 3px; padding: 1.5mm 2mm; min-height: 0; overflow: hidden; }
.lbl-contents-items { display: flex; flex-wrap: wrap; gap: 1.5mm; margin-top: 1mm; align-content: flex-start; }
.lbl-contents-item { font-size: 8.5px; font-weight: 500; color: #333; background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 2px; padding: 0.5mm 1.5mm; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.lbl-bc-wrap { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 100%; padding-top: 1.5mm; border-top: 1px dashed #ddd; }
.lbl-bc-img { width: 100%; height: auto; display: block; image-rendering: crisp-edges; image-rendering: -webkit-optimize-contrast; }
.lbl-bc-fallback { font-family: monospace; font-size: 9px; font-weight: 700; padding: 3mm 0; text-align: center; width: 100%; color: #111; border: 1px dashed #999; }

/* ── AWB A6 (105mm × 148mm) ── */
.awb-page { width: 105mm; height: 148mm; padding: 3mm 4mm; margin: 0; display: flex; flex-direction: column; gap: 1.5mm; box-sizing: border-box; overflow: hidden; font-size: 9px; }
.awb-page * { box-sizing: border-box; word-break: break-word; overflow-wrap: anywhere; }
.awb-hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #111; padding-bottom: 1.5mm; gap: 2mm; flex-shrink: 0; }
.awb-brand { font-size: 13px; font-weight: 900; color: #16A34A; letter-spacing: -0.5px; }
.awb-orderno { font-family: monospace; font-size: 11px; font-weight: 900; background: #111; color: #fff; padding: 0.5mm 2mm; flex-shrink: 0; }
.awb-from-row { display: flex; align-items: baseline; gap: 2mm; background: #f8f9fa; border-radius: 2px; padding: 1mm 2mm; flex-shrink: 0; }
.awb-from-label { font-size: 6.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #aaa; flex-shrink: 0; }
.awb-from-val { font-size: 8px; color: #555; line-height: 1.3; }
.awb-to-box { border: 1.5px solid #16A34A; border-radius: 3px; padding: 1.5mm 2mm; background: #f0fdf4; flex-shrink: 0; }
.awb-to-label { font-size: 6.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #16A34A; margin-bottom: 0.5mm; }
.awb-to-name { font-size: 14px; font-weight: 900; line-height: 1.2; }
.awb-to-addr { font-size: 9px; color: #444; line-height: 1.4; }
.awb-to-city { font-size: 11px; font-weight: 900; letter-spacing: 0.3px; }
.awb-to-phone { font-size: 11px; font-weight: 700; font-family: monospace; }
.awb-track-box { background: #111; color: #fff; border-radius: 3px; padding: 1mm 2mm; flex-shrink: 0; }
.awb-track-label { font-size: 6.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #aaa; }
.awb-track-num { font-size: 13px; font-weight: 900; font-family: monospace; letter-spacing: 1px; word-break: break-all; line-height: 1.2; }
.awb-items-wrap { border: 1px solid #e5e7eb; border-radius: 2px; padding: 1mm 1.5mm; flex: 1; min-height: 0; overflow: hidden; }
.awb-items-label { font-size: 6.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #999; margin-bottom: 1mm; }
.awb-tbl { width: 100%; border-collapse: collapse; }
.awb-tbl tr + tr td { border-top: 1px solid #f0f0f0; }
.awb-tbl-qty { font-size: 9px; font-weight: 900; width: 6mm; padding: 1px 0; color: #666; white-space: nowrap; vertical-align: top; }
.awb-tbl-name { font-size: 9px; padding: 1px 1.5mm; line-height: 1.35; vertical-align: top; }
.awb-tbl-price { font-size: 9px; font-weight: 700; text-align: right; white-space: nowrap; vertical-align: top; }
.awb-tbl-total td { font-weight: 900; font-size: 10px; border-top: 1.5px solid #111 !important; padding-top: 1.5px; }
.awb-notes { background: #fffbeb; border: 1px solid #fde68a; border-radius: 2px; padding: 1mm 1.5mm; font-size: 8px; color: #92400e; flex-shrink: 0; }
.awb-pay-block { border-radius: 3px; padding: 1.5mm 2mm; text-align: center; flex-shrink: 0; }
.awb-pay-block.cod { background: #fef3c7; border: 1.5px solid #f59e0b; }
.awb-pay-block.prepaid { background: #d1fae5; border: 1.5px solid #10b981; }
.awb-pay-tag { font-size: 7px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #555; }
.awb-pay-amt { font-size: 20px; font-weight: 900; color: #111; line-height: 1.1; }
.awb-pay-sub { font-size: 8px; color: #666; margin-top: 0.5mm; }
.awb-qr-wrap { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; margin-top: auto; }
.awb-qr { flex-shrink: 0; display: block; }
.awb-qr svg { width: 100% !important; height: 100% !important; display: block; }
.awb-qr-label { font-size: 6.5px; color: #888; text-align: center; margin-top: 0.5mm; font-family: monospace; letter-spacing: 0.3px; }

/* ── AWB A5 size overrides (148mm × 210mm) ── */
.awb-a5-page { width: 148mm; height: 210mm; padding: 5mm 7mm; margin: 0; display: flex; flex-direction: column; gap: 2.5mm; box-sizing: border-box; overflow: hidden; font-size: 11px; }
.awb-a5-page * { box-sizing: border-box; word-break: break-word; overflow-wrap: anywhere; }
.awb-a5-page .awb-brand { font-size: 18px; }
.awb-a5-page .awb-orderno { font-size: 14px; padding: 1mm 3mm; }
.awb-a5-page .awb-from-val { font-size: 10px; }
.awb-a5-page .awb-from-label { font-size: 8px; }
.awb-a5-page .awb-to-label { font-size: 8px; }
.awb-a5-page .awb-to-name { font-size: 20px; }
.awb-a5-page .awb-to-addr { font-size: 11px; }
.awb-a5-page .awb-to-city { font-size: 15px; }
.awb-a5-page .awb-to-phone { font-size: 15px; }
.awb-a5-page .awb-track-label { font-size: 8px; }
.awb-a5-page .awb-track-num { font-size: 18px; }
.awb-a5-page .awb-items-label { font-size: 8px; }
.awb-a5-page .awb-tbl-qty { font-size: 11px; }
.awb-a5-page .awb-tbl-name { font-size: 11px; }
.awb-a5-page .awb-tbl-price { font-size: 11px; }
.awb-a5-page .awb-tbl-total td { font-size: 13px; }
.awb-a5-page .awb-pay-tag { font-size: 9px; }
.awb-a5-page .awb-pay-amt { font-size: 28px; }
.awb-a5-page .awb-notes { font-size: 10px; }
.awb-a5-page .awb-qr-label { font-size: 8px; }

/* ── AWB A4 (210mm × 297mm) ── */
.awb-a4-page { padding: 12mm 16mm; width: 210mm; margin: 0; display: flex; flex-direction: column; gap: 6mm; }
.awb-a4-hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #111; padding-bottom: 5mm; }
.awb-a4-brand { font-size: 26px; font-weight: 900; color: #16A34A; letter-spacing: -1px; }
.awb-a4-title-block { text-align: right; }
.awb-a4-title { font-size: 22px; font-weight: 900; letter-spacing: 2px; color: #111; text-transform: uppercase; }
.awb-a4-no { font-family: monospace; font-size: 15px; font-weight: 700; color: #444; margin-top: 2px; }
.awb-a4-date { font-size: 11px; color: #888; margin-top: 2px; }
.awb-a4-addr-row { display: flex; gap: 10mm; }
.awb-a4-addr-box { flex: 1; border: 1.5px solid #e5e7eb; border-radius: 6px; padding: 5mm 6mm; }
.awb-a4-addr-to { border-color: #16A34A; background: #f0fdf4; }
.awb-a4-addr-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #999; margin-bottom: 3mm; }
.awb-a4-addr-to .awb-a4-addr-label { color: #16A34A; }
.awb-a4-addr-name { font-size: 18px; font-weight: 900; line-height: 1.2; margin-bottom: 2mm; }
.awb-a4-addr-line { font-size: 12px; color: #444; line-height: 1.7; }
.awb-a4-city { font-size: 15px; font-weight: 900; color: #111; }
.awb-a4-phone { font-family: monospace; font-size: 14px; font-weight: 700; }
.awb-a4-track-block { background: #111; color: #fff; border-radius: 6px; padding: 4mm 6mm; }
.awb-a4-track-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #aaa; margin-bottom: 2mm; }
.awb-a4-track-num { font-size: 24px; font-weight: 900; font-family: monospace; letter-spacing: 2px; word-break: break-all; }
.awb-a4-tbl { width: 100%; border-collapse: collapse; }
.awb-a4-tbl th { background: #111; color: #fff; padding: 7px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
.awb-a4-tbl td { padding: 9px 10px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
.awb-a4-tbl .center { text-align: center; }
.awb-a4-tbl .right { text-align: right; }
.awb-a4-tbl-total td { font-weight: 900; font-size: 15px; border-top: 2px solid #111 !important; border-bottom: none; background: #f8f9fa; }
.awb-a4-footer { display: flex; align-items: center; gap: 6mm; padding-top: 6mm; border-top: 1px solid #ddd; margin-top: auto; }
.awb-a4-qr { width: 38mm; height: 38mm; flex-shrink: 0; display: block; }
.awb-a4-qr svg { width: 100% !important; height: 100% !important; display: block; }
.awb-a4-footer-text { flex: 1; }
.awb-a4-awbno { font-family: monospace; font-size: 16px; font-weight: 700; letter-spacing: 2px; color: #111; }
.awb-a4-footer-meta { font-size: 11px; color: #888; margin-top: 2mm; }

/* ── Compact Packing List ── */
.psc-page { padding: 10mm; max-width: 210mm; margin: 0 auto; }
.psc-pageheader { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 4mm; margin-bottom: 4mm; }
.psc-row { padding: 3mm 0; border-bottom: 1px dashed #999; page-break-inside: avoid; }
.psc-row:last-of-type { border-bottom: 2px solid #111; }
.psc-head { display: flex; gap: 4mm; align-items: flex-start; margin-bottom: 2mm; }
.psc-idx { width: 8mm; height: 8mm; border: 1.5px solid #111; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; flex-shrink: 0; }
.psc-customer { flex: 1; min-width: 0; }
.psc-name { font-size: 13px; font-weight: 800; }
.psc-phone { font-size: 11px; color: #666; font-weight: 600; }
.psc-addr { font-size: 11px; color: #444; line-height: 1.4; }
.psc-meta { text-align: right; flex-shrink: 0; min-width: 38mm; }
.psc-order { font-family: monospace; font-weight: 800; font-size: 11px; }
.psc-pay { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 800; margin-top: 2px; }
.psc-pay.cod { background: #fef3c7; color: #92400e; }
.psc-pay.paid { background: #d1fae5; color: #065f46; }
.psc-track { font-family: monospace; font-size: 10px; color: #16A34A; font-weight: 700; margin-top: 2px; }
.psc-items { padding-left: 12mm; font-size: 11px; line-height: 1.7; }
.psc-item { display: inline-block; margin-right: 8mm; }
.psc-foot { padding-left: 12mm; margin-top: 2mm; font-size: 10px; color: #555; display: flex; justify-content: space-between; }
.psc-check { font-family: monospace; }
.psc-totals { margin-top: 6mm; padding-top: 4mm; border-top: 2px solid #111; text-align: right; font-size: 13px; }

/* ── Packing Slip ── */
.packing-page { padding: 10mm; max-width: 180mm; margin: 0 auto; }
.ps-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6mm; border-bottom: 2px solid #111; padding-bottom: 4mm; }
.ps-summary { display: flex; gap: 8mm; padding: 4px 8px; background: #f8f9fa; border-radius: 4px; font-size: 12px; margin-top: 4mm; margin-bottom: 4mm; }
.ps-message { text-align: center; padding: 6px; border-top: 1px dashed #ddd; margin-top: 4mm; font-size: 11px; color: #666; display: flex; gap: 12px; justify-content: center; }
.cod-text { color: #92400e; }
.paid-text { color: #065f46; }

@media print {
  @page { margin: 5mm; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`

// ── Data fetch ────────────────────────────────────────────────────────────────

async function fetchOrders(ids: string[]) {
  const orders = await prisma.order.findMany({
    where: { id: { in: ids } },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })

  // OrderItem doesn't snapshot taxability, so resolve Product.isTaxable now.
  // VAT is shown only for the taxable portion: a non-taxable-only order shows
  // no VAT line; a mixed order shows VAT computed on the taxable items alone.
  // Prices are VAT-inclusive, so vatAmount is the tax already inside the total.
  const productIds = [...new Set(orders.flatMap(o => o.items.map(i => i.productId)))]
  let taxable = new Set<string>()
  if (productIds.length) {
    try {
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, isTaxable: true },
      })
      taxable = new Set(products.filter(p => p.isTaxable).map(p => p.id))
    } catch { /* product lookup failed → treat all as non-taxable, hide VAT */ }
  }

  return orders.map(order => {
    const vatableSubtotal = order.items
      .filter(i => taxable.has(i.productId))
      .reduce((sum, i) => sum + i.price * i.quantity, 0)
    const vatAmount = Math.round(vatableSubtotal - vatableSubtotal / (1 + VAT_RATE))
    return { ...order, vatAmount, hasVat: vatableSubtotal > 0 }
  })
}

async function fetchStoreSettings(): Promise<Record<string, string>> {
  try {
    const rows = await prisma.appSetting.findMany({
      where: { key: { in: ['STORE_LOGO_URL', 'STORE_NAME', 'STORE_PHONE', 'STORE_EMAIL', 'STORE_ADDRESS', 'STORE_PAN', 'FACEBOOK_PAGE_ID', 'WHATSAPP_NUMBER'] } },
    })
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  } catch {
    return {}
  }
}

async function generateSocialQRSvg(store: Store): Promise<string> {
  const url = `${store.url}/follow`
  try {
    const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 512 })
    return svg.replace('<svg ', '<svg width="100%" height="100%" ')
  } catch { return '' }
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { ids, type = 'shipping' } = await req.json() as { ids: string[]; type?: string }
    if (!ids?.length) return Response.json({ error: 'ids required' }, { status: 400 })

    const [orders, storeDB] = await Promise.all([fetchOrders(ids), fetchStoreSettings()])
    const store = buildStore(storeDB)
    const logoUrl = storeDB.STORE_LOGO_URL ?? ''

    const isInvoice    = ['invoice', 'invoice-a5', 'invoice-a4', 'all'].includes(type)
    const isAwb        = ['awb', 'awb-a5', 'awb-a4'].includes(type)
    const needsBarcode = type === 'shipping' || type === 'all'

    const [socialQrSvg, qrSvgs, barcodePngs] = await Promise.all([
      isInvoice ? generateSocialQRSvg(store)    : Promise.resolve(''),
      isAwb     ? generateQRSvgs(orders, store)  : Promise.resolve(orders.map(() => '')),
      needsBarcode ? generateBarcodes(orders)   : Promise.resolve(orders.map(() => '')),
    ])

    let body = ''
    switch (type) {
      case 'invoice':      body = invoice(orders, store, logoUrl, socialQrSvg); break
      case 'invoice-a5':   body = invoiceA5(orders, store, logoUrl, socialQrSvg); break
      case 'invoice-a4':   body = invoiceA4(orders, store, logoUrl, socialQrSvg); break
      case 'awb':          body = awb(orders, store, qrSvgs, 'a6'); break
      case 'awb-a5':       body = awb(orders, store, qrSvgs, 'a5'); break
      case 'awb-a4':       body = awbA4(orders, store, qrSvgs); break
      case 'packing':      body = packingSlip(orders, store); break
      case 'packing-list': body = packingSlipCompact(orders, store); break
      case 'all':          body = invoice(orders, store, logoUrl, socialQrSvg) + shippingLabel(orders, store, barcodePngs) + packingSlip(orders, store); break
      default:             body = shippingLabel(orders, store, barcodePngs)
    }

    // Inject correct @page size after main CSS so it wins the cascade
    const pageOverride =
        (type === 'awb' || type === 'shipping' || type === 'invoice' || type === 'all')
          ? `<style>@media print { @page { size: 105mm 148mm; margin: 0; } }</style>`
      : (type === 'awb-a5' || type === 'invoice-a5')
          ? `<style>@media print { @page { size: 148mm 210mm; margin: 0; } }</style>`
      : (type === 'invoice-a4' || type === 'awb-a4' || type === 'packing' || type === 'packing-list')
          ? `<style>@media print { @page { size: A4; margin: 0; } }</style>`
      : ''

    const title =
        type === 'invoice'      ? 'Invoice A6'
      : type === 'invoice-a5'   ? 'Invoice A5'
      : type === 'invoice-a4'   ? 'Invoice A4'
      : type === 'awb'          ? 'Air Waybill A6'
      : type === 'awb-a5'       ? 'Air Waybill A5'
      : type === 'awb-a4'       ? 'Air Waybill A4'
      : type === 'packing'      ? 'Packing Slip'
      : type === 'packing-list' ? 'Packing List'
      : type === 'all'          ? 'All Documents'
      :                           'Shipping Label'

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${store.name} — ${title}</title>
<style>${CSS}</style>
${pageOverride}
</head>
<body>
${body}
<script>window.onload = () => window.print()</script>
</body>
</html>`

    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
