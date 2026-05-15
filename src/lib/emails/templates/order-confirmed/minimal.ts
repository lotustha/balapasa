import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr, formatNpr } from '../../layout'
import type { OrderConfirmationData } from '../../order-confirmation'

function render(data: OrderConfirmationData): { subject: string; html: string } {
  const short    = data.orderId.slice(0, 8).toUpperCase()
  const subject  = `Order #${short} confirmed`
  const trackUrl = `${data.siteUrl}/track-order?id=${encodeURIComponent(data.orderId)}`

  const itemsRows = data.items.map(it => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #E5E7EB;font-size:14px;color:#111827;">
        ${escapeHtml(it.name)}<br />
        <span style="font-size:12px;color:#6B7280;">× ${it.quantity}</span>
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid #E5E7EB;font-size:14px;color:#111827;font-weight:600;">
        ${formatNpr(it.price * it.quantity)}
      </td>
    </tr>
  `).join('')

  const couponRow = (data.couponDiscount ?? 0) > 0 ? `
    <tr><td style="padding:4px 0;font-size:13px;color:#6B7280;">Promo discount</td>
        <td align="right" style="padding:4px 0;font-size:13px;color:#111827;">− ${formatNpr(data.couponDiscount!)}</td></tr>
  ` : ''
  const autoRow = (data.autoDiscount ?? 0) > 0 ? `
    <tr><td style="padding:4px 0;font-size:13px;color:#6B7280;">Auto discount</td>
        <td align="right" style="padding:4px 0;font-size:13px;color:#111827;">− ${formatNpr(data.autoDiscount!)}</td></tr>
  ` : ''
  const claim = data.magicLinkUrl ? `
    <p style="margin:24px 0 0;padding:16px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;color:#374151;line-height:1.5;">
      <strong style="color:#111827;">Claim your account.</strong> Set a password to track orders and get 10% off your next purchase.
      <br /><a href="${escapeAttr(data.magicLinkUrl)}" style="display:inline-block;margin-top:8px;color:#111827;text-decoration:underline;font-weight:600;">Claim now →</a>
    </p>
  ` : ''

  const body = `
    <p style="margin:0 0 4px;font-size:13px;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Receipt</p>
    <h1 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;letter-spacing:-0.01em;">Order #${short}</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.55;">
      Hi ${escapeHtml(data.recipientName)} — thanks for your order. We'll email again the moment it ships.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:2px solid #111827;">
      ${itemsRows}
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;">
      <tr><td style="padding:4px 0;font-size:13px;color:#6B7280;">Subtotal</td>
          <td align="right" style="padding:4px 0;font-size:13px;color:#111827;">${formatNpr(data.subtotal)}</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#6B7280;">Delivery</td>
          <td align="right" style="padding:4px 0;font-size:13px;color:#111827;">${data.deliveryCharge === 0 ? 'Free' : formatNpr(data.deliveryCharge)}</td></tr>
      ${couponRow}
      ${autoRow}
      <tr><td colspan="2" style="border-top:1px solid #E5E7EB;padding-top:8px;"></td></tr>
      <tr><td style="padding:4px 0;font-size:15px;color:#111827;font-weight:700;">Total</td>
          <td align="right" style="padding:4px 0;font-size:15px;color:#111827;font-weight:700;">${formatNpr(data.total)}</td></tr>
    </table>

    <p style="margin:24px 0 4px;font-size:12px;color:#6B7280;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Deliver to</p>
    <p style="margin:0;font-size:13px;color:#374151;line-height:1.55;">
      ${escapeHtml(data.recipientName)} · ${escapeHtml(data.recipientPhone)}<br />
      ${escapeHtml(data.address)}<br />
      <span style="color:#6B7280;">${escapeHtml(data.shippingOption)} · ${escapeHtml(prettyPayment(data.paymentMethod))}</span>
    </p>

    ${claim}

    <p style="margin:24px 0 0;font-size:13px;">
      <a href="${escapeAttr(trackUrl)}" style="color:#111827;text-decoration:underline;font-weight:600;">Track your order →</a>
    </p>
  `

  return {
    subject,
    html: emailLayout({
      preheader: `Receipt — ${formatNpr(data.total)}`,
      title:     subject,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

function prettyPayment(m: string): string {
  return ({ COD: 'Cash on Delivery', PARTIAL_COD: 'Partial COD', ESEWA: 'eSewa', KHALTI: 'Khalti' } as Record<string, string>)[m] ?? m
}

export const orderConfirmedMinimal: EmailVariant<OrderConfirmationData> = {
  id:          'minimal',
  name:        'Minimal',
  description: 'Monochrome receipt. No decorative blocks, no gradients — just clean type and a clear total.',
  accent:      '#111827',
  render,
}
