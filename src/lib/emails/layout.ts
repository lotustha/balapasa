import 'server-only'

interface LayoutArgs {
  preheader?: string
  title:      string
  body:       string
  /** Public canonical URL of the store. Used for header logo + footer links. */
  siteUrl:    string
  /** Brand name shown in the email header. */
  siteName:   string
  /** Short marketing tagline shown in the email footer. */
  tagline?:   string
}

// Mail-client-compatible layout (table-based). Inline styles only — many mail
// clients strip <style> tags or do not respect CSS variables.
export function emailLayout({
  preheader, title, body, siteUrl, siteName, tagline,
}: LayoutArgs): string {
  const pre  = preheader ?? ''
  const tag  = tagline   ?? 'Premium electronics, gadgets & beauty · Fast delivery'
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F6FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0F172A;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;color:transparent;">${escapeHtml(pre)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4F6FF;padding:24px 0;">
  <tr>
    <td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 8px 28px rgba(15,23,42,0.06);">
        <tr>
          <td style="padding:32px 32px 16px;text-align:left;">
            <a href="${escapeAttr(siteUrl)}" style="text-decoration:none;color:#16A34A;font-weight:800;font-size:20px;letter-spacing:-0.01em;">${escapeHtml(siteName)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 24px;">${body}</td>
        </tr>
        <tr>
          <td style="padding:24px 32px;background:#FAFBFF;border-top:1px solid #E2E8F0;font-size:12px;color:#64748B;line-height:1.6;">
            <p style="margin:0 0 6px;font-weight:700;color:#475569;">${escapeHtml(siteName)}</p>
            <p style="margin:0;">${escapeHtml(tag)}</p>
            <p style="margin:12px 0 0;">
              <a href="${escapeAttr(siteUrl)}" style="color:#16A34A;text-decoration:none;font-weight:600;">Visit store</a>
              &nbsp;·&nbsp;
              <a href="${escapeAttr(siteUrl)}/account" style="color:#16A34A;text-decoration:none;font-weight:600;">My account</a>
              &nbsp;·&nbsp;
              <a href="${escapeAttr(siteUrl)}/contact" style="color:#16A34A;text-decoration:none;font-weight:600;">Contact</a>
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#94A3B8;max-width:600px;text-align:center;">
        You received this email because you placed an order at ${escapeHtml(siteName)}. If this wasn&rsquo;t you, ignore this message.
      </p>
    </td>
  </tr>
</table>
</body>
</html>`
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function escapeAttr(s: string): string {
  return escapeHtml(s)
}

export function formatNpr(amount: number): string {
  return 'Rs. ' + Math.round(amount).toLocaleString('en-IN')
}
