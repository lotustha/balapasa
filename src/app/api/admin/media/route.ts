import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

// GET /api/admin/media?kind=image&search=&take=60&cursor=&kinds=image,video
//   kind   — restrict to one of 'image' | 'video' (default: image)
//   search — substring match on filename or alt (case-insensitive)
//   take   — page size (default 60, max 200)
//   cursor — id of last asset from previous page for keyset pagination
export async function GET(req: NextRequest) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error

  const url    = new URL(req.url)
  const kind   = (url.searchParams.get('kind') ?? 'image') as 'image' | 'video'
  const search = (url.searchParams.get('search') ?? '').trim()
  const take   = Math.min(Math.max(1, Number(url.searchParams.get('take') ?? '60')), 200)
  const cursor = url.searchParams.get('cursor')

  const where: Prisma.MediaAssetWhereInput = { kind }
  if (search) {
    where.OR = [
      { filename: { contains: search, mode: 'insensitive' } },
      { alt:      { contains: search, mode: 'insensitive' } },
    ]
  }

  try {
    const items = await prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true, url: true, filename: true, mimeType: true,
        sizeBytes: true, width: true, height: true, kind: true, alt: true,
        createdAt: true,
      },
    })
    const hasMore  = items.length > take
    const page     = hasMore ? items.slice(0, take) : items
    const nextCursor = hasMore ? page[page.length - 1].id : null
    return Response.json({
      items: page.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })),
      nextCursor,
    })
  } catch (e) {
    console.warn('[media GET] failed:', e)
    return Response.json({ items: [], nextCursor: null, error: 'DB error — table may need migration' })
  }
}
