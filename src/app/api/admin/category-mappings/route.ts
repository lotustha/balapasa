import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const mappings = await prisma.categoryMapping.findMany({
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: { source: 'asc' },
    })
    return Response.json({ mappings })
  } catch { return Response.json({ mappings: [] }) }
}

export async function POST(req: NextRequest) {
  try {
    const { source, externalName, externalId, categoryId } = await req.json()
    if (!source || !externalName || !categoryId) {
      return Response.json({ error: 'source, externalName, categoryId are required' }, { status: 400 })
    }
    const mapping = await prisma.categoryMapping.upsert({
      where: { source_externalName: { source, externalName } },
      update: { categoryId, externalId: externalId ?? null },
      create: { source, externalName, externalId: externalId ?? null, categoryId },
      include: { category: { select: { id: true, name: true } } },
    })
    return Response.json(mapping, { status: 201 })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await prisma.categoryMapping.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
