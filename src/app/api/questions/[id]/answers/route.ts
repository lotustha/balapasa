import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: questionId } = await params
  const token = req.cookies.get(AUTH_COOKIE)?.value
  if (!token) return Response.json({ error: 'You must be logged in to answer' }, { status: 401 })

  const payload = await verifyToken(token)
  if (!payload) return Response.json({ error: 'Invalid session' }, { status: 401 })

  try {
    const { body } = await req.json()
    const text = typeof body === 'string' ? body.trim() : ''
    if (text.length < 2) return Response.json({ error: 'Answer is too short' }, { status: 400 })
    if (text.length > 1000) return Response.json({ error: 'Answer must be under 1000 characters' }, { status: 400 })

    const profile = await prisma.profile.findUnique({ where: { id: payload.sub }, select: { name: true, email: true, role: true } })
    const isOfficial = profile?.role !== 'CUSTOMER'  // STAFF/MANAGER/ADMIN → official
    const authorName = profile?.name ?? profile?.email?.split('@')[0] ?? 'Staff'

    const answer = await prisma.productAnswer.create({
      data: { questionId, userId: payload.sub, authorName, body: text, isOfficial },
    })
    return Response.json({ answer })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
