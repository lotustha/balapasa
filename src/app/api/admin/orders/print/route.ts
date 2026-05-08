import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const STORE = {
  name:    process.env.NEXT_PUBLIC_APP_NAME ?? 'Balapasa',
  url:     process.env.NEXT_PUBLIC_APP_URL  ?? 'https://balapasa.com',
  phone:   process.env.STORE_PHONE  ?? '9800000000',
  email:   process.env.STORE_EMAIL  ?? 'hello@balapasa.com',
  address: process.env.STORE_ADDRESS ?? 'Kathmandu, Nepal',
  pan:     process.env.STORE_PAN    ?? '',
}
const VAT_RATE = 0.13

// ── Document generators ───────────────────────────────────────────────────────

function invoice(orders: Awaited<ReturnType<typeof fetchOrders>>) {
  return orders.map(order => {
    const vatAmount = Math.round(order.subtotal - order.subtotal / (1 + VAT_RATE))
    const taxable   = order.total > 0
    return `
<div class="page invoice-page">
  <!-- Header -->
  <div class="inv-header">
    <div>
      <div class="brand">${STORE.name}</div>
      <div class="muted">${STORE.address}</div>
      <div class="muted">${STORE.phone} · ${STORE.email}</div>
      ${STORE.pan ? `<div class="muted">PAN: ${STORE.pan}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div class="doc-title">TAX INVOICE</div>
      <div class="inv-meta"><span class="label">Invoice No.</span><span class="value">#${order.id.slice(0,8).toUpperCase()}</span></div>
      <div class="inv-meta"><span class="label">Date</span><span class="value">${new Date(order.createdAt).toLocaleDateString('en-NP',{day:'numeric',month:'short',year:'numeric'})}</span></div>
      <div class="inv-meta"><span class="label">Payment</span><span class="value">${order.paymentMethod}</span></div>
      <div class="status-badge ${order.paymentStatus==='PAID'?'paid':'unpaid'}">${order.paymentStatus}</div>
    </div>
  </div>

  <!-- Addresses -->
  <div class="addr-row">
    <div class="addr-box">
      <div class="addr-label">Bill To</div>
      <div class="addr-name">${order.name}</div>
      <div class="addr-line">${[order.house,order.road,order.address].filter(Boolean).join(', ')}</div>
      <div class="addr-line">${order.city}</div>
      ${order.phone ? `<div class="addr-line">${order.phone}</div>` : ''}
      ${order.email ? `<div class="addr-line">${order.email}</div>` : ''}
    </div>
    <div class="addr-box">
      <div class="addr-label">Ship To</div>
      <div class="addr-name">${order.name}</div>
      <div class="addr-line">${[order.house,order.road,order.address].filter(Boolean).join(', ')}</div>
      <div class="addr-line">${order.city}</div>
      <div class="addr-line">${order.phone}</div>
      ${order.pathaoOrderId ? `<div class="addr-line" style="color:#16A34A;font-weight:700">Tracking: ${order.pathaoOrderId}</div>` : ''}
    </div>
  </div>

  <!-- Items table -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>Item Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${order.items.map((item,i) => `
        <tr>
          <td class="center">${i+1}</td>
          <td>${item.name}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">NPR ${item.price.toLocaleString()}</td>
          <td class="right">NPR ${(item.price*item.quantity).toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals-section">
    <div class="totals-box">
      <div class="total-row"><span>Subtotal</span><span>NPR ${order.subtotal.toLocaleString()}</span></div>
      ${taxable ? `<div class="total-row muted"><span>VAT (13%) incl.</span><span>NPR ${vatAmount.toLocaleString()}</span></div>` : ''}
      ${order.deliveryCharge>0 ? `<div class="total-row"><span>Delivery Charge</span><span>NPR ${order.deliveryCharge.toLocaleString()}</span></div>` : ''}
      <div class="total-row grand"><span>TOTAL</span><span>NPR ${order.total.toLocaleString()}</span></div>
    </div>
  </div>

  <!-- Notes -->
  ${order.notes ? `<div class="notes-box"><strong>Note:</strong> ${order.notes}</div>` : ''}

  <!-- Footer -->
  <div class="inv-footer">
    <div>Thank you for shopping at ${STORE.name}!</div>
    <div class="muted">${STORE.url} · This is a computer-generated invoice and does not require a signature.</div>
  </div>
</div>`
  }).join('')
}

function shippingLabel(orders: Awaited<ReturnType<typeof fetchOrders>>) {
  return orders.map(order => `
<div class="page label-page">
  <div class="label-header">
    <div class="brand-sm">${STORE.name}</div>
    <div class="order-num">#${order.id.slice(0,8).toUpperCase()}</div>
  </div>

  <div class="label-section">
    <div class="section-title">FROM</div>
    <div class="label-name">${STORE.name}</div>
    <div class="label-addr">${STORE.address}</div>
    <div class="label-addr">${STORE.phone}</div>
  </div>

  <div class="label-divider">▼ ▼ ▼ DELIVER TO ▼ ▼ ▼</div>

  <div class="label-section to-section">
    <div class="section-title">TO</div>
    <div class="label-name-lg">${order.name}</div>
    <div class="label-addr-lg">${[order.house,order.road,order.address].filter(Boolean).join(', ')}</div>
    <div class="label-city">${order.city.toUpperCase()}</div>
    <div class="label-phone">${order.phone}</div>
  </div>

  ${order.pathaoOrderId ? `
  <div class="tracking-box">
    <div class="tracking-label">TRACKING ID</div>
    <div class="tracking-num">${order.pathaoOrderId}</div>
  </div>` : ''}

  <div class="label-footer-row">
    <div>
      <div class="pay-badge ${order.paymentMethod==='COD'||order.paymentMethod==='PARTIAL_COD'?'cod':'paid'}">
        ${order.paymentMethod==='PARTIAL_COD'
          ? `PARTIAL COD — Collect NPR ${(order.codAmount ?? order.total).toLocaleString()}`
          : order.paymentMethod==='COD'
          ? `COD — NPR ${order.total.toLocaleString()}`
          : `PREPAID — NPR ${order.total.toLocaleString()}`}
      </div>
    </div>
    <div style="text-align:right">
      <div class="muted-sm">${new Date(order.createdAt).toLocaleDateString('en-NP')}</div>
      <div class="muted-sm">${order.items.length} item${order.items.length!==1?'s':''}</div>
    </div>
  </div>

  <!-- Barcode-style decoration -->
  <div class="barcode-visual" aria-hidden="true">
    ${Array.from({length:40}).map((_,i)=>`<div style="width:${[1,2,3,1,2,1,3,2,1][i%9]}px;height:100%;background:#111"></div>`).join('')}
  </div>
</div>`).join('')
}

function packingSlip(orders: Awaited<ReturnType<typeof fetchOrders>>) {
  return orders.map(order => `
<div class="page packing-page">
  <div class="ps-header">
    <div>
      <div class="brand">${STORE.name}</div>
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
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>Item</th>
        <th style="width:80px">Qty</th>
        <th style="width:60px">Packed</th>
      </tr>
    </thead>
    <tbody>
      ${order.items.map((item,i) => `
        <tr>
          <td class="center">${i+1}</td>
          <td>${item.name}</td>
          <td class="center">${item.quantity}</td>
          <td class="center">☐</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="ps-summary">
    <span>Total Items: <strong>${order.items.reduce((s,i)=>s+i.quantity,0)}</strong></span>
    <span>Payment: <strong class="${order.paymentMethod==='COD'?'cod-text':'paid-text'}">${order.paymentMethod}</strong></span>
    ${order.pathaoOrderId ? `<span>Tracking: <strong>${order.pathaoOrderId}</strong></span>` : ''}
  </div>

  <div class="ps-message">
    <strong>Thank you for your order!</strong>
    <span>Questions? Contact us at ${STORE.email} or ${STORE.phone}</span>
  </div>
</div>`).join('')
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #111; background: #fff; }
.page { page-break-after: always; }
.page:last-child { page-break-after: auto; }

/* Invoice */
.invoice-page { padding: 12mm; max-width: 210mm; margin: 0 auto; }
.inv-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 6mm; border-bottom: 2px solid #111; margin-bottom: 6mm; }
.brand { font-size: 22px; font-weight: 900; letter-spacing: -1px; color: #16A34A; }
.brand-sm { font-size: 13px; font-weight: 800; color: #111; }
.doc-title { font-size: 24px; font-weight: 900; color: #111; letter-spacing: 1px; }
.inv-meta { display: flex; gap: 8px; justify-content: flex-end; margin-top: 3px; font-size: 11px; }
.inv-meta .label { color: #666; }
.inv-meta .value { font-weight: 700; }
.status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; margin-top: 5px; text-transform: uppercase; }
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
.totals-box { width: 60mm; }
.total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
.total-row.muted { color: #888; font-size: 11px; }
.total-row.grand { font-size: 16px; font-weight: 900; border-top: 2px solid #111; border-bottom: none; padding-top: 8px; margin-top: 4px; }
.notes-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; font-size: 11px; color: #92400e; margin-bottom: 6mm; }
.inv-footer { border-top: 1px solid #e5e7eb; padding-top: 4mm; text-align: center; font-size: 11px; color: #666; line-height: 1.8; }
.muted { color: #888; font-size: 11px; }

/* Shipping Label */
@media print { .label-page { page: label-page; } }
.label-page { width: 100mm; min-height: 140mm; max-width: 100mm; padding: 6mm; border: 2.5px solid #111; margin: 4mm auto; display: flex; flex-direction: column; gap: 3mm; box-sizing: border-box; overflow: hidden; }
.label-page * { max-width: 100%; box-sizing: border-box; word-break: break-word; overflow-wrap: anywhere; }
.label-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #111; padding-bottom: 2mm; gap: 2mm; }
.order-num { font-size: 16px; font-weight: 900; font-family: monospace; background: #111; color: #fff; padding: 1mm 2mm; white-space: nowrap; flex-shrink: 0; }
.section-title { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 2px; }
.label-section { flex: 1; overflow: hidden; }
.label-name { font-size: 13px; font-weight: 700; }
.label-addr { font-size: 11px; color: #333; line-height: 1.5; }
.label-divider { text-align: center; font-size: 9px; font-weight: 700; letter-spacing: 1px; color: #555; border-top: 1px dashed #999; border-bottom: 1px dashed #999; padding: 1.5mm 0; }
.to-section { background: #f0fdf4; border: 1.5px solid #16A34A; border-radius: 4px; padding: 3mm; overflow: hidden; }
.label-name-lg { font-size: 15px; font-weight: 900; line-height: 1.2; }
.label-addr-lg { font-size: 11px; color: #333; line-height: 1.5; }
.label-city { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; }
.label-phone { font-size: 13px; font-weight: 700; }
.tracking-box { background: #111; color: #fff; border-radius: 4px; padding: 1.5mm 2mm; text-align: center; overflow: hidden; }
.tracking-label { font-size: 7px; text-transform: uppercase; letter-spacing: 1px; color: #aaa; }
.tracking-num { font-size: 13px; font-weight: 900; font-family: monospace; letter-spacing: 1px; word-break: break-all; }
.label-footer-row { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e5e7eb; padding-top: 2mm; gap: 2mm; }
.pay-badge { padding: 1.5mm 3mm; border-radius: 4px; font-size: 11px; font-weight: 900; white-space: nowrap; }
.pay-badge.cod { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
.pay-badge.paid { background: #d1fae5; color: #065f46; border: 1px solid #10b981; }
.muted-sm { font-size: 9px; color: #888; line-height: 1.6; }
.barcode-visual { height: 10mm; display: flex; align-items: stretch; gap: 1px; margin-top: 2mm; opacity: 0.8; overflow: hidden; flex-shrink: 0; }

/* Packing Slip */
.packing-page { padding: 10mm; max-width: 180mm; margin: 0 auto; }
.ps-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6mm; border-bottom: 2px solid #111; padding-bottom: 4mm; }
.ps-summary { display: flex; gap: 8mm; padding: 4px 8px; background: #f8f9fa; border-radius: 4px; font-size: 12px; margin-top: 4mm; margin-bottom: 4mm; }
.ps-message { text-align: center; padding: 6px; border-top: 1px dashed #ddd; margin-top: 4mm; font-size: 11px; color: #666; display: flex; gap: 12px; justify-content: center; }
.cod-text { color: #92400e; }
.paid-text { color: #065f46; }

@media print {
  @page { margin: 5mm; }
  @page label-page { size: 100mm 140mm; margin: 0; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`

// ── Data fetch ────────────────────────────────────────────────────────────────

async function fetchOrders(ids: string[]) {
  return prisma.order.findMany({
    where: { id: { in: ids } },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { ids, type = 'shipping' } = await req.json() as { ids: string[]; type?: string }
    if (!ids?.length) return Response.json({ error: 'ids required' }, { status: 400 })

    const orders = await fetchOrders(ids)

    let body = ''
    if (type === 'invoice')       body = invoice(orders)
    else if (type === 'packing')  body = packingSlip(orders)
    else if (type === 'all')      body = invoice(orders) + shippingLabel(orders) + packingSlip(orders)
    else                          body = shippingLabel(orders)  // default: shipping

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${STORE.name} — ${type === 'invoice' ? 'Invoice' : type === 'packing' ? 'Packing Slip' : type === 'all' ? 'All Documents' : 'Shipping Labels'}</title>
<style>${CSS}</style>
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
