import 'server-only'
import { Resend } from 'resend'

const FROM_DEFAULT = process.env.RESEND_FROM ?? 'Balapasa <noreply@balapasa.com>'
const REPLY_TO     = process.env.RESEND_REPLY_TO ?? undefined

let cachedClient: Resend | null = null

function getClient(): Resend | null {
  if (cachedClient) return cachedClient
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[email] RESEND_API_KEY not set — emails will be skipped')
    return null
  }
  cachedClient = new Resend(key)
  return cachedClient
}

interface SendArgs {
  to:       string | string[]
  subject:  string
  html:     string
  text?:    string
  from?:    string
}

export async function sendEmail({ to, subject, html, text, from }: SendArgs): Promise<{ id: string | null; error: string | null }> {
  const client = getClient()
  if (!client) {
    return { id: null, error: 'Email service not configured' }
  }
  try {
    const res = await client.emails.send({
      from:    from ?? FROM_DEFAULT,
      to,
      subject,
      html,
      text:    text ?? stripHtml(html),
      replyTo: REPLY_TO,
    })
    if (res.error) {
      console.warn('[email] resend returned error:', res.error)
      return { id: null, error: res.error.message ?? 'Email send failed' }
    }
    return { id: res.data?.id ?? null, error: null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[email] send failed:', msg)
    return { id: null, error: msg }
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
