import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'
import type { LowStockData } from '../../types'

function render(data: LowStockData): { subject: string; html: string } {
  const critical = data.currentStock === 0
  const accentBg = critical ? '#FEE2E2' : '#FEF3C7'
  const accentFg = critical ? '#B91C1C' : '#B45309'
  const headline = critical ? 'Out of stock' : 'Low stock alert'
  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:${accentBg};border-radius:50%;font-size:28px;color:${accentFg};">⚠️</div>
      <h1 style="margin:16px 0 4px;font-size:22px;color:#0F172A;font-weight:800;">${headline}</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">Restock soon to avoid lost sales.</p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;background:#F8FAFC;border-radius:14px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#94A3B8;letter-spacing:0.08em;text-transform:uppercase;">Product</p>
        <p style="margin:0 0 14px;font-size:17px;color:#0F172A;font-weight:800;">${escapeHtml(data.productName)}</p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="vertical-align:top;padding-right:8px;">
              <p style="margin:0 0 2px;font-size:11px;color:#64748B;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">In stock</p>
              <p style="margin:0;font-size:22px;color:${accentFg};font-weight:800;">${data.currentStock}</p>
            </td>
            <td style="vertical-align:top;padding-left:8px;border-left:1px solid #E2E8F0;">
              <p style="margin:0 0 2px;font-size:11px;color:#64748B;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Threshold</p>
              <p style="margin:0;font-size:22px;color:#0F172A;font-weight:800;">${data.threshold}</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <div style="text-align:center;margin-top:20px;">
      <a href="${escapeAttr(data.productUrl)}" style="display:inline-block;padding:14px 28px;background:#0F172A;color:#FFFFFF;text-decoration:none;border-radius:14px;font-weight:700;font-size:14px;">Update stock</a>
    </div>
  `
  return {
    subject: critical ? `⚠️ Out of stock: ${data.productName}` : `Low stock: ${data.productName} (${data.currentStock} left)`,
    html: emailLayout({
      preheader: `${data.productName} — ${data.currentStock} left (threshold ${data.threshold})`,
      title:     `${headline} · ${data.productName}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
    }),
  }
}

export const lowStockBranded: EmailVariant<LowStockData> = {
  id:          'branded',
  name:        'Branded',
  description: 'Warning hero, paired in-stock vs threshold metrics, big CTA to update stock. Status changes color when fully out.',
  accent:      '#F59E0B',
  render,
}
