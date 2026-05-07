import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true }, orderBy: { name: 'asc' },
    })
    return Response.json({ suppliers })
  } catch {
    return Response.json({ suppliers: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, address } = await req.json() as {
      name: string; email?: string; phone?: string; address?: string
    }
    if (!name?.trim()) return Response.json({ error: 'Name is required' }, { status: 400 })

    const supplier = await prisma.supplier.create({
      data: {
        name:    name.trim(),
        email:   email?.trim()   || null,
        phone:   phone?.trim()   || null,
        address: address?.trim() || null,
      },
    })
    return Response.json(supplier, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
