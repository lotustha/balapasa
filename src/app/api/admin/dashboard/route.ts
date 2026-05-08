import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now        = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const day7ago    = new Date(now.getTime() -  7 * 86400000)
    const day30ago   = new Date(now.getTime() - 30 * 86400000)
    const day60ago   = new Date(now.getTime() - 60 * 86400000)

    const [
      todayRevenue, monthRevenue, prevMonthRevenue,
      totalOrders, monthOrders,
      pendingOrders, confirmedOrders, processingOrders, shippedOrders,
      productCount, outOfStockCount,
      customerCount,
      recentOrders, topProducts,
      lowStockProducts,
      dailyRevenue,
    ] = await Promise.all([
      // Today's revenue
      prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: todayStart } }, _sum: { total: true } }),

      // 30-day revenue
      prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: day30ago } }, _sum: { total: true } }),

      // Previous 30-day revenue
      prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: day60ago, lt: day30ago } }, _sum: { total: true } }),

      // Total orders
      prisma.order.count(),

      // Orders this month
      prisma.order.count({ where: { createdAt: { gte: day30ago } } }),

      // Orders by status
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'CONFIRMED' } }),
      prisma.order.count({ where: { status: 'PROCESSING' } }),
      prisma.order.count({ where: { status: 'SHIPPED' } }),

      // Products
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true, trackInventory: true, stock: 0 } }),

      // Customers
      prisma.profile.count({ where: { role: 'CUSTOMER' } }),

      // Recent orders
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' }, take: 8,
        select: {
          id: true, name: true, total: true, status: true,
          paymentMethod: true, paymentStatus: true, createdAt: true,
          items: { select: { name: true }, take: 1 },
        },
      }),

      // Top products by sales
      prisma.$queryRaw<{ id: string; name: string; images: string[]; total_qty: bigint; total_rev: number }[]>`
        SELECT p.id, p.name, p.images,
               SUM(oi.quantity) AS total_qty,
               SUM(oi.quantity * oi.price) AS total_rev
        FROM products p JOIN order_items oi ON oi.product_id = p.id
        GROUP BY p.id, p.name, p.images
        ORDER BY total_qty DESC LIMIT 5
      `,

      // Low & out of stock products
      prisma.product.findMany({
        where: { isActive: true, trackInventory: true, stock: { lte: 10 } },
        orderBy: { stock: 'asc' },
        take: 5,
        select: { id: true, name: true, stock: true, lowStockThreshold: true, images: true, category: { select: { name: true } } },
      }),

      // Daily revenue last 7 days
      prisma.$queryRaw<{ day: string; revenue: number }[]>`
        SELECT TO_CHAR(created_at AT TIME ZONE 'Asia/Kathmandu', 'Mon DD') AS day,
               COALESCE(SUM(total), 0) AS revenue
        FROM orders
        WHERE payment_status = 'PAID' AND created_at >= ${day7ago}
        GROUP BY TO_CHAR(created_at AT TIME ZONE 'Asia/Kathmandu', 'Mon DD'),
                 DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Kathmandu')
        ORDER BY DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Kathmandu')
      `,
    ])

    const lowStockCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM products
      WHERE is_active = true AND track_inventory = true AND stock > 0 AND stock <= low_stock_threshold
    `.then(r => Number(r[0].count)).catch(() => 0)

    const rev30    = monthRevenue._sum.total ?? 0
    const revPrev  = prevMonthRevenue._sum.total ?? 0
    const revChange = revPrev > 0 ? Math.round(((rev30 - revPrev) / revPrev) * 100) : null

    return Response.json({
      stats: {
        revenue:   { today: todayRevenue._sum.total ?? 0, month: rev30, change: revChange },
        orders:    { total: totalOrders, month: monthOrders, pending: pendingOrders, confirmed: confirmedOrders, processing: processingOrders, shipped: shippedOrders },
        products:  { total: productCount, lowStock: lowStockCount, outOfStock: outOfStockCount },
        customers: { total: customerCount },
      },
      dailyRevenue: dailyRevenue.map(r => ({ day: r.day, revenue: Number(r.revenue) })),
      recentOrders: recentOrders.map(o => ({
        id: o.id, customer: o.name, product: o.items[0]?.name ?? '—',
        amount: o.total, status: o.status, payment: o.paymentMethod,
        paid: o.paymentStatus === 'PAID', createdAt: o.createdAt.toISOString(),
      })),
      topProducts: topProducts.map(p => ({
        id: p.id, name: p.name, image: (p.images as string[])[0] ?? null,
        sales: Number(p.total_qty), revenue: Number(p.total_rev),
      })),
      lowStockProducts: lowStockProducts.map(p => ({
        id: p.id, name: p.name, stock: p.stock,
        threshold: p.lowStockThreshold, image: p.images[0] ?? null,
        category: p.category.name,
      })),
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
