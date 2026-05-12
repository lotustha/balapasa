import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const addresses = await prisma.address.findMany({
      where:   { userId: user.sub },
      orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
    })
    return Response.json({ addresses })
  } catch (e) {
    console.error('[addresses GET]', e)
    return Response.json({ error: 'DB error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const body = await req.json() as Partial<{
      label: string; name: string; phone: string
      address: string; house: string; road: string; city: string
      lat: number; lng: number; isDefault: boolean
    }>

    if (!body.name?.trim() || !body.phone?.trim() || !body.address?.trim()) {
      return Response.json({ error: 'Name, phone, and address are required' }, { status: 400 })
    }

    // If this is the first address, it becomes default automatically.
    const existingCount = await prisma.address.count({ where: { userId: user.sub } })
    const setDefault   = body.isDefault === true || existingCount === 0

    if (setDefault) {
      // Clear other defaults
      await prisma.address.updateMany({
        where: { userId: user.sub, isDefault: true },
        data:  { isDefault: false },
      })
    }

    const created = await prisma.address.create({
      data: {
        userId:    user.sub,
        label:     body.label?.trim() || 'Home',
        name:      body.name.trim(),
        phone:     body.phone.trim(),
        address:   body.address.trim(),
        house:     body.house?.trim() || null,
        road:      body.road?.trim()  || null,
        city:      body.city?.trim()  || 'Kathmandu',
        lat:       typeof body.lat === 'number' ? body.lat : null,
        lng:       typeof body.lng === 'number' ? body.lng : null,
        isDefault: setDefault,
      },
    })
    return Response.json({ address: created }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
