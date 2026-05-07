import { Users, Search, Mail, Phone } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'

async function getCustomers() {
  try {
    return await prisma.profile.findMany({
      where: { role: 'CUSTOMER' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  } catch { return [] }
}

export default async function CustomersPage() {
  const customers = await getCustomers()

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">Customers</h1>
          <p className="text-slate-500 text-sm mt-0.5">{customers.length} registered customers</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input placeholder="Search customers…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-50 bg-slate-50/60">
              <th className="text-left px-6 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Customer</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Contact</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-16">
                  <Users size={36} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm font-medium">No customers yet</p>
                  <p className="text-slate-300 text-xs mt-1">Customers will appear here once they register</p>
                </td>
              </tr>
            ) : (
              customers.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
                        {(c.name ?? c.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{c.name ?? '—'}</p>
                        <p className="text-xs text-slate-400 font-mono">{c.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <Mail size={11} className="text-slate-400" /> {c.email}
                    </div>
                    {c.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Phone size={11} className="text-slate-400" /> {c.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${c.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-400">
                    {new Date(c.createdAt).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })}
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
