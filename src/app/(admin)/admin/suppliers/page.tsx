import { prisma } from '@/lib/prisma'
import { Building2, Plus, Edit2, Mail, Phone, Package } from 'lucide-react'
import Link from 'next/link'

async function getSuppliers() {
  try {
    return await prisma.supplier.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    })
  } catch { return [] }
}

export default async function SuppliersPage() {
  const suppliers = await getSuppliers()

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-7">
        <div>
          <Link href="/admin/products" className="text-xs text-slate-400 hover:text-primary flex items-center gap-1 mb-1 cursor-pointer">
            ← Products
          </Link>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">Suppliers</h1>
          <p className="text-slate-500 text-sm mt-0.5">{suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/20">
          <Plus size={15} /> Add Supplier
        </button>
      </div>

      {suppliers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
          <Building2 size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No suppliers yet</p>
          <p className="text-slate-300 text-xs mt-1">Add suppliers to track product sourcing</p>
          <p className="text-xs text-slate-400 mt-4 max-w-xs mx-auto">
            Tip: Suppliers are also auto-created when you import products via Excel with a Supplier column.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-primary/30 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-bg flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{s.name}</p>
                    {s.contactName && <p className="text-xs text-slate-400">{s.contactName}</p>}
                  </div>
                </div>
                <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                  <Edit2 size={13} />
                </button>
              </div>

              <div className="space-y-1.5">
                {s.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail size={11} className="text-slate-400" /> {s.email}
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone size={11} className="text-slate-400" /> {s.phone}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Package size={11} /> {s._count.products} product{s._count.products !== 1 ? 's' : ''}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {s.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
