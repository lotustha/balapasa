import 'server-only'
import type { EmailVariant } from '../../registry'
import type { PickupReadyData } from '../../types'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'

function render(data: PickupReadyData): { subject: string; html: string } {
  const code = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()
  const subject = `Order ${code} is ready for pickup`

  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:#DCFCE7;border-radius:50%;font-size:30px;">🛍️</div>
      <h1 style="margin:16px 0 4px;font-size:24px;color:#0F172A;font-weight:800;">Ready for pickup</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">
        ${escapeHtml(data.recipientName)} — your order <strong style="color:#0F172A;">${escapeHtml(code)}</strong> is packed and waiting for you at our store.
      </p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFBFF;border:1px solid #E2E8F0;border-radius:14px;margin-top:8px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;font-weight:700;">Pickup location</p>
        <p style="margin:0;font-size:15px;font-weight:700;color:#0F172A;line-height:1.5;">${escapeHtml(data.storeAddress)}</p>
        ${data.storeHours   ? `<p style="margin:10px 0 0;font-size:12px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Hours</p><p style="margin:2px 0 0;font-size:13px;color:#475569;">${escapeHtml(data.storeHours)}</p>` : ''}
        ${data.pickupWindow ? `<p style="margin:10px 0 0;font-size:12px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Suggested pickup window</p><p style="margin:2px 0 0;font-size:13px;color:#475569;">${escapeHtml(data.pickupWindow)}</p>` : ''}
      </td></tr>
    </table>

    <p style="margin:18px 0 0;font-size:13px;color:#475569;">
      <strong>Bring with you:</strong> a phone showing your order code, or the email confirmation. We'll hand it over right away.
    </p>

    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(data.orderUrl)}" style="display:inline-block;padding:14px 28px;background:#16A34A;color:#FFFFFF;text-decoration:none;border-radius:14px;font-weight:700;font-size:14px;">
        Open order
      </a>
    </div>
  `

  return {
    subject,
    html: emailLayout({
      preheader: subject,
      title:     subject,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
      logoUrl:   data.logoUrl,
    }),
  }
}

export const pickupReadyBranded: EmailVariant<PickupReadyData> = {
  id:          'branded',
  name:        'Branded',
  description: 'Pickup card with store address, hours, suggested window, and the order CTA.',
  accent:      '#16A34A',
  render,
}
