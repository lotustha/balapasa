import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const rows = await prisma.product.findMany({
      where: { brand: { not: null } },
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    })
    const brands = rows.map(r => r.brand!).filter(Boolean)
    return Response.json({ brands })
  } catch {
    return Response.json({ brands: [] })
  }
}
