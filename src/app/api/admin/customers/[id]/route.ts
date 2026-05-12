import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const VALID_ROLES = new Set(['CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN'])

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('ADMIN')
  if ('error' in auth) return auth.error
  const { id } = await ctx.params
  try {
    const body = await req.json() as Partial<{
      name: string; phone: string; role: string; password: string
    }>

    const data: Record<string, unknown> = {}
    if (body.name  !== undefined) data.name  = body.name.trim()  || null
    if (body.phone !== undefined) data.phone = body.phone.trim() || null
    if (body.role  !== undefined) {
      if (!VALID_ROLES.has(body.role)) {
        return Response.json({ error: 'Invalid role' }, { status: 400 })
      }
      // Self-demotion guard — admin can't strip own ADMIN
      if (auth.user.sub === id && body.role !== 'ADMIN') {
        return Response.json({ error: 'You cannot change your own role' }, { status: 400 })
      }
      data.role = body.role
    }
    if (body.password !== undefined) {
      if (body.password.length < 8) {
        return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
      }
      data.password = await bcrypt.hash(body.password, 12)
    }

    const updated = await prisma.profile.update({ where: { id }, data })
    const { password: _omit, ...safe } = updated as { password?: string | null } & typeof updated
    void _omit
    return Response.json(safe)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('ADMIN')
  if ('error' in auth) return auth.error
  const { id } = await ctx.params
  if (auth.user.sub === id) {
    return Response.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }
  try {
    // Order.userId is nullable, so deleting the profile will cascade-null on orders.
    // Wishlist + addresses cascade-delete via FK.
    await prisma.profile.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
