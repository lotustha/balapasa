import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const profile = await prisma.profile.findUnique({
      where:  { id: user.sub },
      select: {
        id: true, name: true, email: true, phone: true, avatar: true,
        role: true, createdAt: true,
      },
    })
    if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 })
    return Response.json({ profile })
  } catch (e) {
    console.error('[account profile GET]', e)
    return Response.json({ error: 'DB error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const body = await req.json() as Partial<{ name: string; phone: string; avatar: string }>
    const data: Record<string, unknown> = {}
    if (body.name   !== undefined) data.name   = body.name.trim()   || null
    if (body.phone  !== undefined) data.phone  = body.phone.trim()  || null
    if (body.avatar !== undefined) data.avatar = body.avatar.trim() || null
    // Note: email and role intentionally not editable here.

    const updated = await prisma.profile.update({
      where:  { id: user.sub },
      data,
      select: { id: true, name: true, email: true, phone: true, avatar: true, role: true },
    })
    return Response.json({ profile: updated })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
