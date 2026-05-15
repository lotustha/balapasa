import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma }     from '@/lib/prisma'
import { invalidateEmailConfigCache } from '@/lib/email'
import { invalidateActiveVariantCache } from '@/lib/emails/registry'
import { invalidatePaymentConfigCache } from '@/lib/payment'

const SECRET_KEYS = new Set([
  'ANTHROPIC_API_KEY', 'GEMINI_API_KEY',
  'ESEWA_SECRET_KEY', 'KHALTI_SECRET_KEY',
  'WHATSAPP_ACCESS_TOKEN', 'FACEBOOK_PAGE_ACCESS_TOKEN',
  'RESEND_API_KEY',
  'OPENWEATHER_API_KEY',
])

const PUBLIC_SITE_KEYS = new Set([
  'STORE_NAME', 'STORE_LOGO_URL', 'STORE_FAVICON_URL', 'WHATSAPP_NUMBER',
  'HERO_BADGE_TEXT', 'HERO_HEADLINE_1', 'HERO_HEADLINE_2', 'HERO_ACCENT_WORD',
  'HERO_TAGLINE', 'HERO_SUBHEAD',
  'HERO_CTA_PRIMARY_LABEL', 'HERO_CTA_PRIMARY_URL',
  'HERO_CTA_SECONDARY_LABEL', 'HERO_CTA_SECONDARY_URL',
  'HERO_BADGES_JSON',
])

function mask(key: string, value: string) {
  if (!SECRET_KEYS.has(key)) return value
  if (value.length <= 8) return '••••••••'
  return '••••' + value.slice(-4)
}

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM app_settings
    `
    const settings: Record<string, string> = {}
    for (const r of rows) settings[r.key] = mask(r.key, r.value)
    return Response.json({ settings })
  } catch (e) {
    console.error('[settings GET]', e)
    return Response.json({ settings: {}, error: 'DB error' })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, string>

    const entries = Object.entries(body).filter(
      ([, v]) => v !== undefined && v !== '' && !v.startsWith('••'),
    )

    if (entries.length === 0) {
      return Response.json({ success: true, saved: 0, message: 'Nothing to save (no changed values)' })
    }

    for (const [key, value] of entries) {
      await prisma.$executeRaw`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES (${key}, ${value}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
      `
    }

    if (entries.some(([k]) => PUBLIC_SITE_KEYS.has(k))) {
      revalidatePath('/', 'layout')
    }
    if (entries.some(([k]) => k.startsWith('RESEND_'))) {
      invalidateEmailConfigCache()
    }
    if (entries.some(([k]) => k.startsWith('EMAIL_TEMPLATE_'))) {
      invalidateActiveVariantCache()
    }
    if (entries.some(([k]) => k.startsWith('ESEWA_') || k.startsWith('KHALTI_'))) {
      invalidatePaymentConfigCache()
    }

    return Response.json({ success: true, saved: entries.length })
  } catch (e) {
    console.error('[settings POST]', e)
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
