import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireRole('STAFF')
  if ('error' in auth) return auth.error

  const { searchParams } = req.nextUrl
  const platform = searchParams.get('platform') ?? undefined
  const status   = searchParams.get('status')   ?? undefined

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        ...(platform && { platform }),
        ...(status   && { status }),
      },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
    })
    return Response.json({ conversations })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
