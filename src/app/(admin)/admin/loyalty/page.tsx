'use client'

import { useEffect, useState, useCallback } from 'react'
import { Award, Loader2, Save, CheckCircle2, ToggleLeft, ToggleRight } from 'lucide-react'

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

interface Form { enabled: boolean; nprPerPoint: string; pointValue: string; minRedeem: string }

export default function LoyaltyAdminPage() {
  const [form, setForm]     = useState<Form>({ enabled: true, nprPerPoint: '100', pointValue: '1', minRedeem: '100' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/settings', { cache: 'no-store' })
    if (res.ok) {
      const s = (await res.json()).settings ?? {}
      setForm({
        enabled:     s.LOYALTY_ENABLED == null ? true : s.LOYALTY_ENABLED === 'true',
        nprPerPoint: s.LOYALTY_NPR_PER_POINT ?? '100',
        pointValue:  s.LOYALTY_POINT_VALUE ?? '1',
        minRedeem:   s.LOYALTY_MIN_REDEEM ?? '100',
      })
    }
    setLoading(false)
  }, [])
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t) }, [load])

  async function save() {
    setSaving(true); setToast(null)
    const res = await fetch('/api/admin/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        LOYALTY_ENABLED:       form.enabled ? 'true' : 'false',
        LOYALTY_NPR_PER_POINT: String(Math.max(1, Number(form.nprPerPoint) || 100)),
        LOYALTY_POINT_VALUE:   String(Math.max(0.01, Number(form.pointValue) || 1)),
        LOYALTY_MIN_REDEEM:    String(Math.max(1, Math.round(Number(form.minRedeem) || 100))),
      }),
    })
    setToast(res.ok ? 'Saved — changes apply within ~30s.' : 'Failed to save')
    setSaving(false)
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="p-4 md:p-8 max-w-xl">
      <div className="mb-6">
        <h1 className="font-heading font-extrabold text-2xl text-slate-900 flex items-center gap-2">
          <Award size={20} className="text-primary" /> Loyalty Points
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Customers earn points on delivered orders and redeem them as store credit.</p>
      </div>

      {toast && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">
          <CheckCircle2 size={15} /> {toast}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-5">
          {/* Enable */}
          <button onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
            className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
            <div className="text-left">
              <p className="text-sm font-bold text-slate-800">Loyalty program</p>
              <p className="text-xs text-slate-400">{form.enabled ? 'Active — points are earned and redeemable' : 'Off — no points earned or redeemed'}</p>
            </div>
            {form.enabled ? <ToggleRight size={26} className="text-primary shrink-0" /> : <ToggleLeft size={26} className="text-slate-300 shrink-0" />}
          </button>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">NPR spent per point earned</label>
            <input type="number" min="1" value={form.nprPerPoint} onChange={e => setForm(f => ({ ...f, nprPerPoint: e.target.value }))} className={inputCls} />
            <p className="text-[11px] text-slate-400 mt-1">e.g. 100 → a customer earns 1 point for every NPR 100 of product subtotal on a delivered order.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Store credit per point (NPR)</label>
            <input type="number" min="0.01" step="0.01" value={form.pointValue} onChange={e => setForm(f => ({ ...f, pointValue: e.target.value }))} className={inputCls} />
            <p className="text-[11px] text-slate-400 mt-1">Redemption rate — e.g. 1 → 100 points convert to NPR 100 of store credit.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Minimum points to redeem</label>
            <input type="number" min="1" value={form.minRedeem} onChange={e => setForm(f => ({ ...f, minRedeem: e.target.value }))} className={inputCls} />
          </div>

          <button onClick={save} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-xl cursor-pointer transition-colors shadow-md shadow-primary/20 disabled:opacity-50">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save settings</>}
          </button>
        </div>
      )}
    </div>
  )
}
