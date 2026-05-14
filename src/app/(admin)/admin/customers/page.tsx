'use client'

import { useState, useEffect } from 'react'
import { Users, Search, Mail, Phone, ShoppingBag, TrendingUp, Loader2, ShieldCheck } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import TeamMemberDialog from '@/components/admin/TeamMemberDialog'

interface Customer {
  id: string; name: string | null; email: string; phone: string | null
  role: string; createdAt: string; orderCount: number; totalSpent: number
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [promote,   setPromote]   = useState<Customer | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/admin/customers')
      .then(r => r.json())
      .then(d => setCustomers(d.customers ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = customers.filter(c =>
    !search || [c.name, c.email, c.phone].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0)
  const totalOrders  = customers.reduce((s, c) => s + c.orderCount, 0)

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-6">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">Customers</h1>
          <p className="text-slate-500 text-sm mt-0.5">{customers.length} registered · {totalOrders} orders · {formatPrice(totalRevenue)} revenue</p>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {[
            { icon: Users,      label: 'Total Customers', value: String(customers.length),     color: 'bg-purple-50 text-purple-600' },
            { icon: ShoppingBag,label: 'Total Orders',    value: String(totalOrders),           color: 'bg-blue-50 text-blue-600'   },
            { icon: TrendingUp, label: 'Total Revenue',   value: formatPrice(totalRevenue),     color: 'bg-primary-bg text-primary' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-slate-100 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="font-extrabold text-xl text-slate-900">{value}</p>
                <p className="text-xs text-slate-400 font-semibold">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-5 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search customers…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
                <th className="text-left px-6 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Contact</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Orders</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Spent</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Joined</th>
                <th className="text-right px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16">
                  <Users size={36} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">{search ? 'No customers match' : 'No customers yet'}</p>
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
                        {(c.name ?? c.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{c.name ?? '—'}</p>
                        <p className="text-xs text-slate-400 font-mono">{c.id.slice(0,8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><Mail size={11} /> {c.email}</div>
                    {c.phone && <div className="flex items-center gap-1.5 text-xs text-slate-500"><Phone size={11} /> {c.phone}</div>}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">{c.orderCount}</span>
                      <span className="text-xs text-slate-400">order{c.orderCount !== 1 ? 's' : ''}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-900 text-sm">{c.totalSpent > 0 ? formatPrice(c.totalSpent) : '—'}</p>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-400">
                    {new Date(c.createdAt).toLocaleDateString('en-NP', {day:'numeric',month:'short',year:'numeric'})}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => setPromote(c)}
                      title="Promote to team"
                      className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <ShieldCheck size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <TeamMemberDialog
        open={!!promote}
        onClose={() => { setPromote(null); load() }}
        promoteFromId={promote?.id}
        promoteEmail={promote?.email}
        promoteName={promote?.name ?? undefined}
      />
    </div>
  )
}
