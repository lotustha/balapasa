'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Loader2, Save, CheckCircle2, ToggleLeft, ToggleRight } from 'lucide-react'

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

interface Form { enabled: boolean; referrerReward: string; refereeReward: string; minOrder: string }

export default function ReferralAdminPage() {
  const [form, setForm]   = useState<Form>({ enabled: true, referrerReward: '100', refereeReward: '100', minOrder: '0' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/settings', { cache: 'no-store' })
    if (res.ok) {
      const s = (await res.json()).settings ?? {}
      setForm({
        enabled:        s.REFERRAL_ENABLED == null ? true : s.REFERRAL_ENABLED === 'true',
        referrerReward: s.REFERRAL_REFERRER_REWARD ?? '100',
        refereeReward:  s.REFERRAL_REFEREE_REWARD ?? '100',
        minOrder:       s.REFERRAL_MIN_ORDER ?? '0',
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
        REFERRAL_ENABLED:         form.enabled ? 'true' : 'false',
        REFERRAL_REFERRER_REWARD: String(Math.max(0, Number(form.referrerReward) || 0)),
        REFERRAL_REFEREE_REWARD:  String(Math.max(0, Number(form.refereeReward) || 0)),
        // 0 is a valid min-order, but the settings API drops '' — send '0' explicitly.
        REFERRAL_MIN_ORDER:       String(Math.max(0, Number(form.minOrder) || 0)),
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
          <Users size={20} className="text-primary" /> Referrals
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Customers share a code; both sides get store credit when the new customer&apos;s first order is delivered.</p>
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
          <button onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
            className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
            <div className="text-left">
              <p className="text-sm font-bold text-slate-800">Referral program</p>
              <p className="text-xs text-slate-400">{form.enabled ? 'Active — codes work and rewards are paid' : 'Off — no new attributions or rewards'}</p>
            </div>
            {form.enabled ? <ToggleRight size={26} className="text-primary shrink-0" /> : <ToggleLeft size={26} className="text-slate-300 shrink-0" />}
          </button>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Referrer reward (NPR store credit)</label>
            <input type="number" min="0" value={form.referrerReward} onChange={e => setForm(f => ({ ...f, referrerReward: e.target.value }))} className={inputCls} />
            <p className="text-[11px] text-slate-400 mt-1">Paid to the existing customer when their referee&apos;s first order is delivered.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">New-customer reward (NPR store credit)</label>
            <input type="number" min="0" value={form.refereeReward} onChange={e => setForm(f => ({ ...f, refereeReward: e.target.value }))} className={inputCls} />
            <p className="text-[11px] text-slate-400 mt-1">Paid to the referred customer when their first order is delivered.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Minimum first-order subtotal (NPR)</label>
            <input type="number" min="0" value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))} className={inputCls} />
            <p className="text-[11px] text-slate-400 mt-1">0 = any order qualifies. Below this, the referral stays pending until a larger order is delivered.</p>
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
