import { BarChart3, TrendingUp, ShoppingBag, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

async function getStats() {
  try {
    const [orderCount, totalRevenue, customerCount, recentOrders] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: 'PAID' } }),
      prisma.profile.count({ where: { role: 'CUSTOMER' } }),
      prisma.order.findMany({ take: 7, orderBy: { createdAt: 'desc' }, select: { total: true, createdAt: true } }),
    ])
    return { orderCount, revenue: totalRevenue._sum.total ?? 0, customerCount, recentOrders }
  } catch {
    return { orderCount: 0, revenue: 0, customerCount: 0, recentOrders: [] }
  }
}

export default async function AnalyticsPage() {
  const stats = await getStats()

  const KPIS = [
    { label: 'Total Revenue',   value: formatPrice(stats.revenue),        icon: TrendingUp,  color: 'bg-primary-bg text-primary',      change: '+12.5%', up: true  },
    { label: 'Total Orders',    value: String(stats.orderCount),           icon: ShoppingBag, color: 'bg-blue-50 text-blue-600',        change: '+8.2%',  up: true  },
    { label: 'Customers',       value: String(stats.customerCount),        icon: Users,       color: 'bg-purple-50 text-purple-600',    change: '+15.3%', up: true  },
    { label: 'Avg. Order',      value: stats.orderCount > 0 ? formatPrice(stats.revenue / stats.orderCount) : '—', icon: BarChart3, color: 'bg-amber-50 text-amber-600', change: '+3.1%', up: true },
  ]

  const maxRevenue = Math.max(...stats.recentOrders.map(o => o.total), 1)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">Analytics</h1>
          <p className="text-slate-500 text-sm mt-0.5">Store performance overview</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200">
          <BarChart3 size={15} /> All time
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {KPIS.map(({ label, value, icon: Icon, color, change, up }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-slate-100">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
                <Icon size={18} />
              </div>
              <span className={`flex items-center gap-0.5 text-xs font-bold ${up ? 'text-green-600' : 'text-red-500'}`}>
                {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {change}
              </span>
            </div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="font-heading font-extrabold text-2xl text-slate-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6">
        <h2 className="font-heading font-bold text-slate-900 mb-5">Recent Orders Revenue</h2>
        {stats.recentOrders.length === 0 ? (
          <div className="h-40 flex items-center justify-center">
            <p className="text-slate-300 text-sm">No data yet — place some orders!</p>
          </div>
        ) : (
          <div className="flex items-end gap-3 h-40">
            {stats.recentOrders.map((o, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg transition-all duration-500"
                  style={{
                    height: `${Math.max((o.total / maxRevenue) * 130, 8)}px`,
                    background: `linear-gradient(180deg, #16A34A, #06B6D4)`,
                    opacity: 0.6 + (i / stats.recentOrders.length) * 0.4,
                  }}
                />
                <p className="text-[9px] text-slate-400 font-bold">
                  {new Date(o.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-3">
        <BarChart3 size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Full analytics coming soon.</strong> Advanced charts, revenue by category, customer retention, and conversion funnels will be available in the next update.
        </p>
      </div>
    </div>
  )
}
