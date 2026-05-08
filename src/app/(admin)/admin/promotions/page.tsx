'use client'

import { useEffect, useState } from 'react'
import {
  Percent, Truck, Plus, Trash2, Save, Loader2,
  CheckCircle2, ToggleLeft, ToggleRight, Zap, Info,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { DiscountRule } from '@/app/api/discount-rules/route'

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

function newRule(type: DiscountRule['type']): DiscountRule {
  return {
    id:            crypto.randomUUID(),
    type,
    minOrder:      type === 'DELIVERY_SUBSIDY' ? 5000 : 3000,
    deliveryCredit: type === 'DELIVERY_SUBSIDY' ? 100 : undefined,
    percent:        type === 'ORDER_DISCOUNT'   ? 5   : undefined,
    maxDiscount:    type === 'ORDER_DISCOUNT'   ? 200 : undefined,
    isActive:      true,
    label:         '',
  }
}

function RuleCard({
  rule, onChange, onDelete,
}: {
  rule: DiscountRule
  onChange: (r: DiscountRule) => void
  onDelete: () => void
}) {
  const isDelivery = rule.type === 'DELIVERY_SUBSIDY'

  // Auto-generate label preview
  const preview = isDelivery
    ? `Spend ≥ ${formatPrice(rule.minOrder)} → NPR ${rule.deliveryCredit ?? 0} off delivery`
    : `Spend ≥ ${formatPrice(rule.minOrder)} → ${rule.percent ?? 0}% off (cap NPR ${rule.maxDiscount ?? '∞'})`

  return (
    <div className={`bg-white rounded-2xl border transition-colors ${rule.isActive ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDelivery ? 'bg-blue-100' : 'bg-green-100'}`}>
            {isDelivery ? <Truck size={13} className="text-blue-600" /> : <Percent size={13} className="text-green-600" />}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{isDelivery ? 'Delivery Subsidy' : 'Order Discount'}</p>
            <p className="text-[10px] text-slate-400">{preview}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onChange({ ...rule, isActive: !rule.isActive })}
            className="p-1.5 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-primary">
            {rule.isActive ? <ToggleRight size={18} className="text-primary" /> : <ToggleLeft size={18} />}
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="p-5">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Min Order (NPR)</label>
            <input type="number" min="0" value={rule.minOrder}
              onChange={e => onChange({ ...rule, minOrder: Number(e.target.value) })}
              className={inputCls} />
          </div>

          {isDelivery ? (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Delivery Credit (NPR)</label>
              <input type="number" min="0" value={rule.deliveryCredit ?? ''}
                onChange={e => onChange({ ...rule, deliveryCredit: Number(e.target.value) })}
                placeholder="100" className={inputCls} />
              <p className="text-[9px] text-slate-400 mt-1">Max NPR off delivery charge</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Discount (%)</label>
                <input type="number" min="0" max="100" value={rule.percent ?? ''}
                  onChange={e => onChange({ ...rule, percent: Number(e.target.value) })}
                  placeholder="5" className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cap (NPR)</label>
                <input type="number" min="0" value={rule.maxDiscount ?? ''}
                  onChange={e => onChange({ ...rule, maxDiscount: Number(e.target.value) })}
                  placeholder="200" className={inputCls} />
                <p className="text-[9px] text-slate-400 mt-1">Max discount amount</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
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

  function update(id: string, updated: DiscountRule) {
    setRules(prev => prev.map(r => r.id === id ? updated : r))
  }
  function remove(id: string) { setRules(prev => prev.filter(r => r.id !== id)) }
  function add(type: DiscountRule['type']) { setRules(prev => [...prev, newRule(type)]) }

  async function saveAll() {
    setSaving(true); setSaved(false)
    await fetch('/api/admin/discount-rules', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const deliveryRules = rules.filter(r => r.type === 'DELIVERY_SUBSIDY')
    .sort((a, b) => a.minOrder - b.minOrder)
  const discountRules = rules.filter(r => r.type === 'ORDER_DISCOUNT')
    .sort((a, b) => a.minOrder - b.minOrder)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-primary" />
    </div>
  )

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 flex items-center gap-2">
            <Zap size={20} className="text-gold-bright" /> Promotions
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Automatic discounts applied at checkout — no coupon code needed</p>
        </div>
        <button onClick={saveAll} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-md shadow-primary/15">
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
            : saved ? <><CheckCircle2 size={14} /> Saved!</>
            : <><Save size={14} /> Save All</>}
        </button>
      </div>

      {/* How it works */}
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-700 mb-8">
        <Info size={13} className="shrink-0 mt-0.5" />
        <div>
          <strong>How it works:</strong> Rules are evaluated at checkout automatically.
          The highest-tier matching <em>Delivery Subsidy</em> applies (e.g. NPR 5,000 → 100 off; NPR 10,000 → 200 off).
          All matching <em>Order Discount</em> rules stack (each capped individually).
        </div>
      </div>

      {/* Delivery Subsidy section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-blue-500" />
            <h2 className="font-heading font-bold text-slate-800">Delivery Subsidies</h2>
            <span className="text-xs text-slate-400">({deliveryRules.length} rule{deliveryRules.length !== 1 ? 's' : ''})</span>
          </div>
          <button onClick={() => add('DELIVERY_SUBSIDY')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer">
            <Plus size={13} /> Add Rule
          </button>
        </div>
        <div className="space-y-3">
          {deliveryRules.length === 0 && (
            <div className="py-8 text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl">
              <Truck size={28} className="mx-auto mb-2" />
              <p className="text-sm text-slate-400">No delivery subsidy rules yet</p>
            </div>
          )}
          {deliveryRules.map(r => (
            <RuleCard key={r.id} rule={r} onChange={u => update(r.id, u)} onDelete={() => remove(r.id)} />
          ))}
        </div>
      </div>

      {/* Order Discount section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Percent size={16} className="text-green-500" />
            <h2 className="font-heading font-bold text-slate-800">Order Discounts</h2>
            <span className="text-xs text-slate-400">({discountRules.length} rule{discountRules.length !== 1 ? 's' : ''})</span>
          </div>
          <button onClick={() => add('ORDER_DISCOUNT')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-xl transition-colors cursor-pointer">
            <Plus size={13} /> Add Rule
          </button>
        </div>
        <div className="space-y-3">
          {discountRules.length === 0 && (
            <div className="py-8 text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl">
              <Percent size={28} className="mx-auto mb-2" />
              <p className="text-sm text-slate-400">No order discount rules yet</p>
            </div>
          )}
          {discountRules.map(r => (
            <RuleCard key={r.id} rule={r} onChange={u => update(r.id, u)} onDelete={() => remove(r.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}
