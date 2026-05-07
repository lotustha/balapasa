import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
}

export async function GET() {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
    return Response.json({ categories })
  } catch {
    return Response.json({ categories: [] })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, name, color, icon, image } = await req.json() as {
      id: string; name?: string; color?: string; icon?: string; image?: string
    }
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })
    const data: Record<string, unknown> = {}
    if (name  !== undefined) data.name  = name
    if (color !== undefined) data.color = color
    if (icon  !== undefined) data.icon  = icon  || null
    if (image !== undefined) data.image = image || null
    const category = await prisma.category.update({ where: { id }, data })
    return Response.json(category)
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, color, icon, image } = await req.json() as { name: string; color?: string; icon?: string; image?: string }
    if (!name?.trim()) return Response.json({ error: 'Name is required' }, { status: 400 })

    const base = slugify(name)
    let slug = base
    let n = 1
    while (await prisma.category.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(), slug,
        color: color ?? '#16A34A',
        icon:  icon  || null,
        image: image || null,
      },
    })
    return Response.json(category, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
