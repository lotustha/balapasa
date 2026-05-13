import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

async function ownAddress(userId: string, id: string) {
  const a = await prisma.address.findUnique({ where: { id } })
  return a && a.userId === userId ? a : null
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  const { id } = await ctx.params

  const owned = await ownAddress(user.sub, id)
  if (!owned) return Response.json({ error: 'Address not found' }, { status: 404 })

  try {
    const body = await req.json() as Partial<{
      label: string; name: string; phone: string
      address: string; house: string; road: string; city: string
      lat: number; lng: number; isDefault: boolean
      province: string; district: string; municipality: string
      ward: string; street: string; tole: string
    }>

    const data: Record<string, unknown> = {}
    if (body.label        !== undefined) data.label        = body.label.trim()   || 'Home'
    if (body.name         !== undefined) data.name         = body.name.trim()
    if (body.phone        !== undefined) data.phone        = body.phone.trim()
    if (body.address      !== undefined) data.address      = body.address.trim()
    if (body.house        !== undefined) data.house        = body.house?.trim() || null
    if (body.road         !== undefined) data.road         = body.road?.trim()  || null
    if (body.city         !== undefined) data.city         = body.city.trim()   || 'Kathmandu'
    if (body.lat          !== undefined) data.lat          = typeof body.lat === 'number' ? body.lat : null
    if (body.lng          !== undefined) data.lng          = typeof body.lng === 'number' ? body.lng : null
    if (body.province     !== undefined) data.province     = body.province?.trim()     || null
    if (body.district     !== undefined) data.district     = body.district?.trim()     || null
    if (body.municipality !== undefined) data.municipality = body.municipality?.trim() || null
    if (body.ward         !== undefined) data.ward         = body.ward?.trim()         || null
    if (body.street       !== undefined) data.street       = body.street?.trim()       || null
    if (body.tole         !== undefined) data.tole         = body.tole?.trim()         || null

    // Setting default is special — clear other defaults first
    if (body.isDefault === true && !owned.isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.sub, isDefault: true },
        data:  { isDefault: false },
      })
      data.isDefault = true
    } else if (body.isDefault === false) {
      // Allow only when another address can become default
      if (owned.isDefault) {
        return Response.json({ error: 'You must set another address as default first' }, { status: 400 })
      }
      data.isDefault = false
    }

    const updated = await prisma.address.update({ where: { id }, data })
    return Response.json({ address: updated })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })
  const { id } = await ctx.params

  const owned = await ownAddress(user.sub, id)
  if (!owned) return Response.json({ error: 'Address not found' }, { status: 404 })

  try {
    await prisma.address.delete({ where: { id } })

    // If deleted one was default, promote another to default
    if (owned.isDefault) {
      const next = await prisma.address.findFirst({
        where:   { userId: user.sub },
        orderBy: { id: 'desc' },
      })
      if (next) {
        await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } })
      }
    }
    return Response.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
