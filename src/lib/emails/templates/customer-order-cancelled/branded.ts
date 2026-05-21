import 'server-only'
import type { EmailVariant } from '../../registry'
import type { CustomerOrderCancelledData } from '../../types'
import { emailLayout, escapeHtml, escapeAttr, formatNpr } from '../../layout'

function render(data: CustomerOrderCancelledData): { subject: string; html: string } {
  const code = data.orderCode ?? data.orderId.slice(0, 8).toUpperCase()
  const subject = `Order ${code} cancelled`

  const refundBlock = data.refundPending
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:14px;margin-top:8px;">
         <tr><td style="padding:14px 16px;">
           <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400E;">Refund coming your way</p>
           <p style="margin:0;font-size:12px;color:#78350F;line-height:1.5;">
             You paid via <strong>${escapeHtml(data.paymentMethod)}</strong>. We&rsquo;ll issue a refund for ${formatNpr(data.total)} within 1–3 business days. Reply to this email if you don&rsquo;t see it by then.
           </p>
         </td></tr>
       </table>`
    : `<p style="margin:18px 0 0;font-size:13px;color:#475569;">No payment was taken, so there&rsquo;s nothing to refund.</p>`

  const body = `
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:#FEE2E2;border-radius:50%;font-size:30px;">✕</div>
      <h1 style="margin:16px 0 4px;font-size:22px;color:#0F172A;font-weight:800;">Order cancelled</h1>
      <p style="margin:0;font-size:14px;color:#64748B;line-height:1.55;">
        ${escapeHtml(data.recipientName)}, we&rsquo;ve cancelled order <strong style="color:#0F172A;">${escapeHtml(code)}</strong> as you requested.
      </p>
    </div>
    ${refundBlock}
    <div style="text-align:center;margin-top:24px;">
      <a href="${escapeAttr(data.orderUrl)}" style="display:inline-block;padding:12px 24px;background:#16A34A;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;">
        View order
      </a>
    </div>
  `

  return {
    subject,
    html: emailLayout({ preheader: subject, title: subject, body, siteUrl: data.siteUrl, siteName: data.siteName, tagline: data.tagline }),
  }
}

export const customerOrderCancelledBranded: EmailVariant<CustomerOrderCancelledData> = {
  id: 'branded', name: 'Branded',
  description: 'Cancellation confirmation with refund-pending callout for wallet-paid orders.',
  accent: '#DC2626', render,
}
