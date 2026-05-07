import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const logs = await prisma.inventoryLog.findMany({
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return Response.json({ logs })
  } catch {
    return Response.json({ logs: [] })
  }
}
