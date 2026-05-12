import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const STAFF_ROLES = ['STAFF', 'MANAGER', 'ADMIN'] as const

export async function GET() {
  const auth = await requireRole('ADMIN')
  if ('error' in auth) return auth.error
  try {
    const profiles = await prisma.profile.findMany({
      where:   { role: { in: [...STAFF_ROLES] } },
      orderBy: [{ role: 'desc' }, { createdAt: 'desc' }],
      select:  {
        id: true, name: true, email: true, phone: true, avatar: true,
        role: true, createdAt: true,
      },
    })
    return Response.json({ team: profiles })
  } catch (e) {
    console.error('[team GET]', e)
    return Response.json({ team: [] })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('ADMIN')
  if ('error' in auth) return auth.error
  try {
    const { email, password, name, phone, role } = await req.json() as {
      email?: string; password?: string; name?: string; phone?: string; role?: string
    }
    if (!email?.trim() || !password)
      return Response.json({ error: 'Email and password required' }, { status: 400 })
    if (password.length < 8)
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    if (!role || !STAFF_ROLES.includes(role as 'STAFF'))
      return Response.json({ error: 'Role must be STAFF, MANAGER, or ADMIN' }, { status: 400 })

    const existing = await prisma.profile.findUnique({ where: { email: email.trim() } })
    if (existing)
      return Response.json({ error: 'Email already registered' }, { status: 409 })

    const hash = await bcrypt.hash(password, 12)
    const profile = await prisma.profile.create({
      data: {
        email: email.trim(),
        password: hash,
        name:  name?.trim()  || null,
        phone: phone?.trim() || null,
        role:  role as 'STAFF' | 'MANAGER' | 'ADMIN',
      },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    })
    return Response.json(profile, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
