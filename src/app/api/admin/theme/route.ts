import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { normalizeTheme, parseThemeSetting, THEME_SETTING_KEY, type ThemeSetting } from '@/lib/theme/presets'

async function load(): Promise<ThemeSetting> {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: [THEME_SETTING_KEY, 'STORE_THEME'] } } })
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return parseThemeSetting(map[THEME_SETTING_KEY], map.STORE_THEME)
}

async function save(setting: ThemeSetting) {
  const value = JSON.stringify(setting)
  await prisma.appSetting.upsert({
    where:  { key: THEME_SETTING_KEY },
    update: { value },
    create: { key: THEME_SETTING_KEY, value },
  })
}

// GET /api/admin/theme: the published theme and the admin's unpublished draft.
export async function GET() {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error
  return Response.json(await load())
}

// POST /api/admin/theme { action: 'draft' | 'publish' | 'discard', theme? }
//   draft:   remembers work in progress. Shoppers see no change.
//   publish: makes `theme` the live storefront look and clears the draft.
//   discard: throws the draft away.
export async function POST(req: NextRequest) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error

  const body = await req.json().catch(() => ({})) as { action?: string; theme?: unknown }
  const current = await load()

  if (body.action === 'draft') {
    if (!body.theme) return Response.json({ error: 'No theme given' }, { status: 400 })
    const next = { published: current.published, draft: normalizeTheme(body.theme) }
    await save(next)
    return Response.json(next)
  }
  if (body.action === 'publish') {
    if (!body.theme) return Response.json({ error: 'No theme given' }, { status: 400 })
    const next = { published: normalizeTheme(body.theme), draft: null }
    await save(next)
    // Every storefront page is built with the theme, so all of them are rebuilt.
    revalidatePath('/', 'layout')
    return Response.json(next)
  }
  if (body.action === 'discard') {
    const next = { published: current.published, draft: null }
    await save(next)
    return Response.json(next)
  }
  return Response.json({ error: 'Unknown action' }, { status: 400 })
}
