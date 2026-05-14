'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Truck, Package, MapPin, Phone, CheckCircle2, Clock,
  ExternalLink, Loader2, RefreshCw, Search, ChevronRight,
  AlertTriangle, Copy, CheckCircle,
} from 'lucide-react'

interface ShipmentOrder {
  id: string
  status: string
  name: string
  phone: string
  address: string
  city: string
  shippingOption: string | null
  shippingProvider: string | null
  pathaoOrderId: string | null
  trackingUrl: string | null
  total: number
  createdAt: string
  updatedAt: string
  items: { name: string; quantity: number }[]
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING:    { label: 'Pending',    cls: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  CONFIRMED:  { label: 'Confirmed',  cls: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400'   },
  PROCESSING: { label: 'Processing', cls: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
  SHIPPED:    { label: 'Shipped',    cls: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400' },
  DELIVERED:  { label: 'Delivered',  cls: 'bg-green-100 text-green-700',   dot: 'bg-green-500'  },
  CANCELLED:  { label: 'Cancelled',  cls: 'bg-red-100 text-red-600',       dot: 'bg-red-400'    },
}

const PROVIDER_LABELS: Record<string, string> = {
  PATHAO:       'Pathao',
  PICKNDROP:    'Pick & Drop',
  STORE_PICKUP: 'Store Pickup',
}

export default function LogisticsPage() {
  const [orders,  setOrders]  = useState<ShipmentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<'active' | 'all'>('active')
  const [search,  setSearch]  = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [copied,  setCopied]  = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/orders?limit=200&sort=newest')
      const data = await res.json()
      setOrders(data.orders ?? [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function updateStatus(orderId: string, status: string) {
    setUpdatingId(orderId)
    await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    setUpdatingId(null)
  }

  function copyText(text: string, key: string) {
    navigator.clipboard?.writeText(text)
    setCopied(key); setTimeout(() => setCopied(null), 2000)
  }

  // Filter orders
  const activeStatuses = new Set(['CONFIRMED', 'PROCESSING', 'SHIPPED'])
  const filtered = orders.filter(o => {
    if (filter === 'active' && !activeStatuses.has(o.status)) return false
    if (search) {
      const q = search.toLowerCase()
      return o.name.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        (o.pathaoOrderId?.toLowerCase().includes(q) ?? false) ||
        o.phone.includes(q)
    }
    return true
  })

  const stats = {
    confirmed:  orders.filter(o => o.status === 'CONFIRMED').length,
    processing: orders.filter(o => o.status === 'PROCESSING').length,
    shipped:    orders.filter(o => o.status === 'SHIPPED').length,
    delivered:  orders.filter(o => o.status === 'DELIVERED').length,
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-6">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 flex items-center gap-2">
            <Truck size={20} className="text-primary" /> Logistics
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Active shipments and delivery status</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-sm font-semibold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Confirmed',  value: stats.confirmed,  color: 'text-blue-600',   bg: 'bg-blue-50',   icon: Clock       },
          { label: 'Processing', value: stats.processing, color: 'text-purple-600', bg: 'bg-purple-50', icon: Package     },
          { label: 'Shipped',    value: stats.shipped,    color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Truck       },
          { label: 'Delivered',  value: stats.delivered,  color: 'text-green-600',  bg: 'bg-green-50',  icon: CheckCircle2 },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className={`font-extrabold text-2xl leading-none ${color}`}>{value}</p>
              <p className="text-xs font-bold text-slate-400 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search order ID, name, phone…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
        </div>
        <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1">
          {[['active', 'Active Shipments'], ['all', 'All Orders']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v as 'active' | 'all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${filter === v ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Shipments table */}
      <div className="bg-white rounded-2xl border border-slate-100">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-300">
            <Truck size={36} className="mb-3" />
            <p className="text-sm font-medium text-slate-400">
              {filter === 'active' ? 'No active shipments right now' : 'No orders found'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(order => {
              const sc    = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING
              const items = order.items?.slice(0, 2) ?? []
              const more  = (order.items?.length ?? 0) - 2
              return (
                <div key={order.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Left: order info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap mb-2">
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${sc.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                        {order.shippingProvider && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-lg">
                            {PROVIDER_LABELS[order.shippingProvider] ?? order.shippingProvider}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-mono">
                          #{order.id.slice(-8).toUpperCase()}
                        </span>
                        {order.pathaoOrderId && (
                          <button onClick={() => copyText(order.pathaoOrderId!, order.id + '-pid')}
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-primary cursor-pointer transition-colors">
                            <span className="font-mono">Pathao: {order.pathaoOrderId.slice(0, 12)}</span>
                            {copied === order.id + '-pid' ? <CheckCircle size={11} className="text-green-500" /> : <Copy size={11} />}
                          </button>
                        )}
                      </div>

                      <div className="flex items-start gap-5 flex-wrap">
                        {/* Customer */}
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{order.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone size={10} /> {order.phone}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} /> {order.city}
                          </p>
                        </div>

                        {/* Items */}
                        <div className="text-xs text-slate-500">
                          <p className="font-semibold text-slate-700 mb-0.5">Items</p>
                          {items.map((item, i) => (
                            <p key={i}>× {item.quantity} {item.name}</p>
                          ))}
                          {more > 0 && <p className="text-slate-400">+{more} more</p>}
                        </div>
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="text-sm font-bold text-slate-800">NPR {order.total.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString('en-NP', { day: 'numeric', month: 'short' })}
                      </p>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end mt-1">
                        {/* Tracking link */}
                        {order.trackingUrl && (
                          <a href={order.trackingUrl} target="_blank" rel="noopener"
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-[11px] font-bold rounded-lg transition-colors cursor-pointer">
                            <ExternalLink size={11} /> Track
                          </a>
                        )}
                        {/* Mark shipped */}
                        {order.status === 'PROCESSING' && (
                          <button onClick={() => updateStatus(order.id, 'SHIPPED')}
                            disabled={updatingId === order.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                            {updatingId === order.id ? <Loader2 size={11} className="animate-spin" /> : <Truck size={11} />}
                            Mark Shipped
                          </button>
                        )}
                        {/* Mark delivered */}
                        {order.status === 'SHIPPED' && (
                          <button onClick={() => updateStatus(order.id, 'DELIVERED')}
                            disabled={updatingId === order.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                            {updatingId === order.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                            Mark Delivered
                          </button>
                        )}
                        {/* View full order */}
                        <Link href={`/admin/orders/${order.id}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 text-[11px] font-bold rounded-lg transition-colors cursor-pointer">
                          Details <ChevronRight size={11} />
                        </Link>
                      </div>

                      {/* Alert if confirmed but no shipping assigned */}
                      {order.status === 'CONFIRMED' && !order.pathaoOrderId && order.shippingProvider === 'PATHAO' && (
                        <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-1">
                          <AlertTriangle size={10} /> No Pathao assignment yet
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info note */}
      <p className="text-xs text-slate-400 text-center mt-6">
        Delivery provider credentials are configured in{' '}
        <Link href="/admin/settings" className="text-primary font-semibold hover:underline cursor-pointer">
          Settings → Delivery
        </Link>
      </p>
    </div>
  )
}
