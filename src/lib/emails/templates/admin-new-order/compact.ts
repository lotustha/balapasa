import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr, formatNpr } from '../../layout'
import type { AdminNewOrderData } from '../../types'

function render(data: AdminNewOrderData): { subject: string; html: string } {
  const short = data.orderId.slice(0, 8).toUpperCase()
  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0F172A;border-radius:14px;">
      <tr><td style="padding:14px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="vertical-align:middle;">
              <p style="margin:0 0 2px;font-size:10px;color:#94A3B8;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;">New Order</p>
              <p style="margin:0;font-size:18px;color:#FFFFFF;font-weight:800;">#${short}</p>
            </td>
            <td align="right" style="vertical-align:middle;">
              <p style="margin:0;font-size:20px;color:#22C55E;font-weight:800;">${formatNpr(data.total)}</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:12px 0 0;font-size:13px;color:#0F172A;line-height:1.5;">
      <strong>${escapeHtml(data.customerName)}</strong> · ${escapeHtml(data.customerPhone)} · ${escapeHtml(data.customerEmail)}
    </p>
    <p style="margin:4px 0 0;font-size:12px;color:#64748B;line-height:1.5;">
      ${data.itemCount} item${data.itemCount === 1 ? '' : 's'} · ${escapeHtml(data.paymentMethod)} · ${escapeHtml(data.shippingOption)}
    </p>

    <div style="text-align:center;margin-top:14px;">
      <a href="${escapeAttr(data.adminUrl)}" style="display:inline-block;padding:10px 22px;background:#0F172A;color:#FFFFFF;text-decoration:none;border-radius:10px;font-weight:700;font-size:13px;">Open order →</a>
    </div>
  `
  return {
    subject: `#${short} · ${formatNpr(data.total)} · ${data.customerName}`,
    html: emailLayout({
      preheader: `${data.itemCount} item${data.itemCount === 1 ? '' : 's'} · ${data.paymentMethod}`,
      title:     `New order #${short}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
    }),
  }
}

export const adminNewOrderCompact: EmailVariant<AdminNewOrderData> = {
  id:          'compact',
  name:        'Compact',
  description: 'Dark hero strip with total, one-line customer summary, one-line meta. Triage at a glance.',
  accent:      '#0F172A',
  render,
}
