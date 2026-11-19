import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const RANGES: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }

// What shoppers searched for: the most frequent terms, and the ones that found nothing.
export async function GET(req: NextRequest) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error

  const range = req.nextUrl.searchParams.get('range') ?? '30d'
  const since = new Date(Date.now() - (RANGES[range] ?? 30) * 86_400_000)

  const rows = await prisma.$queryRaw<{ query: string; searches: bigint; results: number; last: Date }[]>`
    SELECT query, count(*) AS searches, (array_agg(results ORDER BY created_at DESC))[1] AS results, max(created_at) AS last
    FROM search_logs
    WHERE created_at >= ${since}
    GROUP BY query
    ORDER BY count(*) DESC, max(created_at) DESC
    LIMIT 300
  `
  const terms = rows.map(r => ({ query: r.query, searches: Number(r.searches), results: r.results, last: r.last }))
  return Response.json({
    range,
    total: terms.reduce((n, t) => n + t.searches, 0),
    top: terms.slice(0, 50),
    noResults: terms.filter(t => t.results === 0).slice(0, 50),
  })
}
