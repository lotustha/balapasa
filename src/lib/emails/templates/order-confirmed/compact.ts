import 'server-only'
import type { EmailVariant } from '../../registry'
import { emailLayout, escapeHtml, escapeAttr, formatNpr } from '../../layout'
import type { OrderConfirmationData } from '../../order-confirmation'

function render(data: OrderConfirmationData): { subject: string; html: string } {
  const short    = data.orderId.slice(0, 8).toUpperCase()
  const subject  = `✓ Order #${short} — ${formatNpr(data.total)}`
  const trackUrl = `${data.siteUrl}/track-order?id=${encodeURIComponent(data.orderId)}`

  const itemsRows = data.items.map(it => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #F1F5F9;font-size:13px;color:#0F172A;">
        ${escapeHtml(it.name)} <span style="color:#94A3B8;">×${it.quantity}</span>
      </td>
      <td align="right" style="padding:6px 8px;border-bottom:1px solid #F1F5F9;font-size:13px;color:#0F172A;font-weight:600;white-space:nowrap;">
        ${formatNpr(it.price * it.quantity)}
      </td>
    </tr>
  `).join('')

  const couponLine = (data.couponDiscount ?? 0) > 0
    ? `<span style="color:#16A34A;">− ${formatNpr(data.couponDiscount!)} promo</span> · ` : ''
  const autoLine = (data.autoDiscount ?? 0) > 0
    ? `<span style="color:#16A34A;">− ${formatNpr(data.autoDiscount!)} auto</span> · ` : ''

  const claim = data.magicLinkUrl ? `
    <a href="${escapeAttr(data.magicLinkUrl)}" style="display:block;margin-top:12px;padding:12px;background:#FEF3C7;border-radius:10px;text-decoration:none;font-size:13px;color:#92400E;font-weight:600;line-height:1.4;">
      🎁 Claim 10% off — set a password to keep your details →
    </a>
  ` : ''

  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;border-radius:14px;">
      <tr><td style="padding:14px 16px;">
        <span style="display:inline-block;padding:3px 8px;background:#DCFCE7;color:#15803D;border-radius:999px;font-size:11px;font-weight:800;">CONFIRMED</span>
        <span style="margin-left:8px;font-size:13px;color:#475569;font-weight:600;">Order #${short}</span>
      </td></tr>
    </table>

    <p style="margin:14px 0 6px;font-size:14px;color:#0F172A;line-height:1.45;">
      <strong>${escapeHtml(data.recipientName)}</strong>, we got your order. Items below.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;">
      ${itemsRows}
      <tr>
        <td style="padding:10px 8px;font-size:14px;color:#0F172A;font-weight:800;background:#F8FAFC;">
          Total
        </td>
        <td align="right" style="padding:10px 8px;font-size:15px;color:#16A34A;font-weight:800;background:#F8FAFC;">
          ${formatNpr(data.total)}
        </td>
      </tr>
    </table>

    <p style="margin:8px 0 0;font-size:11px;color:#94A3B8;line-height:1.45;">
      ${formatNpr(data.subtotal)} subtotal · ${couponLine}${autoLine}${data.deliveryCharge === 0 ? 'FREE' : formatNpr(data.deliveryCharge)} delivery
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:14px;background:#F1F5F9;border-radius:10px;">
      <tr><td style="padding:10px 12px;font-size:12px;color:#475569;line-height:1.5;">
        <strong style="color:#0F172A;">Deliver to:</strong> ${escapeHtml(data.address)}<br />
        <strong style="color:#0F172A;">Via:</strong> ${escapeHtml(data.shippingOption)} · <strong style="color:#0F172A;">Pay:</strong> ${escapeHtml(prettyPayment(data.paymentMethod))}
      </td></tr>
    </table>

    ${claim}

    <div style="text-align:center;margin-top:16px;">
      <a href="${escapeAttr(trackUrl)}" style="display:inline-block;padding:10px 20px;background:#0F172A;color:#FFFFFF;text-decoration:none;border-radius:10px;font-weight:700;font-size:13px;">Track order</a>
    </div>
  `

  return {
    subject,
    html: emailLayout({
      preheader: `Order #${short} confirmed · ${formatNpr(data.total)}`,
      title:     subject,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

function prettyPayment(m: string): string {
  return ({ COD: 'COD', PARTIAL_COD: 'Partial COD', ESEWA: 'eSewa', KHALTI: 'Khalti' } as Record<string, string>)[m] ?? m
}

export const orderConfirmedCompact: EmailVariant<OrderConfirmationData> = {
  id:          'compact',
  name:        'Compact',
  description: 'Dense single-column layout. Mobile-first. Status chip + tight table + one-line meta — fits above the fold on a phone.',
  accent:      '#0F172A',
  render,
}
