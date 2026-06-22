'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ShoppingBag, Package, Users, TrendingUp,
  ArrowUpRight, ArrowDownRight,
  CheckCircle2, Loader2, Zap, BarChart2,
  Eye, MousePointerClick, Globe, Activity,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  PENDING:    'bg-yellow-100 text-yellow-700',
  CONFIRMED:  'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  SHIPPED:    'bg-indigo-100 text-indigo-700',
  DELIVERED:  'bg-green-100 text-green-700',
  CANCELLED:  'bg-red-100 text-red-700',
}

type Range = 'today' | 'yesterday' | '7d' | '30d'
const RANGE_OPTIONS: { id: Range; label: string }[] = [
  { id: 'today',     label: 'Today'     },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d',        label: '7 Days'    },
  { id: '30d',       label: '1 Month'   },
]

interface RangeStat { value: number; previous: number; change: number | null }

interface DashboardData {
  range:      string
  rangeLabel: string
  stats: {
    revenue:   RangeStat
    orders:    RangeStat
    customers: RangeStat & { total: number }
    avgOrder:  { value: number }
    pipeline:  { pending: number; confirmed: number; processing: number; shipped: number; total: number }
    products:  { total: number; lowStock: number; outOfStock: number }
  }
  dailyRevenue: { day: string; revenue: number }[]
  recentOrders: { id: string; customer: string; product: string; amount: number; status: string; payment: string; paid: boolean; createdAt: string }[]
  topProducts:  { id: string; name: string; image: string | null; sales: number; revenue: number }[]
  lowStockProducts: { id: string; name: string; stock: number; threshold: number; image: string | null; category: string }[]
}

interface Analytics {
  available: boolean
  pageViews: { today: number; week: number; month: number }
  visitors:  { today: number; week: number; month: number }
  series:    { day: string; views: number; visitors: number }[]
  topPages:  { path: string; views: number }[]
  topProducts: { id: string; name: string; slug: string; image: string | null; views: number }[]
  sources:   { host: string; views: number }[]
}

// Change badge vs the previous equal-length window. Null change (no prior data)
// renders nothing.
function ChangeBadge({ change }: { change: number | null }) {
  if (change === null) return null
  const up = change >= 0
  return (
    <span className={`flex items-center gap-0.5 text-xs font-bold ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {Math.abs(change)}%
    </span>
  )
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60)   return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

// 14-day traffic chart — page-view bars with a hover tooltip showing both
// page views and unique visitors. Same hand-rolled approach as Sparkline.
function TrafficChart({ data }: { data: { day: string; views: number; visitors: number }[] }) {
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-300">
      <Activity size={28} className="mb-2" />
      <p className="text-xs font-medium text-slate-400">No traffic yet</p>
      <p className="text-[10px] text-slate-300 mt-0.5">Page views appear here as visitors browse your store</p>
    </div>
  )
  const max = Math.max(...data.map(d => d.views), 1)
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group relative h-full">
          <div
            className="w-full bg-primary/20 group-hover:bg-primary/50 rounded-t transition-colors"
            style={{ height: `${Math.max((d.views / max) * 100, 3)}%` }}
          />
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
            <div className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap text-center">
              {d.day}<br />{d.views} views · {d.visitors} visitors
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Simple inline bar sparkline (no external lib)
function Sparkline({ data }: { data: { day: string; revenue: number }[] }) {
  if (!data.length) return <p className="text-xs text-slate-400 text-center py-4">No revenue data yet</p>
  const max = Math.max(...data.map(d => d.revenue), 1)
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className="w-full bg-primary/20 group-hover:bg-primary/40 rounded-t transition-colors"
            style={{ height: `${Math.max((d.revenue / max) * 100, 4)}%` }}
          />
          {/* Tooltip */}
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
            <div className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap">
              {d.day}<br />{formatPrice(d.revenue)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const [data,        setData]        = useState<DashboardData | null>(null)
  const [analytics,   setAnalytics]   = useState<Analytics | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [error,       setError]       = useState('')
  const [range,       setRange]       = useState<Range>('today')

  // Dashboard stats — refetch whenever the range changes. The full-page spinner
  // only shows on the first load; later range switches dim the cards instead.
  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/dashboard?range=${range}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (d.error) setError(d.error); else { setData(d); setError('') }
      })
      .catch(() => { if (!cancelled) setError('Failed to load dashboard') })
      .finally(() => { if (!cancelled) { setLoading(false); setStatsLoading(false) } })
    return () => { cancelled = true }
  }, [range])

  // Analytics — range-independent, loaded once.
  useEffect(() => {
    fetch('/api/admin/analytics').then(r => r.json()).then(a => setAnalytics(a as Analytics)).catch(() => {})
  }, [])

  function selectRange(r: Range) {
    if (r === range) return
    setStatsLoading(true)
    setRange(r)
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-primary" />
    </div>
  )
  if (error || !data) return (
    <div className="p-8"><div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-700 text-sm">{error || 'No data'}</div></div>
  )

  const { stats, dailyRevenue, recentOrders, topProducts, lowStockProducts } = data

  const needsAttention = stats.pipeline.pending + stats.products.outOfStock + stats.products.lowStock

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-extrabold text-3xl text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            {needsAttention > 0
              ? <span className="text-amber-600 font-semibold">⚠ {needsAttention} item{needsAttention > 1 ? 's' : ''} need attention</span>
              : 'All systems running smoothly'}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200">
          {RANGE_OPTIONS.map(opt => (
            <button key={opt.id} type="button" onClick={() => selectRange(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${range === opt.id ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Row 1: KPI Cards — performance, scoped to the selected range ── */}
      <div className="flex items-center gap-2 -mb-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Performance · {data.rangeLabel}</p>
        <span className="text-[10px] text-slate-400">vs previous period</span>
      </div>
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-200 ${statsLoading ? 'opacity-50' : 'opacity-100'}`}>

        {/* Revenue (range) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-bg text-primary flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <ChangeBadge change={stats.revenue.change} />
          </div>
          <p className="font-extrabold text-2xl text-gray-900">{formatPrice(stats.revenue.value)}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">Revenue</p>
          <p className="text-[11px] text-gray-400 mt-1">{formatPrice(stats.revenue.previous)} prev. period</p>
        </div>

        {/* Orders placed (range) */}
        <Link href="/admin/orders" className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-slate-300 hover:bg-slate-50/30 transition-all cursor-pointer block">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag size={18} />
            </div>
            <ChangeBadge change={stats.orders.change} />
          </div>
          <p className="font-extrabold text-2xl text-gray-900">{stats.orders.value.toLocaleString()}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">Orders</p>
          <p className="text-[11px] text-gray-400 mt-1">{formatPrice(stats.avgOrder.value)} avg. order value</p>
        </Link>

        {/* New customers (range) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users size={18} />
            </div>
            <ChangeBadge change={stats.customers.change} />
          </div>
          <p className="font-extrabold text-2xl text-gray-900">{stats.customers.value.toLocaleString()}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">New Customers</p>
          <p className="text-[11px] text-gray-400 mt-1">{stats.customers.total.toLocaleString()} total registered</p>
        </div>

        {/* Products + Stock alert — live (not range-scoped) */}
        <Link href="/admin/products" className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-slate-300 hover:bg-slate-50/30 transition-all cursor-pointer block">
          <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stats.products.outOfStock > 0 ? 'bg-red-50 text-red-500' : stats.products.lowStock > 0 ? 'bg-amber-50 text-amber-600' : 'bg-orange-50 text-orange-600'}`}>
              <Package size={18} />
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">Live</span>
          </div>
          <p className="font-extrabold text-2xl text-gray-900">{stats.products.total}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">Products</p>
          <p className="text-[11px] mt-1">
            {stats.products.outOfStock > 0
              ? <span className="text-red-600 font-semibold">{stats.products.outOfStock} out of stock</span>
              : stats.products.lowStock > 0
              ? <span className="text-amber-600 font-semibold">{stats.products.lowStock} low stock</span>
              : <span className="text-green-600">All stocked</span>}
          </p>
        </Link>
      </div>

      {/* ── Row 2: Revenue Chart + Order Status + Low Stock ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue Sparkline — matches the selected range */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Revenue · {data.rangeLabel}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Paid orders only</p>
            </div>
            <BarChart2 size={16} className="text-slate-300" />
          </div>
          <Sparkline data={dailyRevenue} />
          {dailyRevenue.length > 0 && (
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-slate-400">{dailyRevenue[0]?.day}</span>
              <span className="text-[10px] text-slate-400">{dailyRevenue[dailyRevenue.length - 1]?.day}</span>
            </div>
          )}
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              Order Status
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">Live</span>
            </h3>
            <Link href="/admin/orders?status=PENDING" className="text-xs font-bold text-primary hover:text-primary-dark cursor-pointer">View all →</Link>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Pending',    count: stats.pipeline.pending,    color: 'bg-yellow-400', textColor: 'text-yellow-700' },
              { label: 'Confirmed',  count: stats.pipeline.confirmed,  color: 'bg-blue-400',   textColor: 'text-blue-700'   },
              { label: 'Processing', count: stats.pipeline.processing, color: 'bg-purple-400', textColor: 'text-purple-700' },
              { label: 'Shipped',    count: stats.pipeline.shipped,    color: 'bg-indigo-400', textColor: 'text-indigo-700' },
            ].map(({ label, count, color, textColor }) => {
              const total = stats.pipeline.total || 1
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-600">{label}</span>
                    <span className={`text-xs font-bold ${textColor}`}>{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">{stats.pipeline.total} orders in pipeline</p>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Zap size={14} className="text-amber-500" /> Low Stock Alert
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{stats.products.outOfStock} out · {stats.products.lowStock} low</p>
            </div>
            <Link href="/admin/products" className="text-xs font-bold text-primary hover:text-primary-dark cursor-pointer">Fix →</Link>
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-slate-300">
              <CheckCircle2 size={28} className="text-green-400 mb-2" />
              <p className="text-xs font-semibold text-green-600">All products stocked!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {lowStockProducts.map(p => (
                <div key={p.id} className={`flex items-center gap-3 p-2 rounded-xl ${p.stock === 0 ? 'bg-red-50' : 'bg-amber-50/60'}`}>
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    {p.image
                      ? <Image src={p.image} alt={p.name} fill sizes="32px" className="object-cover" />
                      : <Package size={12} className="absolute inset-0 m-auto text-slate-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                    <p className={`text-[10px] font-bold ${p.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {p.stock === 0 ? 'Out of stock' : `${p.stock} left (alert at ${p.threshold})`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Recent Orders + Top Products ── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="font-heading font-bold text-slate-800">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs font-bold text-primary hover:text-primary-dark cursor-pointer">View all →</Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-300">
              <ShoppingBag size={36} className="mb-3" />
              <p className="text-sm font-medium text-slate-400">No orders yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-50">
                  <th className="text-left px-6 py-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Item</th>
                  <th className="text-left px-4 py-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider hidden md:table-cell">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentOrders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-semibold text-slate-800 text-sm">{o.customer}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{o.id.slice(0, 8).toUpperCase()}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <p className="text-sm text-slate-600 truncate max-w-[130px]">{o.product}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900 text-sm">{formatPrice(o.amount)}</p>
                      {o.paid && <span className="flex items-center gap-0.5 text-[10px] text-green-600 font-bold"><CheckCircle2 size={10} /> Paid</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${STATUS_COLORS[o.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right hidden md:table-cell">
                      <span className="text-[11px] text-slate-400">{timeAgo(o.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="font-heading font-bold text-slate-800">Top Products <span className="text-[11px] font-normal text-slate-400">· {data.rangeLabel}</span></h2>
            <Link href="/admin/products" className="text-xs font-bold text-primary hover:text-primary-dark cursor-pointer">All →</Link>
          </div>
          {topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-300">
              <Package size={36} className="mb-3" />
              <p className="text-sm font-medium text-slate-400">No sales yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/40 transition-colors">
                  <span className="text-xs font-extrabold text-slate-300 w-4 shrink-0">{i + 1}</span>
                  <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    {p.image
                      ? <Image src={p.image} alt={p.name} fill sizes="36px" className="object-cover" />
                      : <Package size={14} className="absolute inset-0 m-auto text-slate-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-xs truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{p.sales} sold · {formatPrice(p.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Traffic & Analytics ── */}
      {analytics && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading font-extrabold text-xl text-gray-900 flex items-center gap-2">
                <Activity size={18} className="text-primary" /> Traffic &amp; Analytics
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">
                {analytics.available && analytics.pageViews.month > 0
                  ? 'First-party visitor data — last 7 days unless noted'
                  : 'No visits recorded yet — data appears here as customers browse your store'}
              </p>
            </div>
          </div>

          {/* Analytics KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-primary-bg text-primary flex items-center justify-center mb-4">
                <Users size={18} />
              </div>
              <p className="font-extrabold text-2xl text-gray-900">{analytics.visitors.week.toLocaleString()}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">Visitors (7d)</p>
              <p className="text-[11px] text-gray-400 mt-1">{analytics.visitors.today.toLocaleString()} today</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Eye size={18} />
              </div>
              <p className="font-extrabold text-2xl text-gray-900">{analytics.pageViews.week.toLocaleString()}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">Page Views (7d)</p>
              <p className="text-[11px] text-gray-400 mt-1">{analytics.pageViews.month.toLocaleString()} in 30 days</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <MousePointerClick size={18} />
              </div>
              <p className="font-extrabold text-2xl text-gray-900">
                {analytics.visitors.week > 0 ? (analytics.pageViews.week / analytics.visitors.week).toFixed(1) : '—'}
              </p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">Pages / Visitor</p>
              <p className="text-[11px] text-gray-400 mt-1">Engagement depth (7d)</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <Globe size={18} />
              </div>
              <p className="font-extrabold text-2xl text-gray-900 truncate" title={analytics.sources[0]?.host ?? '—'}>
                {analytics.sources[0]?.host ?? '—'}
              </p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">Top Source</p>
              <p className="text-[11px] text-gray-400 mt-1">
                {analytics.sources[0] ? `${analytics.sources[0].views.toLocaleString()} views (30d)` : 'No referrers yet'}
              </p>
            </div>
          </div>

          {/* Traffic chart + Top sources */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Traffic — Last 14 Days</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Page views per day · hover for visitors</p>
                </div>
                <BarChart2 size={16} className="text-slate-300" />
              </div>
              <TrafficChart data={analytics.series} />
              {analytics.series.length > 0 && (
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-slate-400">{analytics.series[0]?.day}</span>
                  <span className="text-[10px] text-slate-400">{analytics.series[analytics.series.length - 1]?.day}</span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-4">Top Sources</h3>
              {analytics.sources.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-slate-300">
                  <Globe size={26} className="mb-2" />
                  <p className="text-xs font-medium text-slate-400">No referrers yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.sources.map(s => {
                    const max = analytics.sources[0].views || 1
                    return (
                      <div key={s.host}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-600 truncate max-w-[150px]" title={s.host}>{s.host}</span>
                          <span className="text-xs font-bold text-slate-500">{s.views.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(s.views / max) * 100}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Top pages + Most-viewed products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50">
                <h2 className="font-heading font-bold text-slate-800 text-sm">Top Pages <span className="text-[11px] font-normal text-slate-400">(30d)</span></h2>
              </div>
              {analytics.topPages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                  <Eye size={30} className="mb-2" />
                  <p className="text-sm font-medium text-slate-400">No page views yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {analytics.topPages.map((p, i) => {
                    const max = analytics.topPages[0].views || 1
                    return (
                      <div key={p.path} className="flex items-center gap-3 px-5 py-3">
                        <span className="text-xs font-extrabold text-slate-300 w-4 shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono text-slate-700 truncate" title={p.path}>{p.path}</p>
                          <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                            <div className="h-full bg-primary/40 rounded-full" style={{ width: `${(p.views / max) * 100}%` }} />
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-500 shrink-0">{p.views.toLocaleString()}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                <h2 className="font-heading font-bold text-slate-800 text-sm">Most-Viewed Products</h2>
                <Link href="/admin/products" className="text-xs font-bold text-primary hover:text-primary-dark cursor-pointer">All →</Link>
              </div>
              {analytics.topProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                  <Package size={30} className="mb-2" />
                  <p className="text-sm font-medium text-slate-400">No product views yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {analytics.topProducts.map((p, i) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.slug}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/40 transition-colors"
                    >
                      <span className="text-xs font-extrabold text-slate-300 w-4 shrink-0">{i + 1}</span>
                      <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        {p.image
                          ? <Image src={p.image} alt={p.name} fill sizes="36px" className="object-cover" />
                          : <Package size={14} className="absolute inset-0 m-auto text-slate-300" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-xs truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1"><Eye size={10} /> {p.views.toLocaleString()} views</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Version footer */}
      <p className="mt-8 text-center text-[11px] text-slate-300 font-mono select-none">
{process.env.NEXT_PUBLIC_STORE_NAME ?? 'Balapasa'} v1.0.7
      </p>
    </div>
  )
}
