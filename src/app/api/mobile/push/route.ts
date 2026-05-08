import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'

function getUserId(req: NextRequest): Promise<string | null> {
  return (async () => {
    const raw = req.headers.get('authorization')?.replace('Bearer ', '')
      || req.cookies.get(AUTH_COOKIE)?.value
    if (!raw) return null
    const p = await verifyToken(raw).catch(() => null)
    return p?.sub ?? null
  })()
}

// POST /api/mobile/push — register or refresh an FCM token
export async function POST(req: NextRequest) {
  const { token, platform = 'android' } = await req.json()
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const userId = await getUserId(req)

  await prisma.deviceToken.upsert({
    where:  { token },
    create: { token, platform, userId },
    update: { platform, userId, updatedAt: new Date() },
  })

  return NextResponse.json({ registered: true })
}

// DELETE /api/mobile/push — unregister token on logout
export async function DELETE(req: NextRequest) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })
  await prisma.deviceToken.deleteMany({ where: { token } }).catch(() => {})
  return NextResponse.json({ removed: true })
}
