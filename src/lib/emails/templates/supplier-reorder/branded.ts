import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml } from '../../layout'
import type { SupplierReorderData } from '../../types'

function render(data: SupplierReorderData): { subject: string; html: string } {
  const isPO     = data.kind === 'PURCHASE_ORDER'
  const accentBg = isPO ? '#DBEAFE' : '#FEF3C7'
  const accentFg = isPO ? '#1D4ED8' : '#B45309'
  const icon     = isPO ? '📦' : '⚠️'
  const headline = isPO ? 'Purchase order request' : 'Low stock — please prepare to restock'
  const intro    = isPO
    ? `${escapeHtml(data.siteName)} would like to reorder the following product. Please confirm availability and lead time.`
    : `Stock for the following product is running low at ${escapeHtml(data.siteName)}. Please prepare to restock — we'll follow up with a firm order.`

  const rows: Array<[string, string]> = [
    ['Product', escapeHtml(data.productName)],
    ...(data.sku ? [['SKU', escapeHtml(data.sku)] as [string, string]] : []),
    ['Current stock', String(data.currentStock)],
    ...(data.quantity != null ? [['Quantity requested', `${data.quantity} units`] as [string, string]] : []),
  ]

  const contactLine = [
    data.storePhone ? `Phone: ${escapeHtml(data.storePhone)}` : '',
    data.storeEmail ? `Email: ${escapeHtml(data.storeEmail)}` : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ')

  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:${accentBg};border-radius:50%;font-size:28px;color:${accentFg};">${icon}</div>
      <h1 style="margin:16px 0 4px;font-size:22px;color:#0F172A;font-weight:800;">${headline}</h1>
    </div>

    <p style="margin:0 0 18px;font-size:14px;color:#334155;line-height:1.6;">
      ${data.contactName ? `Hi ${escapeHtml(data.contactName)},<br/><br/>` : ''}${intro}
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border-radius:14px;">
      <tr><td style="padding:18px 20px;">
        ${rows.map(([k, v]) => `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 10px;">
            <tr>
              <td style="font-size:12px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">${k}</td>
              <td style="text-align:right;font-size:15px;color:#0F172A;font-weight:800;">${v}</td>
            </tr>
          </table>`).join('')}
      </td></tr>
    </table>

    ${data.note ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:14px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;">
        <tr><td style="padding:14px 16px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:800;color:#B45309;text-transform:uppercase;letter-spacing:0.06em;">Note</p>
          <p style="margin:0;font-size:14px;color:#78350F;line-height:1.55;">${escapeHtml(data.note)}</p>
        </td></tr>
      </table>` : ''}

    ${contactLine ? `
      <p style="margin:20px 0 0;font-size:13px;color:#64748B;line-height:1.6;text-align:center;">
        To confirm or ask a question, reach ${escapeHtml(data.siteName)} at:<br/>${contactLine}
      </p>` : ''}
  `

  return {
    subject: isPO
      ? `Purchase order: ${data.quantity ?? ''} × ${data.productName}`.replace(/\s+×/, ' ×')
      : `Low stock: ${data.productName} (${data.currentStock} left)`,
    html: emailLayout({
      preheader: isPO
        ? `Reorder request for ${data.productName}`
        : `${data.productName} is low on stock (${data.currentStock} left)`,
      title:     `${headline} · ${data.productName}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      logoUrl:   data.logoUrl,
    }),
  }
}

export const supplierReorderBranded: EmailVariant<SupplierReorderData> = {
  id:          'branded',
  name:        'Branded',
  description: 'Supplier-facing reorder/low-stock notice. Switches between a firm purchase order and a low-stock alert based on whether a quantity was set.',
  accent:      '#2563EB',
  render,
}
