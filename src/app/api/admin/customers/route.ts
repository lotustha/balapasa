import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET() {
  const auth = await requireRole('STAFF')
  if ('error' in auth) return auth.error
  try {
    const profiles = await prisma.profile.findMany({
      where:   { role: 'CUSTOMER' },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    // Get order stats per userId
    const orderStats = await prisma.$queryRaw<{ user_id: string; cnt: bigint; total: number }[]>`
      SELECT user_id, COUNT(*) as cnt, COALESCE(SUM(total), 0) as total
      FROM orders
      WHERE user_id IS NOT NULL
      GROUP BY user_id
    `
    const statsMap = new Map(orderStats.map(s => [s.user_id, { count: Number(s.cnt), total: Number(s.total) }]))

    const customers = profiles.map(p => ({
      id:         p.id,
      name:       p.name,
      email:      p.email,
      phone:      p.phone,
      role:       p.role,
      createdAt:  p.createdAt.toISOString(),
      orderCount: statsMap.get(p.id)?.count ?? 0,
      totalSpent: statsMap.get(p.id)?.total ?? 0,
    }))

    return Response.json({ customers })
  } catch {
    return Response.json({ customers: [] })
  }
}
