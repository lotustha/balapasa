import { NextRequest } from 'next/server'
import { prisma }     from '@/lib/prisma'

const SECRET_KEYS = new Set([
  'ANTHROPIC_API_KEY', 'GEMINI_API_KEY',
  'ESEWA_SECRET_KEY', 'KHALTI_SECRET_KEY',
  'WHATSAPP_ACCESS_TOKEN', 'FACEBOOK_PAGE_ACCESS_TOKEN',
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

    return Response.json({ success: true, saved: entries.length })
  } catch (e) {
    console.error('[settings POST]', e)
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
