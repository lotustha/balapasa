'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Settings, Store, Bell, Shield, Sparkles, CreditCard,
  Save, Loader2, CheckCircle2, Eye, EyeOff,
  ExternalLink, AlertCircle, RefreshCw, Truck,
} from 'lucide-react'
import { STORE_NAME } from '@/lib/config'

// ── Types ─────────────────────────────────────────────────────────────────

interface StoreForm {
  STORE_NAME: string; STORE_EMAIL: string; STORE_PHONE: string
  STORE_ADDRESS: string; FREE_DELIVERY_THRESHOLD: string; STORE_LOGO_URL: string
}
interface PaymentForm { ESEWA_MERCHANT_ID: string; ESEWA_SECRET_KEY: string; KHALTI_SECRET_KEY: string }
interface NotifForm   { ORDER_NOTIFICATION_EMAIL: string }
interface AIForm      { ANTHROPIC_API_KEY: string; GEMINI_API_KEY: string }

// ── Reusable field label ───────────────────────────────────────────────────

const inputCls = 'w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{children}</label>
}

// ── Masked API key input ───────────────────────────────────────────────────

function SecretInput({ label, value, onChange, placeholder, hint, testStatus }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder: string; hint?: string; testStatus?: 'idle' | 'ok' | 'fail' | 'testing'
}) {
  const [show, setShow] = useState(false)
  const isMasked = value.startsWith('••')

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <input
          type={show || isMasked ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputCls} pr-20 font-mono`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {testStatus === 'ok'      && <CheckCircle2 size={14} className="text-green-500" />}
          {testStatus === 'fail'    && <AlertCircle  size={14} className="text-red-500"   />}
          {testStatus === 'testing' && <Loader2      size={14} className="animate-spin text-slate-400" />}
          <button type="button" onClick={() => setShow(s => !s)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
      {isMasked && <p className="text-[10px] text-amber-600 mt-1">A key is already set. Type a new value to replace it.</p>}
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ icon: Icon, title, iconBg, badge, children }: {
  icon: typeof Settings; title: string; iconBg: string
  badge?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
            <Icon size={15} className="text-white" />
          </div>
          <h2 className="font-heading font-bold text-slate-800 text-sm">{title}</h2>
        </div>
        {badge}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  )
}

// ── Save button ────────────────────────────────────────────────────────────

function SaveBtn({ section, saving, saved }: { section: string; saving: string | null; saved: string | null }) {
  return (
    <button type="submit"
      className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-md shadow-primary/15 disabled:opacity-50"
      disabled={saving === section}>
      {saving === section
        ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
        : saved === section
        ? <><CheckCircle2 size={14} /> Saved!</>
        : <><Save size={14} /> Save</>}
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState<string | null>(null)
  const [saved,      setSaved]      = useState<string | null>(null)
  const [saveError,  setSaveError]  = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'ok' | 'fail' | 'testing'>>({})

  const [store, setStore] = useState<StoreForm>({
    STORE_NAME: STORE_NAME, STORE_EMAIL: '', STORE_PHONE: '',
    STORE_ADDRESS: 'Kathmandu, Nepal', FREE_DELIVERY_THRESHOLD: '5000', STORE_LOGO_URL: '',
  })
  const [payment, setPayment] = useState<PaymentForm>({
    ESEWA_MERCHANT_ID: '', ESEWA_SECRET_KEY: '', KHALTI_SECRET_KEY: '',
  })
  const [notif, setNotif] = useState<NotifForm>({ ORDER_NOTIFICATION_EMAIL: '' })
  const [ai,    setAi]    = useState<AIForm>({ ANTHROPIC_API_KEY: '', GEMINI_API_KEY: '' })

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(({ settings }) => {
        if (!settings) return
        setStore(s => ({
          ...s,
          STORE_NAME:              settings.STORE_NAME              ?? s.STORE_NAME,
          STORE_EMAIL:             settings.STORE_EMAIL             ?? s.STORE_EMAIL,
          STORE_PHONE:             settings.STORE_PHONE             ?? s.STORE_PHONE,
          STORE_ADDRESS:           settings.STORE_ADDRESS           ?? s.STORE_ADDRESS,
          FREE_DELIVERY_THRESHOLD: settings.FREE_DELIVERY_THRESHOLD ?? s.FREE_DELIVERY_THRESHOLD,
          STORE_LOGO_URL:          settings.STORE_LOGO_URL          ?? s.STORE_LOGO_URL,
        }))
        setPayment(p => ({
          ...p,
          ESEWA_MERCHANT_ID: settings.ESEWA_MERCHANT_ID ?? p.ESEWA_MERCHANT_ID,
          ESEWA_SECRET_KEY:  settings.ESEWA_SECRET_KEY  ?? p.ESEWA_SECRET_KEY,
          KHALTI_SECRET_KEY: settings.KHALTI_SECRET_KEY ?? p.KHALTI_SECRET_KEY,
        }))
        setNotif({ ORDER_NOTIFICATION_EMAIL: settings.ORDER_NOTIFICATION_EMAIL ?? '' })
        setAi(a => ({
          ANTHROPIC_API_KEY: settings.ANTHROPIC_API_KEY ?? a.ANTHROPIC_API_KEY,
          GEMINI_API_KEY:    settings.GEMINI_API_KEY    ?? a.GEMINI_API_KEY,
        }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function save(section: string, data: Record<string, string>) {
    setSaving(section); setSaved(null); setSaveError(null)
    try {
      const res  = await fetch('/api/admin/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setSaveError(json.error ?? `HTTP ${res.status}`); setSaving(null); return }
      setSaved(section)
      setTimeout(() => setSaved(null), 3000)
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'Network error') }
    setSaving(null)
  }

  async function testKey(provider: 'claude' | 'gemini') {
    const key = provider === 'claude' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY'
    setTestStatus(s => ({ ...s, [key]: 'testing' }))
    const res  = await fetch('/api/admin/ai/tags', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', category: 'Test', provider }),
    })
    const data = await res.json()
    setTestStatus(s => ({ ...s, [key]: data.tags?.length ? 'ok' : 'fail' }))
    setTimeout(() => setTestStatus(s => ({ ...s, [key]: 'idle' })), 4000)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-primary" />
    </div>
  )

  return (
    <div className="p-8 max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings size={22} className="text-primary" />
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your store configuration and integrations</p>
        </div>
      </div>

      {/* Error banner */}
      {saveError && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Save failed</p>
            <p className="text-xs mt-0.5 font-mono">{saveError}</p>
          </div>
        </div>
      )}

      {/* ── Store Information ─────────────────────────────────────────── */}
      <form onSubmit={e => { e.preventDefault(); save('store', store as unknown as Record<string, string>) }}>
        <Section icon={Store} title="Store Information" iconBg="bg-primary">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Store Name</FieldLabel>
              <input value={store.STORE_NAME} onChange={e => setStore(s => ({ ...s, STORE_NAME: e.target.value }))}
                placeholder="Your Store Name" className={inputCls} />
            </div>
            <div>
              <FieldLabel>Store Email</FieldLabel>
              <input type="email" value={store.STORE_EMAIL} onChange={e => setStore(s => ({ ...s, STORE_EMAIL: e.target.value }))}
                placeholder="hello@yourstore.com" className={inputCls} />
            </div>
            <div>
              <FieldLabel>Phone</FieldLabel>
              <input value={store.STORE_PHONE} onChange={e => setStore(s => ({ ...s, STORE_PHONE: e.target.value }))}
                placeholder="+977 98XXXXXXXX" className={inputCls} />
            </div>
            <div>
              <FieldLabel>Address</FieldLabel>
              <input value={store.STORE_ADDRESS} onChange={e => setStore(s => ({ ...s, STORE_ADDRESS: e.target.value }))}
                placeholder="Kathmandu, Nepal" className={inputCls} />
            </div>
            <div>
              <FieldLabel>Logo URL (for receipts)</FieldLabel>
              <input value={store.STORE_LOGO_URL} onChange={e => setStore(s => ({ ...s, STORE_LOGO_URL: e.target.value }))}
                placeholder="https://yourdomain.com/logo.png" className={inputCls} />
            </div>
            <div>
              <FieldLabel>Free Delivery Above (NPR)</FieldLabel>
              <input type="number" value={store.FREE_DELIVERY_THRESHOLD}
                onChange={e => setStore(s => ({ ...s, FREE_DELIVERY_THRESHOLD: e.target.value }))}
                placeholder="5000" className={inputCls} />
              <p className="text-[10px] text-slate-400 mt-1">Orders above this amount qualify for free delivery</p>
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-slate-50">
            <SaveBtn section="store" saving={saving} saved={saved} />
          </div>
        </Section>
      </form>

      {/* ── Payment Gateways ──────────────────────────────────────────── */}
      <form onSubmit={e => { e.preventDefault(); save('payment', payment as unknown as Record<string, string>) }}>
        <Section icon={CreditCard} title="Payment Gateways" iconBg="bg-emerald-500"
          badge={
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100">
              DB override — takes precedence over .env
            </span>
          }>
          <div className="flex items-start gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-600 mb-2">
            <Shield size={13} className="shrink-0 mt-0.5 text-slate-400" />
            Keys saved here take precedence over <code className="font-mono bg-white px-1 rounded">.env.local</code> values and are encrypted in the database.
          </div>

          {/* eSewa */}
          <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                  <span className="text-[10px] font-extrabold text-green-700">eS</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">eSewa</p>
                  <p className="text-[10px] text-slate-400">merchant.esewa.com.np → API</p>
                </div>
              </div>
              <a href="https://merchant.esewa.com.np" target="_blank" rel="noopener"
                className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <ExternalLink size={13} />
              </a>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Merchant ID</FieldLabel>
                <input value={payment.ESEWA_MERCHANT_ID}
                  onChange={e => setPayment(p => ({ ...p, ESEWA_MERCHANT_ID: e.target.value }))}
                  placeholder="EPAYTEST" className={inputCls} />
              </div>
              <SecretInput label="Secret Key" value={payment.ESEWA_SECRET_KEY}
                onChange={v => setPayment(p => ({ ...p, ESEWA_SECRET_KEY: v }))}
                placeholder="8gBm/:&EnhH.1/q" />
            </div>
          </div>

          {/* Khalti */}
          <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                  <span className="text-[10px] font-extrabold text-purple-700">K</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Khalti</p>
                  <p className="text-[10px] text-slate-400">admin.khalti.com → Merchant → API Keys</p>
                </div>
              </div>
              <a href="https://admin.khalti.com" target="_blank" rel="noopener"
                className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <ExternalLink size={13} />
              </a>
            </div>
            <SecretInput label="Secret Key" value={payment.KHALTI_SECRET_KEY}
              onChange={v => setPayment(p => ({ ...p, KHALTI_SECRET_KEY: v }))}
              placeholder="live_secret_key_..." hint="Use live_ prefix for production, test_secret_key_ for sandbox" />
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-50">
            <SaveBtn section="payment" saving={saving} saved={saved} />
          </div>
        </Section>
      </form>

      {/* ── Delivery ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
              <Truck size={15} className="text-white" />
            </div>
            <h2 className="font-heading font-bold text-slate-800 text-sm">Delivery — Pathao</h2>
          </div>
        </div>
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-600">Configure Pathao API credentials, pickup location, and delivery zones.</p>
            <p className="text-xs text-slate-400 mt-0.5">Changes take effect immediately without a server restart.</p>
          </div>
          <Link href="/admin/logistics"
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors cursor-pointer shrink-0 shadow-md shadow-primary/15">
            Open Logistics <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      {/* ── AI Configuration ──────────────────────────────────────────── */}
      <form onSubmit={e => { e.preventDefault(); save('ai', ai as unknown as Record<string, string>) }}>
        <Section icon={Sparkles} title="AI Configuration" iconBg="bg-violet-500">
          <div className="flex items-start gap-3 px-4 py-3 bg-violet-50 border border-violet-100 rounded-2xl text-xs text-violet-700 mb-2">
            <Sparkles size={13} className="shrink-0 mt-0.5" />
            Keys are stored in the database and never sent to the browser. They take effect immediately.
          </div>

          {/* Anthropic */}
          <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <span className="text-[10px] font-extrabold text-violet-700">A</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Anthropic (Claude)</p>
                  <p className="text-[10px] text-slate-400">console.anthropic.com → API Keys</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => testKey('claude')}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold rounded-lg transition-colors cursor-pointer">
                  <RefreshCw size={11} /> Test
                </button>
                <a href="https://console.anthropic.com" target="_blank" rel="noopener"
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"><ExternalLink size={13} /></a>
              </div>
            </div>
            <SecretInput label="API Key" value={ai.ANTHROPIC_API_KEY}
              onChange={v => setAi(a => ({ ...a, ANTHROPIC_API_KEY: v }))}
              placeholder="sk-ant-api03-..."
              hint="Models: claude-haiku-4-5 (fast) · claude-sonnet-4-6 (smart)"
              testStatus={testStatus['ANTHROPIC_API_KEY'] as 'idle' | 'ok' | 'fail' | 'testing' ?? 'idle'} />
          </div>

          {/* Gemini */}
          <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <span className="text-[10px] font-extrabold text-blue-700">G</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Google Gemini</p>
                  <p className="text-[10px] text-slate-400">aistudio.google.com → Get API key</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => testKey('gemini')}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors cursor-pointer">
                  <RefreshCw size={11} /> Test
                </button>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener"
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"><ExternalLink size={13} /></a>
              </div>
            </div>
            <SecretInput label="API Key" value={ai.GEMINI_API_KEY}
              onChange={v => setAi(a => ({ ...a, GEMINI_API_KEY: v }))}
              placeholder="AIzaSy..."
              hint="Free tier: 60 req/min. Models: Gemini 2.0 Flash · Flash Lite · Pro 2.5"
              testStatus={testStatus['GEMINI_API_KEY'] as 'idle' | 'ok' | 'fail' | 'testing' ?? 'idle'} />
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-50">
            <SaveBtn section="ai" saving={saving} saved={saved} />
          </div>
        </Section>
      </form>

      {/* ── Notifications ─────────────────────────────────────────────── */}
      <form onSubmit={e => { e.preventDefault(); save('notif', notif as unknown as Record<string, string>) }}>
        <Section icon={Bell} title="Notifications" iconBg="bg-amber-500">
          <div>
            <FieldLabel>Order Notification Email</FieldLabel>
            <input type="email" value={notif.ORDER_NOTIFICATION_EMAIL}
              onChange={e => setNotif({ ORDER_NOTIFICATION_EMAIL: e.target.value })}
              placeholder="admin@yourstore.com" className={inputCls} />
            <p className="text-[10px] text-slate-400 mt-1">Receive an email when a new order is placed</p>
          </div>
          <div className="flex justify-end pt-2 border-t border-slate-50">
            <SaveBtn section="notif" saving={saving} saved={saved} />
          </div>
        </Section>
      </form>

      {/* ── Danger Zone ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-red-50">
          <div className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center">
            <Shield size={15} className="text-white" />
          </div>
          <h2 className="font-heading font-bold text-slate-800 text-sm">Danger Zone</h2>
        </div>
        <div className="divide-y divide-red-50">
          <div className="p-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-slate-800 text-sm">Clear all orders</p>
              <p className="text-xs text-slate-400 mt-0.5">Permanently delete all orders and order items. Cannot be undone.</p>
            </div>
            <button
              onClick={async () => {
                if (!confirm('Delete ALL orders permanently? This cannot be undone.')) return
                const res = await fetch('/api/admin/products/all', { method: 'DELETE' })
                if (res.ok) alert('All orders cleared.')
                else alert('Failed to clear orders.')
              }}
              className="px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0">
              Clear Orders
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
