import 'server-only'
import type { EmailVariant } from '../../registry'
import type { DeliveryDispatchedData } from '../../types'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'

function render(data: DeliveryDispatchedData): { subject: string; html: string } {
  const code = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()
  const eta  = data.etaText ? `<p style="margin:8px 0 0;font-size:13px;color:#64748B;">Expected: <strong style="color:#475569;">${escapeHtml(data.etaText)}</strong></p>` : ''
  const trk  = data.trackingNumber ? `
    <p style="margin:12px 0 0;font-size:12px;color:#94A3B8;">Tracking ID</p>
    <p style="margin:2px 0 0;font-family:ui-monospace,Menlo,monospace;font-size:14px;font-weight:700;color:#0F172A;">${escapeHtml(data.trackingNumber)}</p>` : ''

  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:#DBEAFE;border-radius:50%;font-size:32px;color:#2563EB;">📦</div>
      <h1 style="margin:16px 0 4px;font-size:24px;color:#0F172A;font-weight:800;">Your order is on its way</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">
        ${escapeHtml(data.recipientName)}, order <strong style="color:#0F172A;">${escapeHtml(code)}</strong> has been handed off to
        <strong style="color:#0F172A;">${escapeHtml(data.courierName)}</strong>.
      </p>
      ${eta}
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFBFF;border:1px solid #E2E8F0;border-radius:14px;margin-top:8px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;font-weight:700;">Courier</p>
        <p style="margin:4px 0 0;font-size:18px;font-weight:800;color:#0F172A;">${escapeHtml(data.courierName)}</p>
        ${trk}
      </td></tr>
    </table>

    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(data.orderUrl)}" style="display:inline-block;padding:14px 28px;background:#16A34A;color:#FFFFFF;text-decoration:none;border-radius:14px;font-weight:700;font-size:14px;">
        Track on our site
      </a>
    </div>

    <p style="margin:18px 0 0;font-size:12px;color:#94A3B8;text-align:center;">
      We'll keep this page updated with live status — no need to check the courier's site.
    </p>
  `

  return {
    subject: `Order ${code} is on its way`,
    html: emailLayout({
      preheader: `Your order ${code} has been dispatched`,
      title:     `Order ${code} dispatched`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
      logoUrl:   data.logoUrl,
    }),
  }
}

export const deliveryDispatchedBranded: EmailVariant<DeliveryDispatchedData> = {
  id:          'branded',
  name:        'Branded',
  description: 'Package emoji, courier card, internal tracking CTA. No external carrier links.',
  accent:      '#2563EB',
  render,
}
