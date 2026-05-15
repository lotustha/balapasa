import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr, formatNpr } from '../../layout'
import type { AdminNewOrderData } from '../../types'

function render(data: AdminNewOrderData): { subject: string; html: string } {
  const short = data.orderId.slice(0, 8).toUpperCase()
  const body = `
    <p style="margin:0 0 4px;font-size:13px;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">New order</p>
    <h1 style="margin:0 0 16px;font-size:22px;color:#111827;font-weight:700;letter-spacing:-0.01em;">Order #${short} · ${formatNpr(data.total)}</h1>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:2px solid #111827;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #E5E7EB;font-size:13px;color:#6B7280;width:120px;">Customer</td>
          <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;font-size:13px;color:#111827;">${escapeHtml(data.customerName)}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #E5E7EB;font-size:13px;color:#6B7280;">Phone</td>
          <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;font-size:13px;color:#111827;">${escapeHtml(data.customerPhone)}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #E5E7EB;font-size:13px;color:#6B7280;">Email</td>
          <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;font-size:13px;color:#111827;">${escapeHtml(data.customerEmail)}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #E5E7EB;font-size:13px;color:#6B7280;">Items</td>
          <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;font-size:13px;color:#111827;">${data.itemCount}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #E5E7EB;font-size:13px;color:#6B7280;">Payment</td>
          <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;font-size:13px;color:#111827;">${escapeHtml(data.paymentMethod)}</td></tr>
      <tr><td style="padding:8px 0;font-size:13px;color:#6B7280;">Shipping</td>
          <td style="padding:8px 0;font-size:13px;color:#111827;">${escapeHtml(data.shippingOption)}</td></tr>
    </table>

    <p style="margin:20px 0 0;font-size:14px;">
      <a href="${escapeAttr(data.adminUrl)}" style="color:#111827;text-decoration:underline;font-weight:700;">Open order in admin →</a>
    </p>
  `
  return {
    subject: `New order #${short} · ${formatNpr(data.total)}`,
    html: emailLayout({
      preheader: `${data.customerName} · ${formatNpr(data.total)} · ${data.itemCount} item${data.itemCount === 1 ? '' : 's'}`,
      title:     `New order #${short}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
    }),
  }
}

export const adminNewOrderMinimal: EmailVariant<AdminNewOrderData> = {
  id:          'minimal',
  name:        'Minimal',
  description: 'Tabular order summary with a single text link. Reads like an internal memo — scan, decide, click.',
  accent:      '#111827',
  render,
}
