'use client'

import { useState } from 'react'
import { Loader2, Mail, PackagePlus, CheckCircle2, AlertCircle } from 'lucide-react'

// Edit-page card: emails the product's linked supplier a firm reorder (PO).
// The automatic low-stock alert to suppliers is fired separately at order time;
// this is the manual, admin-initiated reorder with a specific quantity.
export default function SupplierReorderCard({ productId }: { productId: string }) {
  const [qty,     setQty]     = useState('')
  const [note,    setNote]    = useState('')
  const [sending, setSending] = useState(false)
  const [result,  setResult]  = useState<{ ok: boolean; msg: string } | null>(null)

  async function send() {
    const n = Number(qty)
    if (!Number.isFinite(n) || n <= 0) {
      setResult({ ok: false, msg: 'Enter a quantity greater than 0.' })
      return
    }
    setSending(true); setResult(null)
    try {
      const res = await fetch(`/api/admin/products/${productId}/reorder`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: n, note: note || undefined }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setResult({ ok: false, msg: data.error ?? `HTTP ${res.status}` })
      } else {
        setResult({ ok: true, msg: `Reorder email sent to ${data.sentTo}` })
        setQty(''); setNote('')
      }
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : 'Network error' })
    } finally {
      setSending(false)
    }
  }

  const fieldCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white'

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 mt-5 max-w-3xl">
      <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-1">
        <PackagePlus size={15} className="text-primary" /> Reorder from supplier
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Emails this product&apos;s linked supplier a purchase order. Requires a supplier with an email address set on the product.
      </p>

      <div className="grid sm:grid-cols-[140px_1fr] gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quantity</label>
          <input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} placeholder="50" className={fieldCls} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Note (optional)</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Preferred variant, delivery deadline…" className={fieldCls} />
        </div>
      </div>

      {result && (
        <div className={`mt-3 flex items-center gap-2 text-xs font-semibold rounded-xl px-3 py-2 ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {result.ok ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />} {result.msg}
        </div>
      )}

      <button onClick={send} disabled={sending}
        className="mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white text-sm font-bold rounded-xl cursor-pointer transition-colors">
        {sending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Mail size={14} /> Send reorder email</>}
      </button>
    </div>
  )
}
