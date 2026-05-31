import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// DELETE /api/admin/answers/[id] — remove a single answer (e.g. an incorrect or
// abusive reply) without touching the question. Secured + mobile-ready.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireRole('MANAGER')
  if ('error' in auth) return auth.error

  const { id } = await params
  try {
    await prisma.productAnswer.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
