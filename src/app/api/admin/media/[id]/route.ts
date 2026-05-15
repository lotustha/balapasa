import { NextRequest } from 'next/server'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

// PATCH /api/admin/media/[id] { alt?: string, filename?: string, tags?: string[] }
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error
  const { id } = await ctx.params

  let body: { alt?: unknown; filename?: unknown; tags?: unknown }
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const data: { alt?: string; filename?: string; tags?: string[] } = {}
  if (typeof body.alt === 'string')       data.alt      = body.alt
  if (typeof body.filename === 'string')  data.filename = body.filename
  if (Array.isArray(body.tags))           data.tags     = body.tags.filter((t): t is string => typeof t === 'string')

  try {
    const updated = await prisma.mediaAsset.update({ where: { id }, data })
    return Response.json({ id: updated.id })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 404 })
  }
}

// DELETE /api/admin/media/[id]
// Removes the DB row AND best-effort unlinks the underlying file. The URL
// pointing at /uploads/... maps to <cwd>/uploads/... so we can resolve it.
export async function DELETE(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error
  const { id } = await ctx.params

  try {
    const asset = await prisma.mediaAsset.findUnique({ where: { id }, select: { url: true } })
    await prisma.mediaAsset.delete({ where: { id } })
    if (asset?.url?.startsWith('/uploads/')) {
      const abs = join(process.cwd(), asset.url.replace(/^\//, ''))
      await unlink(abs).catch(() => { /* file already gone — fine */ })
    }
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 404 })
  }
}
