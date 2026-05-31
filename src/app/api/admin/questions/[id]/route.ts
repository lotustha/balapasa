import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/admin/questions/[id]  { isApproved: boolean }
// Hide (isApproved=false) or restore (true) a question. Hidden questions stop
// appearing on the public product page (its GET filters isApproved: true).
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireRole('MANAGER')
  if ('error' in auth) return auth.error

  const { id } = await params
  try {
    const body = await req.json()
    if (typeof body.isApproved !== 'boolean') {
      return Response.json({ error: 'isApproved (boolean) required' }, { status: 400 })
    }
    const question = await prisma.productQuestion.update({
      where: { id },
      data: { isApproved: body.isApproved },
    })
    return Response.json({ question })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/admin/questions/[id] — removes the question and its answers (cascade).
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireRole('MANAGER')
  if ('error' in auth) return auth.error

  const { id } = await params
  try {
    await prisma.productQuestion.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
