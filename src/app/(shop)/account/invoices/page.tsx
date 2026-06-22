'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, ArrowLeft, Loader2, Download, Clock } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

type InvoiceStatus = 'OPEN' | 'PAID' | 'OVERDUE' | 'VOID'

interface Invoice {
  id: string; number: string; amount: number; status: InvoiceStatus
  dueDate: string; paidAt: string | null; paymentMethod: string | null
  notes: string | null; createdAt: string; planName: string | null
}

const STATUS_META: Record<InvoiceStatus, { label: string; cls: string }> = {
  PAID:    { label: 'Paid',    cls: 'bg-green-100 text-green-700 border-green-200' },
  OPEN:    { label: 'Unpaid',  cls: 'bg-sky-100 text-sky-700 border-sky-200'       },
  OVERDUE: { label: 'Overdue', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  VOID:    { label: 'Void',    cls: 'bg-slate-100 text-slate-500 border-slate-200' },
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

export default function AccountInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading,  setLoading]  = useState(true)
  const [unauth,   setUnauth]   = useState(false)

  useEffect(() => {
    fetch('/api/account/invoices')
      .then(r => { if (r.status === 401) { setUnauth(true); return null } return r.json() })
      .then(d => { if (d) setInvoices(d.invoices ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function download(inv: Invoice) {
    window.open(`/api/account/invoices/${inv.id}/print`, '_blank', 'noopener')
  }

  return (
    <div className="min-h-screen pt-6 pb-16 relative"
      style={{ background: 'linear-gradient(135deg,#F8F7FF 0%,#F4F6FF 40%,#FFF5FB 70%,#F0FDF4 100%)' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-a absolute -top-32 -left-32 w-[500px] h-[500px]"
          style={{ background: '#6366F1', opacity: 0.07 }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
          <Link href="/account"
            className="w-9 h-9 rounded-xl bg-white/80 border border-slate-200 flex items-center justify-center hover:bg-white transition-colors cursor-pointer shadow-sm">
            <ArrowLeft size={16} className="text-slate-600" />
          </Link>
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Account</p>
            <h1 className="font-heading font-extrabold text-2xl text-slate-900 leading-tight">Invoices</h1>
          </div>
          {!loading && invoices.length > 0 && (
            <span className="ml-auto text-xs font-bold text-slate-400">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="glass-card p-12 text-center animate-fade-in">
            <Loader2 size={28} className="animate-spin text-primary mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading your invoices…</p>
          </div>
        )}

        {/* Not signed in */}
        {!loading && unauth && (
          <div className="glass-card p-10 text-center animate-fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-slate-300" />
            </div>
            <p className="font-bold text-slate-700 text-sm">Sign in to view your invoices</p>
            <Link href="/login"
              className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/15">
              Sign In
            </Link>
          </div>
        )}

        {/* Empty */}
        {!loading && !unauth && invoices.length === 0 && (
          <div className="glass-card p-12 text-center animate-fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-slate-300" />
            </div>
            <p className="font-bold text-slate-700 text-sm">No invoices yet</p>
            <p className="text-slate-400 text-xs mt-1.5 max-w-xs mx-auto">
              Invoices for subscriptions and billed services will appear here.
            </p>
          </div>
        )}

        {/* List */}
        {!loading && invoices.length > 0 && (
          <div className="space-y-3">
            {invoices.map((inv, i) => {
              const meta = STATUS_META[inv.status] ?? { label: inv.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' }
              return (
                <div key={inv.id} className="glass-card p-4 flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="w-10 h-10 rounded-xl bg-primary-bg flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono font-bold text-slate-800 text-sm">#{inv.number}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.cls}`}>{meta.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {inv.notes || inv.planName || 'Service / Product'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock size={10} />
                      {inv.status === 'PAID' && inv.paidAt ? `Paid ${formatDate(inv.paidAt)}` : `Due ${formatDate(inv.dueDate)}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-900 text-sm">{formatPrice(inv.amount)}</p>
                    <button type="button" onClick={() => download(inv)}
                      className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-[11px] font-bold hover:bg-primary-dark transition-colors cursor-pointer shadow-sm shadow-primary/15">
                      <Download size={12} /> Download
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
