import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: productId } = await params
  try {
    const questions = await prisma.productQuestion.findMany({
      where: { productId, isApproved: true },
      include: {
        answers: { orderBy: [{ isOfficial: 'desc' }, { createdAt: 'asc' }] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return Response.json({ questions })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg, questions: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id: productId } = await params
  const token = req.cookies.get(AUTH_COOKIE)?.value
  const payload = token ? await verifyToken(token) : null

  try {
    const { body, authorName } = await req.json()
    const text = typeof body === 'string' ? body.trim() : ''
    if (text.length < 5) return Response.json({ error: 'Question must be at least 5 characters' }, { status: 400 })
    if (text.length > 500) return Response.json({ error: 'Question must be under 500 characters' }, { status: 400 })

    let resolvedName = 'Anonymous'
    if (payload) {
      const profile = await prisma.profile.findUnique({ where: { id: payload.sub }, select: { name: true, email: true } })
      resolvedName = profile?.name ?? profile?.email?.split('@')[0] ?? 'Customer'
    } else if (typeof authorName === 'string' && authorName.trim()) {
      resolvedName = authorName.trim().slice(0, 50)
    }

    const question = await prisma.productQuestion.create({
      data: { productId, userId: payload?.sub ?? null, authorName: resolvedName, body: text },
    })
    return Response.json({ question })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
