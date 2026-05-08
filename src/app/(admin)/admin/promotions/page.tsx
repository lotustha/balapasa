'use client'

import { useEffect, useState } from 'react'
import {
  Percent, Truck, Plus, Trash2, Save, Loader2,
  CheckCircle2, ToggleLeft, ToggleRight, Zap, Info,
  ArrowRight,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { DiscountRule } from '@/app/api/discount-rules/route'

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

function newRule(type: DiscountRule['type']): DiscountRule {
  return {
    id: crypto.randomUUID(), type, isActive: true, label: '',
    minOrder: type === 'DELIVERY_SUBSIDY' ? 5000 : 3000,
    deliveryCredit: type === 'DELIVERY_SUBSIDY' ? 100 : undefined,
    percent:        type === 'ORDER_DISCOUNT'   ? 5   : undefined,
    maxDiscount:    type === 'ORDER_DISCOUNT'   ? 200 : undefined,
  }
}

function RuleCard({ rule, onChange, onDelete }: {
  rule: DiscountRule; onChange: (r: DiscountRule) => void; onDelete: () => void
}) {
  const isDelivery = rule.type === 'DELIVERY_SUBSIDY'
  const accentBg   = isDelivery ? 'bg-blue-50'  : 'bg-green-50'
  const accentBdr  = isDelivery ? 'border-blue-100' : 'border-green-100'
  const accentText = isDelivery ? 'text-blue-600' : 'text-green-600'
  const iconBg     = isDelivery ? 'bg-blue-100' : 'bg-green-100'

  const preview = isDelivery
    ? `Spend ≥ ${formatPrice(rule.minOrder)} → NPR ${rule.deliveryCredit ?? 0} off delivery`
    : `Spend ≥ ${formatPrice(rule.minOrder)} → ${rule.percent ?? 0}% off (cap NPR ${rule.maxDiscount ?? '∞'})`

  return (
    <div className={`rounded-2xl border bg-white overflow-hidden transition-all duration-200 ${rule.isActive ? 'border-slate-200 shadow-sm' : 'border-slate-100 opacity-55'}`}>
      {/* Top accent bar */}
      <div className={`h-1 ${isDelivery ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 'bg-gradient-to-r from-green-400 to-primary'}`} />

      <div className="px-5 py-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
              {isDelivery ? <Truck size={16} className={accentText} /> : <Percent size={16} className={accentText} />}
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">{isDelivery ? 'Delivery Subsidy' : 'Order Discount'}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{preview}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onChange({ ...rule, isActive: !rule.isActive })} title="Toggle active"
              className="p-1.5 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-primary hover:bg-primary-bg">
              {rule.isActive ? <ToggleRight size={20} className="text-primary" /> : <ToggleLeft size={20} />}
            </button>
            <button onClick={onDelete} title="Delete rule"
              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Visual tier card */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${accentBg} ${accentBdr} mb-4`}>
          <div className="text-center px-3 border-r border-current/10">
            <p className={`text-xs font-bold ${accentText} opacity-70 uppercase tracking-wider`}>Spend ≥</p>
            <p className={`text-lg font-extrabold ${accentText}`}>{formatPrice(rule.minOrder)}</p>
          </div>
          <ArrowRight size={14} className={`${accentText} opacity-50 shrink-0`} />
          <div>
            {isDelivery ? (
              <>
                <p className={`text-xs font-bold ${accentText} opacity-70 uppercase tracking-wider`}>Delivery discount</p>
                <p className={`text-lg font-extrabold ${accentText}`}>NPR {rule.deliveryCredit ?? 0} off</p>
              </>
            ) : (
              <>
                <p className={`text-xs font-bold ${accentText} opacity-70 uppercase tracking-wider`}>Order discount</p>
                <p className={`text-lg font-extrabold ${accentText}`}>{rule.percent ?? 0}% off
                  {rule.maxDiscount ? <span className="text-sm font-semibold opacity-70"> (max NPR {rule.maxDiscount})</span> : ''}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Fields */}
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Min Order (NPR)</label>
            <input type="number" min="0" value={rule.minOrder}
              onChange={e => onChange({ ...rule, minOrder: Number(e.target.value) })}
              className={inputCls} />
          </div>
          {isDelivery ? (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Delivery Credit (NPR)</label>
              <input type="number" min="0" value={rule.deliveryCredit ?? ''}
                onChange={e => onChange({ ...rule, deliveryCredit: Number(e.target.value) })}
                placeholder="100" className={inputCls} />
              <p className="text-[10px] text-slate-400 mt-1">Max NPR deducted from delivery charge</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Discount %</label>
                <input type="number" min="0" max="100" value={rule.percent ?? ''}
                  onChange={e => onChange({ ...rule, percent: Number(e.target.value) })}
                  placeholder="5" className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Max Discount (NPR)</label>
                <input type="number" min="0" value={rule.maxDiscount ?? ''}
                  onChange={e => onChange({ ...rule, maxDiscount: Number(e.target.value) })}
                  placeholder="200" className={inputCls} />
                <p className="text-[10px] text-slate-400 mt-1">Cap on discount amount</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, label, accentText, onClick }: {
  icon: typeof Truck; label: string; accentText: string; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className="w-full py-10 border-2 border-dashed border-slate-200 rounded-2xl hover:border-slate-300 hover:bg-slate-50/50 transition-all cursor-pointer group flex flex-col items-center gap-2">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
        <Icon size={20} className={`${accentText} opacity-50`} />
      </div>
      <p className="text-sm text-slate-400 group-hover:text-slate-600 transition-colors font-medium">{label}</p>
      <p className="text-xs text-slate-300">Click to add your first rule</p>
    </button>
  )
}

export default function PromotionsPage() {
  const [rules,   setRules]   = useState<DiscountRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    fetch('/api/admin/discount-rules').then(r => r.json())
      .then(d => { setRules(d.rules ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const deliveryRules = rules.filter(r => r.type === 'DELIVERY_SUBSIDY').sort((a, b) => a.minOrder - b.minOrder)
  const discountRules = rules.filter(r => r.type === 'ORDER_DISCOUNT').sort((a, b) => a.minOrder - b.minOrder)

  async function saveAll() {
    setSaving(true); setSaved(false)
    await fetch('/api/admin/discount-rules', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-primary" /></div>
  )

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Zap size={17} className="text-amber-600" />
            </div>
            <h1 className="font-heading font-extrabold text-2xl text-slate-900">Promotions</h1>
          </div>
          <p className="text-slate-500 text-sm">Automatic discounts — applied at checkout without a coupon code</p>
        </div>
        <button onClick={saveAll} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-md shadow-primary/15 shrink-0">
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
            : saved ? <><CheckCircle2 size={14} /> Saved!</>
            : <><Save size={14} /> Save All</>}
        </button>
      </div>

      {/* How it works banner */}
      <div className="flex items-start gap-3.5 px-5 py-4 bg-blue-50 border border-blue-100 rounded-2xl mb-8">
        <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-bold mb-0.5">How automatic rules work</p>
          <p className="text-xs leading-relaxed opacity-90">
            <strong>Delivery subsidies</strong>: the highest matching tier wins (NPR 5,000 → 100 off; NPR 10,000 → 200 off).<br />
            <strong>Order discounts</strong>: all matching rules stack, each capped individually.
          </p>
        </div>
      </div>

      {/* Delivery Subsidies */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-1 h-5 rounded-full bg-blue-400" />
            <h2 className="font-heading font-bold text-slate-800">Delivery Subsidies</h2>
            {deliveryRules.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                {deliveryRules.length} rule{deliveryRules.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button onClick={() => setRules(prev => [...prev, newRule('DELIVERY_SUBSIDY')])}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer">
            <Plus size={13} /> Add Rule
          </button>
        </div>
        <div className="space-y-3">
          {deliveryRules.length === 0 ? (
            <EmptyState icon={Truck} label="No delivery subsidy rules" accentText="text-blue-500"
              onClick={() => setRules(prev => [...prev, newRule('DELIVERY_SUBSIDY')])} />
          ) : (
            deliveryRules.map(r => (
              <RuleCard key={r.id} rule={r}
                onChange={u => setRules(prev => prev.map(x => x.id === r.id ? u : x))}
                onDelete={() => setRules(prev => prev.filter(x => x.id !== r.id))} />
            ))
          )}
        </div>
      </section>

      {/* Order Discounts */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-1 h-5 rounded-full bg-green-400" />
            <h2 className="font-heading font-bold text-slate-800">Order Discounts</h2>
            {discountRules.length > 0 && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                {discountRules.length} rule{discountRules.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button onClick={() => setRules(prev => [...prev, newRule('ORDER_DISCOUNT')])}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-xl transition-colors cursor-pointer">
            <Plus size={13} /> Add Rule
          </button>
        </div>
        <div className="space-y-3">
          {discountRules.length === 0 ? (
            <EmptyState icon={Percent} label="No order discount rules" accentText="text-green-500"
              onClick={() => setRules(prev => [...prev, newRule('ORDER_DISCOUNT')])} />
          ) : (
            discountRules.map(r => (
              <RuleCard key={r.id} rule={r}
                onChange={u => setRules(prev => prev.map(x => x.id === r.id ? u : x))}
                onDelete={() => setRules(prev => prev.filter(x => x.id !== r.id))} />
            ))
          )}
        </div>
      </section>

      {/* Sticky save reminder when unsaved changes */}
      {rules.length > 0 && (
        <div className="sticky bottom-6 flex justify-center mt-8">
          <button onClick={saveAll} disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold text-sm rounded-2xl transition-colors cursor-pointer shadow-xl shadow-primary/25">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : saved ? <><CheckCircle2 size={14} /> All changes saved!</>
              : <><Save size={14} /> Save all changes</>}
          </button>
        </div>
      )}
    </div>
  )
}
