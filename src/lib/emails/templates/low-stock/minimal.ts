import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'
import type { LowStockData } from '../../types'

function render(data: LowStockData): { subject: string; html: string } {
  const critical = data.currentStock === 0
  const headline = critical ? 'Out of stock' : 'Low stock'
  const body = `
    <p style="margin:0 0 4px;font-size:13px;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">${headline}</p>
    <h1 style="margin:0 0 16px;font-size:22px;color:#111827;font-weight:700;letter-spacing:-0.01em;">${escapeHtml(data.productName)}</h1>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:2px solid #111827;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #E5E7EB;font-size:13px;color:#6B7280;width:140px;">Current stock</td>
          <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;font-size:13px;color:#111827;font-weight:700;">${data.currentStock}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #E5E7EB;font-size:13px;color:#6B7280;">Threshold</td>
          <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;font-size:13px;color:#111827;">${data.threshold}</td></tr>
      <tr><td style="padding:8px 0;font-size:13px;color:#6B7280;">Product ID</td>
          <td style="padding:8px 0;font-size:13px;color:#111827;font-family:monospace;">${escapeHtml(data.productId)}</td></tr>
    </table>

    <p style="margin:20px 0 0;font-size:14px;">
      <a href="${escapeAttr(data.productUrl)}" style="color:#111827;text-decoration:underline;font-weight:700;">Update stock →</a>
    </p>
  `
  return {
    subject: critical ? `Out of stock: ${data.productName}` : `Low stock: ${data.productName} (${data.currentStock})`,
    html: emailLayout({
      preheader: `${data.productName} · ${data.currentStock} left`,
      title:     `${headline} — ${data.productName}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
    }),
  }
}

export const lowStockMinimal: EmailVariant<LowStockData> = {
  id:          'minimal',
  name:        'Minimal',
  description: 'Tabular product summary, single text link. Reads like an internal ledger entry.',
  accent:      '#111827',
  render,
}
