import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const { currentPassword, newPassword } = await req.json() as {
      currentPassword?: string; newPassword?: string
    }
    if (!newPassword || newPassword.length < 8) {
      return Response.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }

    const profile = await prisma.profile.findUnique({ where: { id: user.sub } })
    if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 })

    // If a current password is set, verify it before updating
    if (profile.password) {
      if (!currentPassword) {
        return Response.json({ error: 'Current password required' }, { status: 400 })
      }
      const valid = await bcrypt.compare(currentPassword, profile.password)
      if (!valid) {
        return Response.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
    }

    const hash = await bcrypt.hash(newPassword, 12)
    await prisma.profile.update({ where: { id: user.sub }, data: { password: hash } })
    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
