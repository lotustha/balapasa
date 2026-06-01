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
  // Never send to an empty/missing address (e.g. a guest order with no email).
  // Normalise to a list, drop blanks, and silently skip if nothing's left — a
  // no-op, not an error, so callers don't treat "no recipient" as a failure.
  const recipients = (Array.isArray(to) ? to : [to]).map(t => (t ?? '').trim()).filter(Boolean)
  if (recipients.length === 0) {
    console.log('[email] skipped — no recipient address')
    return { id: null, error: null }
  }

  const cfg    = await getEmailConfig()
  const client = await getClient()
  if (!client) {
    console.warn('[email] RESEND_API_KEY not set — email skipped')
    return { id: null, error: 'Email service not configured' }
  }
  try {
    const res = await client.emails.send({
      from:    from ?? cfg.from,
      to:      recipients,
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

// Wrap sendEmail with structured logging so failures are greppable per event.
// Use this from every send call site instead of bare sendEmail so we never
// silently drop an email when Resend rejects it.
export async function sendEmailLogged(
  eventId: string,
  args: SendArgs & { context?: Record<string, unknown> },
): Promise<{ id: string | null; error: string | null }> {
  const { context, ...sendArgs } = args
  const res = await sendEmail(sendArgs)
  if (res.error) {
    const ctxBits = context
      ? ' ' + Object.entries(context).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ')
      : ''
    const toStr = Array.isArray(args.to) ? args.to.join(',') : args.to
    console.warn(`[email:${eventId}] failed to=${toStr} err=${JSON.stringify(res.error)}${ctxBits}`)
  } else if (res.id) {
    const toStr = Array.isArray(args.to) ? args.to.join(',') : args.to
    console.log(`[email:${eventId}] ok to=${toStr} id=${res.id}`)
  } else {
    // No id and no error → sendEmail skipped (no recipient address).
    console.log(`[email:${eventId}] skipped — no recipient`)
  }
  return res
}

// ── Health probe ────────────────────────────────────────────────────────────
// Returns a snapshot of email-config readiness. Used by the admin Notifications
// panel to surface "why aren't customers receiving emails?" without leaking
// secrets. Domain verification status is reported best-effort via Resend's
// `/domains` API — falls back to `fromDomainListed: null` if the SDK doesn't
// expose it on this Resend version.
export interface EmailHealth {
  ok:                 boolean
  apiKeyPresent:      boolean
  apiKeySource:       'db' | 'env' | 'none'
  fromAddress:        string
  fromDomain:         string | null
  fromDomainListed:   boolean | null
  fromDomainVerified: boolean | null
  replyTo:            string | null
  warnings:           string[]
}

export async function getEmailHealth(): Promise<EmailHealth> {
  const warnings: string[] = []
  let apiKeySource: 'db' | 'env' | 'none' = 'none'
  let dbApiKey = ''
  try {
    const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM app_settings WHERE key = 'RESEND_API_KEY'
    `
    dbApiKey = rows[0]?.value ?? ''
  } catch { /* DB unavailable */ }

  const cfg = await getEmailConfig()
  if (cfg.apiKey) apiKeySource = dbApiKey ? 'db' : 'env'

  const fromDomain = extractDomain(cfg.from)
  if (!cfg.apiKey)  warnings.push('RESEND_API_KEY is not set in Admin → Settings → Notifications or in .env.local.')
  if (!fromDomain)  warnings.push(`Could not parse a domain from RESEND_FROM ("${cfg.from}").`)

  let fromDomainListed: boolean | null = null
  let fromDomainVerified: boolean | null = null
  if (cfg.apiKey && fromDomain) {
    try {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
      })
      if (res.ok) {
        const json = await res.json() as { data?: Array<{ name?: string; status?: string }> }
        const match = (json.data ?? []).find(d => (d.name ?? '').toLowerCase() === fromDomain.toLowerCase())
        fromDomainListed = !!match
        fromDomainVerified = match?.status === 'verified'
        if (!fromDomainListed)        warnings.push(`Domain "${fromDomain}" is not added to your Resend account.`)
        else if (!fromDomainVerified) warnings.push(`Domain "${fromDomain}" is added but not verified — Resend will reject sends.`)
      } else if (res.status === 401) {
        warnings.push('Resend API key is invalid or revoked (got 401).')
      }
    } catch (e) {
      // network or SDK issue — leave verified=null so UI shows "could not verify"
      console.warn('[email:health] could not check Resend domains:', e)
    }
  }

  return {
    ok: cfg.apiKey != null && fromDomainVerified !== false && warnings.length === 0,
    apiKeyPresent:      cfg.apiKey != null,
    apiKeySource,
    fromAddress:        cfg.from,
    fromDomain,
    fromDomainListed,
    fromDomainVerified,
    replyTo:            cfg.replyTo ?? null,
    warnings,
  }
}

function extractDomain(from: string): string | null {
  // Accepts "Name <addr@domain>" or "addr@domain".
  const m = from.match(/<([^>]+)>/)
  const addr = (m?.[1] ?? from).trim()
  const at = addr.lastIndexOf('@')
  if (at < 0) return null
  return addr.slice(at + 1).toLowerCase()
}
