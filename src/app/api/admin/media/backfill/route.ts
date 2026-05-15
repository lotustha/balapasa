import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

// POST /api/admin/media/backfill
// One-shot seed: scans places where image URLs live in the existing schema
// (products, categories, profile avatars, store logo/favicon in app_settings)
// and inserts a media_assets row for each unique URL that doesn't already
// have one. Safe to call repeatedly — relies on the unique URL constraint.
export async function POST() {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error

  const urls = new Map<string, { kind: 'image' | 'video'; source: string }>()

  try {
    const products = await prisma.product.findMany({ select: { images: true, videoUrl: true } })
    for (const p of products) {
      for (const u of p.images ?? []) if (u) urls.set(u, { kind: 'image', source: 'backfill' })
      if (p.videoUrl) urls.set(p.videoUrl, { kind: 'video', source: 'backfill' })
    }
  } catch { /* product table shape may differ — best effort */ }

  try {
    const cats = await prisma.category.findMany({ select: { image: true } })
    for (const c of cats) if (c.image) urls.set(c.image, { kind: 'image', source: 'backfill' })
  } catch { /* */ }

  try {
    const profiles = await prisma.profile.findMany({ where: { avatar: { not: null } }, select: { avatar: true } })
    for (const p of profiles) if (p.avatar) urls.set(p.avatar, { kind: 'image', source: 'backfill' })
  } catch { /* */ }

  try {
    const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM app_settings
      WHERE key IN ('STORE_LOGO_URL', 'STORE_FAVICON_URL', 'HERO_IMAGE_URL')
    `
    for (const r of rows) if (r.value) urls.set(r.value, { kind: 'image', source: 'backfill' })
  } catch { /* */ }

  let inserted = 0
  let skipped  = 0
  for (const [url, meta] of urls) {
    try {
      await prisma.mediaAsset.create({
        data: {
          url,
          filename: url.split('/').pop() ?? null,
          kind:     meta.kind,
          source:   meta.source,
        },
      })
      inserted++
    } catch {
      skipped++ // unique constraint violation — already present
    }
  }

  return Response.json({ scanned: urls.size, inserted, skipped })
}
