'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ShoppingBag, Package, Users, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Clock, AlertTriangle,
  CheckCircle2, Loader2, Zap, BarChart2,
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

interface DashboardData {
  stats: {
    revenue:   { today: number; month: number; change: number | null }
    orders:    { total: number; month: number; pending: number; confirmed: number; processing: number; shipped: number }
    products:  { total: number; lowStock: number; outOfStock: number }
    customers: { total: number }
  }
  dailyRevenue: { day: string; revenue: number }[]
  recentOrders: { id: string; customer: string; product: string; amount: number; status: string; payment: string; paid: boolean; createdAt: string }[]
  topProducts:  { id: string; name: string; image: string | null; sales: number; revenue: number }[]
  lowStockProducts: { id: string; name: string; stock: number; threshold: number; image: string | null; category: string }[]
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60)   return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
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
  const [data,    setData]    = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-8 flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-primary" />
    </div>
  )
  if (error || !data) return (
    <div className="p-8"><div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-700 text-sm">{error || 'No data'}</div></div>
  )

  const { stats, dailyRevenue, recentOrders, topProducts, lowStockProducts } = data

  const needsAttention = stats.orders.pending + stats.products.outOfStock + stats.products.lowStock

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
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-xl border border-gray-200">
          <Clock size={15} /> {new Date().toLocaleDateString('en-NP', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
      </div>

      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Today's Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-bg text-primary flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            {stats.revenue.change !== null && (
              <span className={`flex items-center gap-0.5 text-xs font-bold ${stats.revenue.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {stats.revenue.change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {Math.abs(stats.revenue.change)}% vs last month
              </span>
            )}
          </div>
          <p className="font-extrabold text-2xl text-gray-900">{formatPrice(stats.revenue.today)}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">Today&apos;s Revenue</p>
          <p className="text-[11px] text-gray-400 mt-1">{formatPrice(stats.revenue.month)} this month</p>
        </div>

        {/* Pending Orders — actionable */}
        <Link href="/admin/orders?status=PENDING" className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer block">
          <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stats.orders.pending > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
              <ShoppingBag size={18} />
            </div>
            {stats.orders.pending > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                Action needed
              </span>
            )}
          </div>
          <p className="font-extrabold text-2xl text-gray-900">{stats.orders.pending}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">Pending Orders</p>
          <p className="text-[11px] text-gray-400 mt-1">
            {stats.orders.confirmed} confirmed · {stats.orders.processing} processing · {stats.orders.shipped} shipped
          </p>
        </Link>

        {/* Products + Stock alert */}
        <Link href="/admin/products" className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-slate-300 hover:bg-slate-50/30 transition-all cursor-pointer block">
          <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stats.products.outOfStock > 0 ? 'bg-red-50 text-red-500' : stats.products.lowStock > 0 ? 'bg-amber-50 text-amber-600' : 'bg-orange-50 text-orange-600'}`}>
              <Package size={18} />
            </div>
            {(stats.products.outOfStock > 0 || stats.products.lowStock > 0) && (
              <AlertTriangle size={15} className="text-amber-500 mt-0.5" />
            )}
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

        {/* Customers */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <p className="font-extrabold text-2xl text-gray-900">{stats.customers.total.toLocaleString()}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">Customers</p>
          <p className="text-[11px] text-gray-400 mt-1">Total registered accounts</p>
        </div>
      </div>

      {/* ── Row 2: Revenue Chart + Order Status + Low Stock ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* 7-day Revenue Sparkline */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">7-Day Revenue</h3>
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
            <h3 className="font-bold text-slate-800 text-sm">Order Status</h3>
            <Link href="/admin/orders" className="text-xs font-bold text-primary hover:text-primary-dark cursor-pointer">View all →</Link>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Pending',    count: stats.orders.pending,    color: 'bg-yellow-400', textColor: 'text-yellow-700' },
              { label: 'Confirmed',  count: stats.orders.confirmed,  color: 'bg-blue-400',   textColor: 'text-blue-700'   },
              { label: 'Processing', count: stats.orders.processing, color: 'bg-purple-400', textColor: 'text-purple-700' },
              { label: 'Shipped',    count: stats.orders.shipped,    color: 'bg-indigo-400', textColor: 'text-indigo-700' },
            ].map(({ label, count, color, textColor }) => {
              const total = stats.orders.total || 1
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
          <p className="text-[11px] text-slate-400 mt-3">{stats.orders.total} orders total</p>
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
            <h2 className="font-heading font-bold text-slate-800">Top Products</h2>
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

      {/* Version footer */}
      <p className="mt-8 text-center text-[11px] text-slate-300 font-mono select-none">
{process.env.NEXT_PUBLIC_STORE_NAME ?? 'Balapasa'} v1.0.7
      </p>
    </div>
  )
}
