import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'
import type { LowStockData } from '../../types'

function render(data: LowStockData): { subject: string; html: string } {
  const critical = data.currentStock === 0
  const stripBg  = critical ? '#FEE2E2' : '#FEF3C7'
  const stripFg  = critical ? '#B91C1C' : '#B45309'
  const chip     = critical ? 'OUT' : 'LOW'
  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${stripBg};border-radius:14px;">
      <tr><td style="padding:14px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="vertical-align:middle;">
              <span style="display:inline-block;padding:3px 8px;background:#FFFFFF;color:${stripFg};border-radius:999px;font-size:10px;font-weight:800;letter-spacing:0.1em;">${chip}</span>
              <span style="margin-left:8px;font-size:13px;color:${stripFg};font-weight:700;">${data.currentStock} / ${data.threshold}</span>
            </td>
            <td align="right" style="vertical-align:middle;">
              <a href="${escapeAttr(data.productUrl)}" style="display:inline-block;padding:8px 16px;background:${stripFg};color:#FFFFFF;text-decoration:none;border-radius:10px;font-weight:700;font-size:12px;">Restock →</a>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:12px 0 0;font-size:14px;color:#0F172A;line-height:1.5;">
      <strong>${escapeHtml(data.productName)}</strong>
      <span style="display:block;font-size:11px;color:#94A3B8;font-family:monospace;margin-top:2px;">${escapeHtml(data.productId)}</span>
    </p>
  `
  return {
    subject: critical ? `OUT · ${data.productName}` : `LOW · ${data.productName} (${data.currentStock}/${data.threshold})`,
    html: emailLayout({
      preheader: `${data.currentStock} of threshold ${data.threshold} · ${data.productName}`,
      title:     `${chip} stock — ${data.productName}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
    }),
  }
}

export const lowStockCompact: EmailVariant<LowStockData> = {
  id:          'compact',
  name:        'Compact',
  description: 'Color-changing status strip with stock-over-threshold counter and inline restock button. Triage in one glance.',
  accent:      '#B45309',
  render,
}
