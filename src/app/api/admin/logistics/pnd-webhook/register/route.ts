import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getPicknDropConfig, invalidatePndCache } from '@/lib/logistics-config'
import { getSiteSettings } from '@/lib/site-settings'

// POST — registers (or re-registers) our /api/webhooks/pickndrop URL with
// Pick & Drop. Generates a fresh secret if none exists, persists it on the
// LogisticsSettings row, then calls PnD's /api/v2/create_webhook.
//
// GET — returns the current registration state (URL, masked secret, last
// registered timestamp) for the admin Settings panel.

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const [cfg, row, settings] = await Promise.all([
    getPicknDropConfig(),
    prisma.logisticsSettings.findUnique({
      where:  { provider: 'PICKNDROP' },
      select: { webhookSecret: true, webhookRegisteredAt: true },
    }),
    getSiteSettings(),
  ])

  return Response.json({
    url:             `${settings.storeUrl}/api/webhooks/pickndrop`,
    secretMasked:    row?.webhookSecret ? mask(row.webhookSecret) : null,
    hasSecret:       !!row?.webhookSecret,
    lastRegistered:  row?.webhookRegisteredAt?.toISOString() ?? null,
    pndBaseUrl:      cfg.baseUrl,
    pndActive:       cfg.isActive,
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as { rotate?: boolean }
  const rotateSecret = body.rotate === true

  const cfg = await getPicknDropConfig()
  if (!cfg.apiKey || !cfg.apiSecret || !cfg.baseUrl) {
    return Response.json({ error: 'Pick & Drop API credentials missing — fill them in first.' }, { status: 400 })
  }

  const settings = await getSiteSettings()
  const webhookUrl = `${settings.storeUrl}/api/webhooks/pickndrop`

  // Generate or reuse the webhook secret.
  const existing = await prisma.logisticsSettings.findUnique({
    where:  { provider: 'PICKNDROP' },
    select: { webhookSecret: true },
  })
  const secret = rotateSecret || !existing?.webhookSecret
    ? crypto.randomBytes(32).toString('hex')
    : existing.webhookSecret

  // Register with PnD.
  let pndResponse: unknown
  try {
    const res = await fetch(`${cfg.baseUrl}/api/v2/create_webhook`, {
      method: 'POST',
      headers: {
        Authorization: `token ${cfg.apiKey}:${cfg.apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request_url:    webhookUrl,
        webhook_secret: secret,
        enabled:        true,
      }),
    })
    const text = await res.text()
    try { pndResponse = JSON.parse(text) } catch { pndResponse = text }
    if (!res.ok) {
      return Response.json({ error: `PnD returned ${res.status}`, pndResponse }, { status: 502 })
    }
  } catch (e) {
    return Response.json({ error: `Network error calling PnD: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 })
  }

  // Persist the secret + timestamp on success.
  await prisma.logisticsSettings.update({
    where: { provider: 'PICKNDROP' },
    data:  { webhookSecret: secret, webhookRegisteredAt: new Date() },
  })
  invalidatePndCache()

  return Response.json({
    ok:              true,
    url:             webhookUrl,
    secretMasked:    mask(secret),
    lastRegistered:  new Date().toISOString(),
    pndResponse,
  })
}

function mask(s: string): string {
  if (s.length <= 8) return '••••••••'
  return '••••' + s.slice(-4)
}
