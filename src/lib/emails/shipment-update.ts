import 'server-only'
import { emailLayout, escapeHtml, escapeAttr } from './layout'

type Status = 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

export interface ShipmentEmailData {
  orderId:       string
  recipientName: string
  status:        Status
  trackingUrl?:  string | null
  shippingOption?: string | null
  // Brand identity — passed through from caller so this template stays portable.
  siteUrl:       string
  siteName:      string
  tagline?:      string
}

const COPY: Record<Status, { title: string; subject: (s: string) => string; lead: string; emoji: string; color: string; bg: string }> = {
  SHIPPED: {
    title:   'Your order is on its way!',
    subject: (s) => `Order #${s} shipped — track it now`,
    lead:    'is now out for delivery. Your rider is on the way.',
    emoji:   '🚚',
    color:   '#0EA5E9',
    bg:      '#E0F2FE',
  },
  DELIVERED: {
    title:   'Your order has been delivered',
    subject: (s) => `Order #${s} delivered — enjoy your purchase`,
    lead:    'was delivered successfully. We hope you love it!',
    emoji:   '✓',
    color:   '#16A34A',
    bg:      '#DCFCE7',
  },
  CANCELLED: {
    title:   'Order cancelled',
    subject: (s) => `Order #${s} was cancelled`,
    lead:    'has been cancelled. If this was unexpected, please reach out.',
    emoji:   '✕',
    color:   '#E11D48',
    bg:      '#FFE4E6',
  },
}

export function renderShipmentUpdate(data: ShipmentEmailData): { subject: string; html: string } {
  const short = data.orderId.slice(0, 8).toUpperCase()
  const copy  = COPY[data.status]
  const trackHref = data.trackingUrl ?? `${data.siteUrl}/track-order?id=${encodeURIComponent(data.orderId)}`

  const trackBtn = data.status === 'CANCELLED' ? '' : `
    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(trackHref)}" style="display:inline-block;padding:14px 28px;background:#16A34A;color:#FFFFFF;text-decoration:none;border-radius:14px;font-weight:700;font-size:14px;">
        ${data.status === 'DELIVERED' ? 'Leave a review' : 'Track this order'}
      </a>
    </div>
  `

  const shippingLine = data.shippingOption ? `<p style="margin:8px 0 0;font-size:13px;color:#64748B;">Shipped via <strong style="color:#475569;">${escapeHtml(data.shippingOption)}</strong></p>` : ''

  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:${copy.bg};border-radius:50%;font-size:32px;color:${copy.color};">${copy.emoji}</div>
      <h1 style="margin:16px 0 4px;font-size:24px;color:#0F172A;font-weight:800;">${escapeHtml(copy.title)}</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">
        ${escapeHtml(data.recipientName)}, your order <strong style="color:#0F172A;">#${short}</strong> ${escapeHtml(copy.lead)}
      </p>
      ${shippingLine}
      <p style="margin:14px 0 0;display:inline-block;padding:6px 14px;background:#F1F5F9;border-radius:999px;font-size:12px;font-weight:700;color:#475569;">Order #${short}</p>
    </div>

    ${trackBtn}

    <p style="margin:24px 0 0;font-size:12px;color:#94A3B8;text-align:center;">
      Questions? Reply to this email and we&rsquo;ll get back to you.
    </p>
  `

  return {
    subject: copy.subject(short),
    html: emailLayout({
      preheader: `Order #${short} — ${copy.title}`,
      title:     copy.subject(short),
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}
