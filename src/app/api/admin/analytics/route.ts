import { prisma } from '@/lib/prisma'

// First-party traffic analytics for the admin dashboard. Reads the page_views
// table (populated by /api/pageview) plus Product.viewCount. All day-bucketing
// is Asia/Kathmandu, matching the revenue queries in /api/admin/dashboard.
//
// If the page_views table doesn't exist yet (pre-migration) or the DB is down,
// returns a well-formed empty payload (available:false) so the dashboard still
// renders its empty states.
export async function GET() {
  try {
    const now        = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const day7       = new Date(now.getTime() -  7 * 86400000)
    const day30      = new Date(now.getTime() - 30 * 86400000)
    const day14      = new Date(now.getTime() - 13 * 86400000)  // 14-day inclusive window

    const [
      pvToday, pv7, pv30,
      uvToday, uv7, uv30,
      series, topPages, topProducts, sources,
    ] = await Promise.all([
      prisma.pageView.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.pageView.count({ where: { createdAt: { gte: day7 } } }),
      prisma.pageView.count({ where: { createdAt: { gte: day30 } } }),

      prisma.$queryRaw<[{ c: bigint }]>`SELECT COUNT(DISTINCT visitor_id) AS c FROM page_views WHERE created_at >= ${todayStart}`,
      prisma.$queryRaw<[{ c: bigint }]>`SELECT COUNT(DISTINCT visitor_id) AS c FROM page_views WHERE created_at >= ${day7}`,
      prisma.$queryRaw<[{ c: bigint }]>`SELECT COUNT(DISTINCT visitor_id) AS c FROM page_views WHERE created_at >= ${day30}`,

      prisma.$queryRaw<{ day: string; views: bigint; visitors: bigint }[]>`
        SELECT TO_CHAR(created_at AT TIME ZONE 'Asia/Kathmandu', 'Mon DD') AS day,
               COUNT(*)                   AS views,
               COUNT(DISTINCT visitor_id) AS visitors
        FROM page_views
        WHERE created_at >= ${day14}
        GROUP BY TO_CHAR(created_at AT TIME ZONE 'Asia/Kathmandu', 'Mon DD'),
                 DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Kathmandu')
        ORDER BY DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Kathmandu')
      `,

      prisma.$queryRaw<{ path: string; views: bigint }[]>`
        SELECT path, COUNT(*) AS views FROM page_views
        WHERE created_at >= ${day30}
        GROUP BY path ORDER BY views DESC LIMIT 8
      `,

      prisma.product.findMany({
        where:   { isActive: true, viewCount: { gt: 0 } },
        orderBy: { viewCount: 'desc' },
        take:    8,
        select:  { id: true, name: true, slug: true, images: true, viewCount: true },
      }),

      prisma.$queryRaw<{ host: string; views: bigint }[]>`
        SELECT COALESCE(NULLIF(SUBSTRING(referrer FROM '^https?://([^/]+)'), ''), 'Direct') AS host,
               COUNT(*) AS views
        FROM page_views
        WHERE created_at >= ${day30}
        GROUP BY 1 ORDER BY views DESC LIMIT 6
      `,
    ])

    return Response.json({
      available: true,
      pageViews: { today: pvToday, week: pv7, month: pv30 },
      visitors:  { today: Number(uvToday[0].c), week: Number(uv7[0].c), month: Number(uv30[0].c) },
      series:    series.map(s => ({ day: s.day, views: Number(s.views), visitors: Number(s.visitors) })),
      topPages:  topPages.map(p => ({ path: p.path, views: Number(p.views) })),
      topProducts: topProducts.map(p => ({
        id: p.id, name: p.name, slug: p.slug, image: p.images[0] ?? null, views: p.viewCount,
      })),
      sources:   sources.map(s => ({ host: s.host, views: Number(s.views) })),
    })
  } catch {
    return Response.json({
      available: false,
      pageViews: { today: 0, week: 0, month: 0 },
      visitors:  { today: 0, week: 0, month: 0 },
      series: [], topPages: [], topProducts: [], sources: [],
    })
  }
}
