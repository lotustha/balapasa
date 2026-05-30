import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'
import type { AdminStatusChangeData } from '../../types'

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  PENDING:    { bg: '#FEF3C7', fg: '#B45309' },
  CONFIRMED:  { bg: '#DBEAFE', fg: '#1D4ED8' },
  PROCESSING: { bg: '#EDE9FE', fg: '#6D28D9' },
  SHIPPED:    { bg: '#E0E7FF', fg: '#4338CA' },
  DELIVERED:  { bg: '#DCFCE7', fg: '#15803D' },
  CANCELLED:  { bg: '#FEE2E2', fg: '#B91C1C' },
}

function render(data: AdminStatusChangeData): { subject: string; html: string } {
  const code   = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()
  const colors = STATUS_COLOR[data.status] ?? { bg: '#F1F5F9', fg: '#334155' }

  const rows: Array<[string, string]> = [
    ['Order', escapeHtml(code)],
    ['Customer', escapeHtml(data.customerName)],
    ['Phone', escapeHtml(data.customerPhone)],
    ['Total', `NPR ${Math.round(data.total).toLocaleString('en-IN')}`],
    ...(data.shippingOption ? [['Shipping', escapeHtml(data.shippingOption)] as [string, string]] : []),
    ...(data.source ? [['Updated by', escapeHtml(data.source)] as [string, string]] : []),
  ]

  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <p style="margin:0 0 10px;font-size:13px;color:#64748B;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Order status changed</p>
      <span style="display:inline-block;padding:8px 18px;background:${colors.bg};color:${colors.fg};border-radius:999px;font-size:16px;font-weight:800;">${escapeHtml(data.status)}</span>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border-radius:14px;">
      <tr><td style="padding:18px 20px;">
        ${rows.map(([k, v]) => `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 10px;">
            <tr>
              <td style="font-size:12px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">${k}</td>
              <td style="text-align:right;font-size:15px;color:#0F172A;font-weight:700;">${v}</td>
            </tr>
          </table>`).join('')}
      </td></tr>
    </table>

    <div style="text-align:center;margin-top:20px;">
      <a href="${escapeAttr(data.adminUrl)}" style="display:inline-block;padding:14px 28px;background:#0F172A;color:#FFFFFF;text-decoration:none;border-radius:14px;font-weight:700;font-size:14px;">Open order</a>
    </div>
  `

  return {
    subject: `Order ${code} → ${data.status}`,
    html: emailLayout({
      preheader: `${code} is now ${data.status}`,
      title:     `Order ${code} → ${data.status}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
    }),
  }
}

export const adminStatusChangeBranded: EmailVariant<AdminStatusChangeData> = {
  id:          'branded',
  name:        'Branded',
  description: 'Internal status-change alert: colored status pill, order summary, link to the admin order page.',
  accent:      '#0F172A',
  render,
}
