import 'server-only'
import { emailLayout, escapeHtml, escapeAttr, formatNpr } from './layout'

export interface OrderEmailItem {
  name:     string
  quantity: number
  price:    number
  image?:   string | null
}

export interface OrderConfirmationData {
  orderId:        string
  recipientName:  string
  recipientEmail: string
  recipientPhone: string
  address:        string
  shippingOption: string
  subtotal:       number
  deliveryCharge: number
  couponDiscount?: number | null
  autoDiscount?:   number | null
  total:          number
  paymentMethod:  string
  items:          OrderEmailItem[]
  magicLinkUrl?:  string | null
  // Brand identity — drives header, footer, subject line. Required so this
  // template stays portable across SaaS-resold instances of the storefront.
  siteUrl:        string
  siteName:       string
  tagline?:       string
}

export function renderOrderConfirmation(data: OrderConfirmationData): { subject: string; html: string } {
  const short   = data.orderId.slice(0, 8).toUpperCase()
  const subject = `Your ${data.siteName} order #${short} is confirmed`

  const trackUrl = `${data.siteUrl}/track-order?id=${encodeURIComponent(data.orderId)}`

  const itemsRows = data.items.map(it => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="56" style="vertical-align:middle;padding-right:12px;">
              ${it.image
                ? `<img src="${escapeAttr(it.image)}" width="48" height="48" alt="" style="display:block;border-radius:10px;object-fit:cover;border:1px solid #E2E8F0;" />`
                : `<div style="width:48px;height:48px;background:#F1F5F9;border-radius:10px;"></div>`}
            </td>
            <td style="vertical-align:middle;">
              <p style="margin:0;font-size:14px;color:#0F172A;font-weight:600;">${escapeHtml(it.name)}</p>
              <p style="margin:2px 0 0;font-size:12px;color:#64748B;">× ${it.quantity}</p>
            </td>
            <td align="right" style="vertical-align:middle;">
              <p style="margin:0;font-size:14px;color:#0F172A;font-weight:700;">${formatNpr(it.price * it.quantity)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('')

  const claimBlock = data.magicLinkUrl ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;background:linear-gradient(135deg,#FFFBEB,#FEF3C7);border-radius:16px;">
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#B45309;letter-spacing:0.1em;text-transform:uppercase;">Exclusive offer</p>
          <p style="margin:0 0 8px;font-size:18px;font-weight:800;color:#0F172A;">Claim your account + 10% off next order</p>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.55;">
            We&rsquo;ve saved your details for next time. Set a password to claim a one-time <strong>10% off</strong> coupon and unlock order tracking.
          </p>
          <a href="${escapeAttr(data.magicLinkUrl)}" style="display:inline-block;padding:12px 24px;background:#16A34A;color:#FFFFFF;text-decoration:none;border-radius:14px;font-weight:700;font-size:14px;">Claim my account →</a>
          <p style="margin:12px 0 0;font-size:11px;color:#92400E;">Link valid for 7 days.</p>
        </td>
      </tr>
    </table>
  ` : ''

  const couponRow = (data.couponDiscount ?? 0) > 0 ? `
    <tr>
      <td style="padding:6px 0;font-size:14px;color:#16A34A;">Promo discount</td>
      <td align="right" style="padding:6px 0;font-size:14px;color:#16A34A;font-weight:600;">− ${formatNpr(data.couponDiscount!)}</td>
    </tr>
  ` : ''

  const autoRow = (data.autoDiscount ?? 0) > 0 ? `
    <tr>
      <td style="padding:6px 0;font-size:14px;color:#16A34A;">Auto discount</td>
      <td align="right" style="padding:6px 0;font-size:14px;color:#16A34A;font-weight:600;">− ${formatNpr(data.autoDiscount!)}</td>
    </tr>
  ` : ''

  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:#DCFCE7;border-radius:50%;font-size:32px;color:#16A34A;">✓</div>
      <h1 style="margin:16px 0 4px;font-size:24px;color:#0F172A;font-weight:800;">Order confirmed!</h1>
      <p style="margin:0;font-size:14px;color:#64748B;">Thank you, ${escapeHtml(data.recipientName)}. We&rsquo;ll let you know as soon as it ships.</p>
      <p style="margin:12px 0 0;display:inline-block;padding:6px 14px;background:#F1F5F9;border-radius:999px;font-size:12px;font-weight:700;color:#475569;">Order #${short}</p>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;">
      ${itemsRows}
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;">
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#64748B;">Subtotal</td>
        <td align="right" style="padding:6px 0;font-size:14px;color:#0F172A;font-weight:600;">${formatNpr(data.subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#64748B;">Delivery</td>
        <td align="right" style="padding:6px 0;font-size:14px;color:#0F172A;font-weight:600;">${data.deliveryCharge === 0 ? 'FREE' : formatNpr(data.deliveryCharge)}</td>
      </tr>
      ${couponRow}
      ${autoRow}
      <tr><td colspan="2" style="border-top:1px solid #E2E8F0;padding-top:8px;"></td></tr>
      <tr>
        <td style="padding:6px 0;font-size:16px;color:#0F172A;font-weight:800;">Total</td>
        <td align="right" style="padding:6px 0;font-size:20px;color:#16A34A;font-weight:800;">${formatNpr(data.total)}</td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;background:#FAFBFF;border-radius:16px;border:1px solid #E2E8F0;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:800;color:#94A3B8;letter-spacing:0.08em;text-transform:uppercase;">Delivery to</p>
        <p style="margin:0 0 8px;font-size:14px;color:#0F172A;font-weight:700;">${escapeHtml(data.recipientName)} · ${escapeHtml(data.recipientPhone)}</p>
        <p style="margin:0 0 10px;font-size:13px;color:#475569;line-height:1.55;">${escapeHtml(data.address)}</p>
        <p style="margin:0;font-size:12px;color:#64748B;"><strong style="color:#475569;">Shipping:</strong> ${escapeHtml(data.shippingOption)} · <strong style="color:#475569;">Payment:</strong> ${escapeHtml(prettyPayment(data.paymentMethod))}</p>
      </td></tr>
    </table>

    ${claimBlock}

    <div style="text-align:center;margin-top:28px;">
      <a href="${escapeAttr(trackUrl)}" style="display:inline-block;padding:14px 28px;background:#16A34A;color:#FFFFFF;text-decoration:none;border-radius:14px;font-weight:700;font-size:14px;">Track this order</a>
    </div>

    <p style="margin:28px 0 0;font-size:12px;color:#94A3B8;text-align:center;">
      Questions? Reply to this email and we&rsquo;ll get back to you.
    </p>
  `

  return {
    subject,
    html: emailLayout({
      preheader: `Order #${short} — ${formatNpr(data.total)}. We'll confirm shipping soon.`,
      title:     subject,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

function prettyPayment(method: string): string {
  switch (method) {
    case 'COD':         return 'Cash on Delivery'
    case 'PARTIAL_COD': return 'Partial COD (advance + cash on delivery)'
    case 'ESEWA':       return 'eSewa'
    case 'KHALTI':      return 'Khalti'
    default:            return method
  }
}
