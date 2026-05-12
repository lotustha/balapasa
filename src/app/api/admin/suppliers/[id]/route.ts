import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const body = await req.json() as Partial<{
      name: string; contactName: string; email: string
      phone: string; address: string; notes: string; isActive: boolean
    }>

    const data: Record<string, unknown> = {}
    if (body.name        !== undefined) data.name        = body.name.trim()
    if (body.contactName !== undefined) data.contactName = body.contactName.trim() || null
    if (body.email       !== undefined) data.email       = body.email.trim()       || null
    if (body.phone       !== undefined) data.phone       = body.phone.trim()       || null
    if (body.address     !== undefined) data.address     = body.address.trim()     || null
    if (body.notes       !== undefined) data.notes       = body.notes.trim()       || null
    if (body.isActive    !== undefined) data.isActive    = body.isActive

    if (data.name === '') return Response.json({ error: 'Name is required' }, { status: 400 })

    const supplier = await prisma.supplier.update({ where: { id }, data })
    return Response.json(supplier)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const url   = new URL(req.url)
  const force = url.searchParams.get('force') === '1'  // hard delete + unlink products

  try {
    const productCount = await prisma.product.count({ where: { supplierId: id } })

    if (productCount > 0 && !force) {
      // Refuse hard delete — caller should retry with ?force=1 or soft-delete instead
      return Response.json(
        { error: 'Supplier has linked products', productCount, code: 'HAS_PRODUCTS' },
        { status: 409 },
      )
    }

    if (productCount > 0 && force) {
      // Unlink products, then delete
      await prisma.product.updateMany({ where: { supplierId: id }, data: { supplierId: null } })
    }

    await prisma.supplier.delete({ where: { id } })
    return Response.json({ success: true, unlinked: force ? productCount : 0 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
