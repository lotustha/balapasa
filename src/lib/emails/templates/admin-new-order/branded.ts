import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr, formatNpr } from '../../layout'
import type { AdminNewOrderData } from '../../types'

function render(data: AdminNewOrderData): { subject: string; html: string } {
  const short = data.orderId.slice(0, 8).toUpperCase()
  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:56px;height:56px;line-height:56px;background:#FEF3C7;border-radius:50%;font-size:26px;">🛎️</div>
      <h1 style="margin:14px 0 4px;font-size:22px;color:#0F172A;font-weight:800;">New order received</h1>
      <p style="margin:0;font-size:13px;color:#64748B;">Action needed — review and confirm.</p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;background:#F8FAFC;border-radius:14px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#94A3B8;letter-spacing:0.08em;text-transform:uppercase;">Order #${short}</p>
        <p style="margin:0 0 12px;font-size:22px;color:#16A34A;font-weight:800;">${formatNpr(data.total)}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding:3px 0;font-size:13px;color:#64748B;">Customer</td>
              <td align="right" style="padding:3px 0;font-size:13px;color:#0F172A;font-weight:600;">${escapeHtml(data.customerName)}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#64748B;">Phone</td>
              <td align="right" style="padding:3px 0;font-size:13px;color:#0F172A;font-weight:600;">${escapeHtml(data.customerPhone)}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#64748B;">Email</td>
              <td align="right" style="padding:3px 0;font-size:13px;color:#0F172A;font-weight:600;">${escapeHtml(data.customerEmail)}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#64748B;">Items</td>
              <td align="right" style="padding:3px 0;font-size:13px;color:#0F172A;font-weight:600;">${data.itemCount} item${data.itemCount === 1 ? '' : 's'}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#64748B;">Payment</td>
              <td align="right" style="padding:3px 0;font-size:13px;color:#0F172A;font-weight:600;">${escapeHtml(data.paymentMethod)}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#64748B;">Shipping</td>
              <td align="right" style="padding:3px 0;font-size:13px;color:#0F172A;font-weight:600;">${escapeHtml(data.shippingOption)}</td></tr>
        </table>
      </td></tr>
    </table>

    <div style="text-align:center;margin-top:20px;">
      <a href="${escapeAttr(data.adminUrl)}" style="display:inline-block;padding:14px 28px;background:#0F172A;color:#FFFFFF;text-decoration:none;border-radius:14px;font-weight:700;font-size:14px;">Open in admin</a>
    </div>
  `
  return {
    subject: `🛎️ New order #${short} · ${formatNpr(data.total)}`,
    html: emailLayout({
      preheader: `${data.customerName} ordered ${formatNpr(data.total)}`,
      title:     `New order #${short}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
    }),
  }
}

export const adminNewOrderBranded: EmailVariant<AdminNewOrderData> = {
  id:          'branded',
  name:        'Branded',
  description: 'Bell-emoji header, hero total, full customer summary block, big CTA to admin.',
  accent:      '#F59E0B',
  render,
}
