import 'server-only'
import type { EmailVariant } from '../../registry'
import type { BackInStockData } from '../../types'
import { emailLayout, escapeHtml, escapeAttr, formatNpr } from '../../layout'

function render(data: BackInStockData): { subject: string; html: string } {
  const subject = `${data.productName} is back in stock`
  const greeting = data.recipientName ? `${escapeHtml(data.recipientName)}, good news —` : 'Good news —'

  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:#DCFCE7;border-radius:50%;font-size:30px;">🎉</div>
      <h1 style="margin:16px 0 4px;font-size:22px;color:#0F172A;font-weight:800;">Back in stock!</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">
        ${greeting} the item you wanted is available again. Grab it before it sells out.
      </p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E2E8F0;border-radius:14px;margin-top:8px;">
      <tr>
        <td style="padding:16px;vertical-align:middle;width:96px;">
          ${data.imageUrl
            ? `<img src="${escapeAttr(data.imageUrl)}" width="80" height="80" alt="" style="width:80px;height:80px;border-radius:12px;object-fit:cover;display:block;background:#F1F5F9;" />`
            : `<div style="width:80px;height:80px;border-radius:12px;background:#F1F5F9;"></div>`}
        </td>
        <td style="padding:16px 16px 16px 0;vertical-align:middle;">
          <p style="margin:0;font-size:15px;font-weight:700;color:#0F172A;line-height:1.4;">${escapeHtml(data.productName)}</p>
          <p style="margin:6px 0 0;font-size:16px;font-weight:800;color:#16A34A;">${formatNpr(data.price)}</p>
        </td>
      </tr>
    </table>
    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(data.productUrl)}" style="display:inline-block;padding:12px 28px;background:#16A34A;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;">
        Shop now
      </a>
    </div>
    <p style="margin:18px 0 0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.5;">
      You asked to be notified when this item returned. Stock is limited and may sell out again soon.
    </p>
  `

  return {
    subject,
    html: emailLayout({ preheader: subject, title: subject, body, siteUrl: data.siteUrl, siteName: data.siteName, tagline: data.tagline, logoUrl: data.logoUrl }),
  }
}

export const backInStockBranded: EmailVariant<BackInStockData> = {
  id: 'branded', name: 'Branded',
  description: 'Customer alert when a product they subscribed to is back in stock — product image, price, and a shop-now CTA.',
  accent: '#16A34A', render,
}
