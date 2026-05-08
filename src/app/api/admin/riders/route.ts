import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const riders = await prisma.profile.findMany({
      where: { role: { in: ['STAFF', 'MANAGER', 'ADMIN'] } },
      select: { id: true, name: true, phone: true, email: true, role: true },
      orderBy: { name: 'asc' },
    })
    return Response.json({ riders })
  } catch {
    return Response.json({ riders: [] })
  }
}
