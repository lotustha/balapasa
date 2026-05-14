'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ShoppingBag, Search, ChevronDown, Check, Loader2, Package, Phone, MapPin, CreditCard, X, Printer } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface OrderItem { id: string; name: string; quantity: number; price: number; image?: string }
interface Order {
  id: string; name: string; phone: string; email: string | null
  address: string; city: string; paymentMethod: string
  status: string; paymentStatus: string; total: number; subtotal: number
  deliveryCharge: number; notes: string | null; createdAt: string
  items: OrderItem[]
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
  UNPAID: 'bg-slate-100 text-slate-500', PAID: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-600',    REFUNDED: 'bg-amber-100 text-amber-700',
}
const STATUS_FLOW = ['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED']

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (d < 60) return `${d}m ago`
  if (d < 1440) return `${Math.floor(d/60)}h ago`
  return `${Math.floor(d/1440)}d ago`
}

function StatusDropdown({ order, onUpdate }: { order: Order; onUpdate: (id: string, status: string) => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function update(status: string) {
    setSaving(true); setOpen(false)
    await fetch(`/api/admin/orders/${order.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    onUpdate(order.id, status)
    setSaving(false)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} disabled={saving}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${STATUS_CLS[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
        {saving ? <Loader2 size={10} className="animate-spin" /> : order.status}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden w-36">
          {STATUS_FLOW.map(s => (
            <button key={s} onClick={() => update(s)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold hover:bg-slate-50 cursor-pointer transition-colors ${s === order.status ? 'text-primary' : 'text-slate-700'}`}>
              {s} {s === order.status && <Check size={11} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function OrderDetail({ order, onClose, onUpdate }: { order: Order; onClose: () => void; onUpdate: (id: string, status: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl animate-fade-in-up flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <p className="font-mono font-bold text-primary text-sm">#{order.id.slice(0,8).toUpperCase()}</p>
            <p className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleString('en-NP', {dateStyle:'medium',timeStyle:'short'})}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <StatusDropdown order={order} onUpdate={onUpdate} />
            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${PAY_CLS[order.paymentStatus]}`}>{order.paymentStatus}</span>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600">{order.paymentMethod}</span>
          </div>

          {/* Customer */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Customer</p>
            <p className="font-bold text-slate-800">{order.name}</p>
            {order.email && <div className="flex items-center gap-2 text-sm text-slate-500"><CreditCard size={13} />{order.email}</div>}
            <div className="flex items-center gap-2 text-sm text-slate-500"><Phone size={13} />{order.phone}</div>
            <div className="flex items-start gap-2 text-sm text-slate-500"><MapPin size={13} className="mt-0.5 shrink-0" />{order.address}, {order.city}</div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Items ({order.items.length})</p>
            <div className="space-y-2">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-slate-400">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                  </div>
                  <p className="font-bold text-slate-900 text-sm shrink-0">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
            <div className="flex justify-between text-sm text-slate-500"><span>Delivery</span><span>{order.deliveryCharge > 0 ? formatPrice(order.deliveryCharge) : 'FREE'}</span></div>
            <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-100 pt-2"><span>Total</span><span className="text-primary">{formatPrice(order.total)}</span></div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700 mb-1">Customer Note</p>
              <p className="text-sm text-amber-800">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const TABS = ['All','PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED']

export default function OrdersPage() {
  const [orders,   setOrders]   = useState<Order[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [tab,      setTab]      = useState('All')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [printing,  setPrinting]  = useState(false)
  const [printMenu, setPrintMenu] = useState(false)
  const [detail,  setDetail]  = useState<Order | null>(null)

  useEffect(() => {
    fetch('/api/admin/orders?limit=500')
      .then(r => r.json())
      .then(d => setOrders(d.orders ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function printDocs(type: string) {
    const ids = selected.size > 0 ? [...selected] : filtered.map(o => o.id)
    if (!ids.length) return
    setPrinting(true); setPrintMenu(false)
    const res = await fetch('/api/admin/orders/print', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, type }),
    })
    const html = await res.text()
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
    setPrinting(false)
  }

  const handleUpdate = useCallback((id: string, status: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    setDetail(prev => prev?.id === id ? { ...prev, status } : prev)
  }, [])

  const filtered = orders.filter(o => {
    if (tab !== 'All' && o.status !== tab) return false
    if (search) {
      const q = search.toLowerCase()
      return o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q) || o.phone.includes(q)
    }
    return true
  })

  const counts = TABS.reduce((acc, t) => {
    acc[t] = t === 'All' ? orders.length : orders.filter(o => o.status === t).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-6">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">Orders</h1>
          <p className="text-slate-500 text-sm mt-0.5">{orders.length} total · {orders.filter(o=>o.status==='PENDING').length} pending</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <span className="text-xs font-semibold text-primary bg-primary-bg px-2.5 py-1.5 rounded-lg">
              {selected.size} selected
            </span>
          )}
          <div className="relative">
            <button onClick={() => setPrintMenu(m => !m)} disabled={printing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors disabled:opacity-50">
              {printing ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
              Print {selected.size > 0 ? `(${selected.size})` : ''}
              <ChevronDown size={13} />
            </button>
            {printMenu && (
              <div className="absolute top-full right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden w-52">
                <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                  {selected.size > 0 ? `${selected.size} selected order${selected.size>1?'s':''}` : 'All filtered orders'}
                </p>
                {[
                  { type:'shipping', label:'Shipping Labels',  sub:'100mm × 140mm sticker' },
                  { type:'invoice',  label:'Tax Invoice',      sub:'Full invoice with VAT'  },
                  { type:'packing',  label:'Packing Slip',     sub:'Goes inside the box'    },
                  { type:'all',      label:'All Documents',    sub:'Label + Invoice + Slip' },
                ].map(d => (
                  <button key={d.type} onClick={() => printDocs(d.type)}
                    className="w-full flex flex-col px-4 py-3 hover:bg-slate-50 cursor-pointer text-left border-b border-slate-50 last:border-0 transition-colors">
                    <span className="font-bold text-slate-800 text-sm">{d.label}</span>
                    <span className="text-[10px] text-slate-400">{d.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selected.size > 0 && (
            <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer px-2">Clear</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white border border-slate-100 rounded-xl p-1 flex-wrap w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${tab === t ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            {t === 'All' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
            {counts[t] > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${tab === t ? 'bg-white/25' : 'bg-slate-100'}`}>
                {counts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, ID or phone…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
                <th className="px-4 py-3.5 w-10">
                  <input type="checkbox" className="accent-primary cursor-pointer"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={e => setSelected(e.target.checked ? new Set(filtered.map(o=>o.id)) : new Set())} />
                </th>
                <th className="text-left px-2 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Order</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Items</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Payment</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16">
                  <ShoppingBag size={36} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm font-medium">{search || tab !== 'All' ? 'No orders match' : 'No orders yet'}</p>
                </td></tr>
              ) : filtered.map(order => (
                <tr key={order.id} className={`hover:bg-slate-50/50 transition-colors ${selected.has(order.id)?'bg-primary-bg/30':''}`}>
                  <td className="px-4 py-4">
                    <input type="checkbox" className="accent-primary cursor-pointer"
                      checked={selected.has(order.id)}
                      onChange={e => { const s=new Set(selected); e.target.checked?s.add(order.id):s.delete(order.id); setSelected(s) }} />
                  </td>
                  <td className="px-2 py-4">
                    <p className="font-mono font-bold text-primary text-xs">#{order.id.slice(0,8).toUpperCase()}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-800 text-sm">{order.name}</p>
                    <p className="text-xs text-slate-400">{order.city}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <Package size={13} className="text-slate-400" />
                      <span className="text-sm text-slate-600">{order.items?.length ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-900 text-sm">{formatPrice(order.total)}</p>
                    <p className="text-[10px] text-slate-400">{order.paymentMethod}</p>
                  </td>
                  <td className="px-4 py-4">
                    <StatusDropdown order={order} onUpdate={handleUpdate} />
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${PAY_CLS[order.paymentStatus] ?? 'bg-slate-100 text-slate-600'}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-400">{timeAgo(order.createdAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDetail(order)}
                        className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-primary hover:bg-primary-bg rounded-lg transition-colors cursor-pointer">
                        Quick
                      </button>
                      <Link href={`/admin/orders/${order.id}`}
                        className="px-2.5 py-1.5 text-xs font-bold bg-primary text-white hover:bg-primary-dark rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1">
                        Manage
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {detail && <OrderDetail order={detail} onClose={() => setDetail(null)} onUpdate={handleUpdate} />}
    </div>
  )
}
