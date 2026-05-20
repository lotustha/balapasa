import 'server-only'
import type { EmailVariant } from '../../registry'
import type { DeliveryExceptionData, DeliveryExceptionKind } from '../../types'
import { emailLayout, escapeHtml, escapeAttr } from '../../layout'

const CHIP: Record<DeliveryExceptionKind, { label: string; bg: string; fg: string; verb: string }> = {
  PICKUP_FAILED:           { label: 'PICKUP DELAY',  bg: '#FEF3C7', fg: '#92400E', verb: 'pickup delayed' },
  DELIVERY_ATTEMPT_FAILED: { label: 'ATTEMPT FAIL',  bg: '#FEF3C7', fg: '#92400E', verb: 'attempt failed' },
  REDELIVERY:              { label: 'REDELIVERY',    bg: '#DBEAFE', fg: '#1E40AF', verb: 'redelivery' },
  REATTEMPTS_FAILED:       { label: 'FAILED',        bg: '#FEE2E2', fg: '#991B1B', verb: 'failed' },
  CANCELLED:               { label: 'CANCELLED',     bg: '#FEE2E2', fg: '#991B1B', verb: 'cancelled' },
}

function render(data: DeliveryExceptionData): { subject: string; html: string } {
  const code = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()
  const c    = CHIP[data.kind]

  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${c.bg};border-radius:14px;">
      <tr><td style="padding:14px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="vertical-align:middle;">
              <span style="display:inline-block;padding:3px 8px;background:#FFFFFF;color:${c.fg};border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.05em;">${c.label}</span>
              <span style="margin-left:8px;font-size:13px;color:${c.fg};font-weight:700;">#${escapeHtml(code)}</span>
            </td>
            <td align="right" style="vertical-align:middle;">
              <a href="${escapeAttr(data.orderUrl)}" style="display:inline-block;padding:8px 16px;background:#0F172A;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:700;font-size:12px;">Details</a>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:14px 0 0;font-size:14px;color:#0F172A;line-height:1.5;">
      <strong>${escapeHtml(data.recipientName)}</strong>, your order ${escapeHtml(c.verb)}.${data.comment ? ' <span style="color:#64748B;">"' + escapeHtml(data.comment) + '"</span>' : ''}
    </p>
  `

  return {
    subject: `#${code} ${c.verb}`,
    html: emailLayout({
      preheader: `#${code} ${c.verb}`,
      title:     `#${code} ${c.verb}`,
      body,
      siteUrl:   data.siteUrl,
      siteName:  data.siteName,
      tagline:   data.tagline,
    }),
  }
}

export const deliveryExceptionCompact: EmailVariant<DeliveryExceptionData> = {
  id:          'compact',
  name:        'Compact',
  description: 'Kind-aware chip + one-line copy + details button.',
  accent:      '#D97706',
  render,
}
