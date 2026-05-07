import { ShoppingBag, Search, Eye, Clock } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

async function getOrders() {
  try {
    return await prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  } catch { return [] }
}

const STATUS_CLS: Record<string, string> = {
  PENDING:    'bg-yellow-100 text-yellow-700',
  CONFIRMED:  'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  SHIPPED:    'bg-indigo-100 text-indigo-700',
  DELIVERED:  'bg-green-100 text-green-700',
  CANCELLED:  'bg-red-100 text-red-700',
}

const PAY_CLS: Record<string, string> = {
  UNPAID:   'bg-slate-100 text-slate-500',
  PAID:     'bg-green-100 text-green-700',
  FAILED:   'bg-red-100 text-red-600',
  REFUNDED: 'bg-amber-100 text-amber-700',
}

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const TABS = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']

export default async function OrdersPage() {
  const orders = await getOrders()

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">Orders</h1>
          <p className="text-slate-500 text-sm mt-0.5">{orders.length} total orders</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 bg-white border border-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button key={tab}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${tab === 'All' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            {tab}
            {tab === 'All' && <span className="ml-1.5 bg-white/25 px-1.5 py-0.5 rounded-full text-[10px]">{orders.length}</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input placeholder="Search by order ID or name…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-50 bg-slate-50/60">
              <th className="text-left px-6 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Order</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Customer</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Items</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Payment</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <ShoppingBag size={36} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm font-medium">No orders yet</p>
                  <p className="text-slate-300 text-xs mt-1">Orders will appear here once customers start purchasing</p>
                </td>
              </tr>
            ) : (
              orders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-mono font-bold text-primary text-xs">#{order.id.slice(0, 8).toUpperCase()}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-800 text-sm">{order.name}</p>
                    <p className="text-xs text-slate-400">{order.city}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-slate-600">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-slate-400 truncate max-w-[160px]">
                      {order.items.map(i => i.name).join(', ')}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-900 text-sm">{formatPrice(order.total)}</p>
                    <p className="text-[10px] text-slate-400">{order.paymentMethod}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${STATUS_CLS[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${PAY_CLS[order.paymentStatus] ?? 'bg-slate-100 text-slate-600'}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock size={11} /> {timeAgo(order.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Link href={`/track-order?id=${order.id}`}
                      className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-bg rounded-lg transition-colors cursor-pointer inline-flex">
                      <Eye size={14} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
