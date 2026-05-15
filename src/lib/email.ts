import 'server-only'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'

const DEFAULT_FROM = 'Balapasa <noreply@balapasa.com>'
const CACHE_TTL_MS = 30_000

export interface EmailConfig {
  apiKey:  string | null
  from:    string
  replyTo: string | undefined
}

let configCache: { value: EmailConfig; expiresAt: number } | null = null
let clientCache: { key: string; client: Resend } | null = null

export async function getEmailConfig(): Promise<EmailConfig> {
  const now = Date.now()
  if (configCache && configCache.expiresAt > now) return configCache.value

  let rows: { key: string; value: string }[] = []
  try {
    rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM app_settings
      WHERE key IN ('RESEND_API_KEY', 'RESEND_FROM', 'RESEND_REPLY_TO')
    `
  } catch (e) {
    console.warn('[email] config DB read failed, falling back to env:', e)
  }
  const db = Object.fromEntries(rows.map(r => [r.key, r.value]))

  const config: EmailConfig = {
    apiKey:  db.RESEND_API_KEY   || process.env.RESEND_API_KEY   || null,
    from:    db.RESEND_FROM      || process.env.RESEND_FROM      || DEFAULT_FROM,
    replyTo: db.RESEND_REPLY_TO  || process.env.RESEND_REPLY_TO  || undefined,
  }
  configCache = { value: config, expiresAt: now + CACHE_TTL_MS }
  return config
}

// Called from admin settings POST after any RESEND_* key changes so the next
// send picks up the new value immediately instead of waiting 30s.
export function invalidateEmailConfigCache(): void {
  configCache = null
  clientCache = null
}

async function getClient(): Promise<Resend | null> {
  const { apiKey } = await getEmailConfig()
  if (!apiKey) return null
  if (clientCache && clientCache.key === apiKey) return clientCache.client
  clientCache = { key: apiKey, client: new Resend(apiKey) }
  return clientCache.client
}

interface SendArgs {
  to:       string | string[]
  subject:  string
  html:     string
  text?:    string
  from?:    string
}

export async function sendEmail({ to, subject, html, text, from }: SendArgs): Promise<{ id: string | null; error: string | null }> {
  const cfg    = await getEmailConfig()
  const client = await getClient()
  if (!client) {
    console.warn('[email] RESEND_API_KEY not set — email skipped')
    return { id: null, error: 'Email service not configured' }
  }
  try {
    const res = await client.emails.send({
      from:    from ?? cfg.from,
      to,
      subject,
      html,
      text:    text ?? stripHtml(html),
      replyTo: cfg.replyTo,
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
