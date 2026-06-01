import 'server-only'
import type { EmailVariant } from '../../registry'
import type { AbandonedCartData } from '../../types'
import { emailLayout, escapeHtml, escapeAttr, formatNpr } from '../../layout'

function render(data: AbandonedCartData): { subject: string; html: string } {
  const subject = data.itemCount === 1
    ? 'You left an item in your cart'
    : `You left ${data.itemCount} items in your cart`

  const rows = data.items.map(it => `
    <tr>
      <td style="padding:8px 0;vertical-align:middle;width:48px;">
        ${it.image
          ? `<img src="${escapeAttr(it.image)}" width="44" height="44" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:cover;display:block;background:#F1F5F9;" />`
          : `<div style="width:44px;height:44px;border-radius:10px;background:#F1F5F9;"></div>`}
      </td>
      <td style="padding:8px 12px;vertical-align:middle;">
        <p style="margin:0;font-size:13px;font-weight:600;color:#0F172A;line-height:1.4;">${escapeHtml(it.name)}</p>
        <p style="margin:2px 0 0;font-size:12px;color:#64748B;">Qty ${it.quantity}</p>
      </td>
      <td style="padding:8px 0;vertical-align:middle;text-align:right;font-size:13px;font-weight:700;color:#0F172A;white-space:nowrap;">
        ${formatNpr(it.price * it.quantity)}
      </td>
    </tr>`).join('')

  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:#DCFCE7;border-radius:50%;font-size:30px;">🛒</div>
      <h1 style="margin:16px 0 4px;font-size:22px;color:#0F172A;font-weight:800;">Still thinking it over?</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">
        ${escapeHtml(data.recipientName)}, your cart is saved and waiting. Pick up right where you left off.
      </p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #E2E8F0;border-radius:14px;margin-top:8px;">
      <tr><td style="padding:8px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>
      </td></tr>
      <tr><td style="padding:12px 16px;border-top:1px solid #E2E8F0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="font-size:13px;font-weight:700;color:#0F172A;">Subtotal</td>
            <td style="text-align:right;font-size:14px;font-weight:800;color:#16A34A;">${formatNpr(data.subtotal)}</td>
          </tr>
        </table>
      </td></tr>
    </table>
    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(data.cartUrl)}" style="display:inline-block;padding:12px 28px;background:#16A34A;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;">
        Complete your order
      </a>
    </div>
    <p style="margin:18px 0 0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.5;">
      Items may sell out — we can&rsquo;t hold your cart forever.
    </p>
  `

  return {
    subject,
    html: emailLayout({ preheader: subject, title: subject, body, siteUrl: data.siteUrl, siteName: data.siteName, tagline: data.tagline, logoUrl: data.logoUrl }),
  }
}

export const abandonedCartBranded: EmailVariant<AbandonedCartData> = {
  id: 'branded', name: 'Branded',
  description: 'Cart-recovery nudge with item list, subtotal, and a one-tap return-to-cart CTA.',
  accent: '#16A34A', render,
}
