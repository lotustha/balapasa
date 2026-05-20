import 'server-only'
import type { EmailVariant } from '../../registry'
import type { DeliveryExceptionData, DeliveryExceptionKind } from '../../types'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'

const COPY: Record<DeliveryExceptionKind, { title: string; lead: string; subjectVerb: string; emoji: string; color: string; bg: string; nextSteps: string }> = {
  PICKUP_FAILED:           { title: "We couldn't pick up your package yet", lead: 'Our courier wasn\'t able to collect your order from us. We\'re trying again.', subjectVerb: 'pickup delayed',     emoji: '⏳', color: '#D97706', bg: '#FEF3C7', nextSteps: 'No action needed from you — we\'ll keep retrying.' },
  DELIVERY_ATTEMPT_FAILED: { title: 'A delivery attempt was unsuccessful',  lead: 'Our rider tried to reach you but couldn\'t complete the delivery.',           subjectVerb: 'delivery attempt failed', emoji: '⚠️', color: '#D97706', bg: '#FEF3C7', nextSteps: 'They\'ll attempt redelivery shortly. If your address or phone is wrong, reply to this email.' },
  REDELIVERY:              { title: 'Redelivery scheduled',                 lead: 'Your order is queued for another delivery attempt.',                          subjectVerb: 'redelivery scheduled',    emoji: '🔁', color: '#2563EB', bg: '#DBEAFE', nextSteps: 'Stand by for the next attempt — you\'ll get an SMS when the rider is close.' },
  REATTEMPTS_FAILED:       { title: "Delivery couldn't be completed",       lead: 'After multiple attempts we still couldn\'t reach you.',                       subjectVerb: 'delivery failed',         emoji: '❌', color: '#DC2626', bg: '#FEE2E2', nextSteps: 'Please reply with a new address or phone, or visit our store to collect.' },
  CANCELLED:               { title: 'Your order has been cancelled',        lead: 'Delivery wasn\'t possible and the order has been cancelled.',                subjectVerb: 'cancelled',               emoji: '✕',  color: '#DC2626', bg: '#FEE2E2', nextSteps: 'If you paid online, the refund will be issued within 3–5 business days. Reply if you need help.' },
}

function render(data: DeliveryExceptionData): { subject: string; html: string } {
  const code  = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()
  const copy  = COPY[data.kind]
  const subject = `Order ${code} — ${copy.subjectVerb}`

  const comment = data.comment
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFBFF;border:1px solid #E2E8F0;border-radius:14px;margin-top:16px;">
         <tr><td style="padding:14px 16px;">
           <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;font-weight:700;">Courier note</p>
           <p style="margin:0;font-size:13px;color:#475569;line-height:1.5;">${escapeHtml(data.comment)}</p>
         </td></tr>
       </table>`
    : ''

  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:${copy.bg};border-radius:50%;font-size:30px;">${copy.emoji}</div>
      <h1 style="margin:16px 0 4px;font-size:22px;color:#0F172A;font-weight:800;">${escapeHtml(copy.title)}</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">
        ${escapeHtml(data.recipientName)} — ${escapeHtml(copy.lead)}
      </p>
      <p style="margin:14px 0 0;display:inline-block;padding:6px 14px;background:#F1F5F9;border-radius:999px;font-size:12px;font-weight:700;color:#475569;">Order ${escapeHtml(code)}</p>
    </div>

    ${comment}

    <p style="margin:18px 0 0;font-size:13px;color:#475569;line-height:1.5;">
      <strong>Next:</strong> ${escapeHtml(copy.nextSteps)}
    </p>

    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(data.orderUrl)}" style="display:inline-block;padding:14px 28px;background:#16A34A;color:#FFFFFF;text-decoration:none;border-radius:14px;font-weight:700;font-size:14px;">
        Open order details
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
    }),
  }
}

export const deliveryExceptionBranded: EmailVariant<DeliveryExceptionData> = {
  id:          'branded',
  name:        'Branded',
  description: 'Kind-aware emoji + colour, courier comment quote, next-step copy, internal order link.',
  accent:      '#D97706',
  render,
}
