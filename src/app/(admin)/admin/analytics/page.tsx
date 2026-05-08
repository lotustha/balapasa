import { BarChart3, TrendingUp, ShoppingBag, Users, Package, Tag } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

async function getAnalytics() {
  try {
    const now      = new Date()
    const day30ago = new Date(now.getTime() - 30 * 86400000)
    const day7ago  = new Date(now.getTime() -  7 * 86400000)

    const [
      totalOrders, monthOrders, weekOrders,
      totalRevenue, monthRevenue,
      customerCount, productCount,
      ordersByStatus,
      topProducts,
      topCategories,
      dailyRevenue,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: day30ago } } }),
      prisma.order.count({ where: { createdAt: { gte: day7ago } } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: 'PAID' } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: 'PAID', createdAt: { gte: day30ago } } }),
      prisma.profile.count({ where: { role: 'CUSTOMER' } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.groupBy({ by: ['status'], _count: true }),
      prisma.$queryRaw<{ id: string; name: string; images: string[]; qty: bigint; rev: number }[]>`
        SELECT p.id, p.name, p.images, SUM(oi.quantity) as qty, SUM(oi.quantity*oi.price) as rev
        FROM products p JOIN order_items oi ON oi.product_id = p.id
        GROUP BY p.id, p.name, p.images ORDER BY qty DESC LIMIT 5
      `,
      prisma.$queryRaw<{ name: string; qty: bigint; rev: number }[]>`
        SELECT c.name, SUM(oi.quantity) as qty, SUM(oi.quantity*oi.price) as rev
        FROM categories c JOIN products p ON p.category_id = c.id JOIN order_items oi ON oi.product_id = p.id
        GROUP BY c.name ORDER BY rev DESC LIMIT 5
      `,
      prisma.$queryRaw<{ day: string; rev: number }[]>`
        SELECT TO_CHAR(created_at AT TIME ZONE 'Asia/Kathmandu','Mon DD') as day,
               COALESCE(SUM(total),0) as rev
        FROM orders WHERE payment_status='PAID' AND created_at >= ${day30ago}
        GROUP BY TO_CHAR(created_at AT TIME ZONE 'Asia/Kathmandu','Mon DD'),
                 DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Kathmandu')
        ORDER BY DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Kathmandu')
        LIMIT 30
      `,
    ])

    return {
      totalOrders, monthOrders, weekOrders,
      totalRevenue: totalRevenue._sum.total ?? 0,
      monthRevenue: monthRevenue._sum.total ?? 0,
      avgOrder: totalOrders > 0 ? (totalRevenue._sum.total ?? 0) / totalOrders : 0,
      customerCount, productCount,
      ordersByStatus,
      topProducts: topProducts.map(p => ({ ...p, qty: Number(p.qty), rev: Number(p.rev) })),
      topCategories: topCategories.map(c => ({ ...c, qty: Number(c.qty), rev: Number(c.rev) })),
      dailyRevenue: dailyRevenue.map(r => ({ day: r.day, rev: Number(r.rev) })),
    }
  } catch {
    return null
  }
}

export default async function AnalyticsPage() {
  const data = await getAnalytics()
  if (!data) return <div className="p-8 text-slate-400">Failed to load analytics</div>

  const maxRev = Math.max(...data.dailyRevenue.map(r => r.rev), 1)
  const statusTotal = data.ordersByStatus.reduce((s, r) => s + r._count, 0) || 1

  const STATUS_COLORS: Record<string, string> = {
    PENDING:'bg-yellow-400', CONFIRMED:'bg-blue-400', PROCESSING:'bg-purple-400',
    SHIPPED:'bg-indigo-400', DELIVERED:'bg-green-400', CANCELLED:'bg-red-400',
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">Analytics</h1>
          <p className="text-slate-500 text-sm mt-0.5">Store performance overview</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue',   value: formatPrice(data.totalRevenue), sub: `${formatPrice(data.monthRevenue)} this month`, icon: TrendingUp,  color: 'bg-primary-bg text-primary' },
          { label: 'Total Orders',    value: String(data.totalOrders),       sub: `${data.weekOrders} this week`,                 icon: ShoppingBag, color: 'bg-blue-50 text-blue-600'   },
          { label: 'Avg Order Value', value: formatPrice(data.avgOrder),     sub: `${data.monthOrders} orders this month`,        icon: BarChart3,   color: 'bg-amber-50 text-amber-600' },
          { label: 'Customers',       value: String(data.customerCount),     sub: `${data.productCount} active products`,          icon: Users,       color: 'bg-purple-50 text-purple-600'},
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-slate-100">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}><Icon size={18} /></div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="font-heading font-extrabold text-2xl text-slate-900 mt-1">{value}</p>
            <p className="text-[11px] text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="font-heading font-bold text-slate-800 mb-5 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" /> Revenue — Last 30 Days
          </h2>
          {data.dailyRevenue.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-300 text-sm">No paid orders yet</div>
          ) : (
            <>
              <div className="flex items-end gap-1 h-40 group">
                {data.dailyRevenue.map((r, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                    <div className="w-full rounded-t-md transition-all"
                      style={{ height:`${Math.max((r.rev/maxRev)*140,4)}px`, background:'linear-gradient(180deg,#16A34A,#06B6D4)', opacity:0.7 }} />
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block pointer-events-none z-10">
                      <div className="bg-slate-800 text-white text-[9px] font-bold px-1.5 py-1 rounded-lg whitespace-nowrap">
                        {r.day}<br/>{formatPrice(r.rev)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>{data.dailyRevenue[0]?.day}</span>
                <span>{data.dailyRevenue[data.dailyRevenue.length-1]?.day}</span>
              </div>
            </>
          )}
        </div>

        {/* Order status breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="font-heading font-bold text-slate-800 mb-5 flex items-center gap-2">
            <ShoppingBag size={16} className="text-primary" /> Order Status Breakdown
          </h2>
          <div className="space-y-3">
            {data.ordersByStatus.sort((a,b) => b._count - a._count).map(s => (
              <div key={s.status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold text-slate-700">{s.status}</span>
                  <span className="font-bold text-slate-900">{s._count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${STATUS_COLORS[s.status] ?? 'bg-slate-400'}`}
                    style={{ width:`${(s._count/statusTotal)*100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-4">{data.totalOrders} total orders</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="font-heading font-bold text-slate-800 mb-5 flex items-center gap-2">
            <Package size={16} className="text-primary" /> Top Products by Sales
          </h2>
          {data.topProducts.length === 0 ? (
            <p className="text-slate-300 text-sm text-center py-8">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {data.topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-xs font-extrabold text-slate-300 w-4">{i+1}</span>
                  {p.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt="" className="w-9 h-9 rounded-lg object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.qty} sold</p>
                  </div>
                  <p className="font-bold text-slate-900 text-sm shrink-0">{formatPrice(p.rev)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top categories */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="font-heading font-bold text-slate-800 mb-5 flex items-center gap-2">
            <Tag size={16} className="text-primary" /> Revenue by Category
          </h2>
          {data.topCategories.length === 0 ? (
            <p className="text-slate-300 text-sm text-center py-8">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {data.topCategories.map((c, i) => {
                const maxCatRev = data.topCategories[0]?.rev ?? 1
                return (
                  <div key={c.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-slate-700">{i+1}. {c.name}</span>
                      <span className="font-bold text-slate-900">{formatPrice(c.rev)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width:`${(c.rev/maxCatRev)*100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
