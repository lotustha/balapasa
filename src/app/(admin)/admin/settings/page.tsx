'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Settings, Store, Bell, Shield, Sparkles, CreditCard, Truck,
  Save, Loader2, CheckCircle2, Eye, EyeOff,
  ExternalLink, AlertCircle, RefreshCw, ChevronRight, Upload, Palette,
} from 'lucide-react'
import { STORE_NAME } from '@/lib/config'
import { THEMES, applyTheme } from '@/components/layout/ThemeApplicator'

// ── Types ─────────────────────────────────────────────────────────────────

interface StoreForm {
  STORE_NAME: string; STORE_EMAIL: string; STORE_PHONE: string
  STORE_ADDRESS: string; FREE_DELIVERY_THRESHOLD: string; STORE_LOGO_URL: string
  STORE_THEME: string
}
interface PaymentForm { ESEWA_MERCHANT_ID: string; ESEWA_SECRET_KEY: string; KHALTI_SECRET_KEY: string }
interface NotifForm   { ORDER_NOTIFICATION_EMAIL: string }
interface AIForm      { ANTHROPIC_API_KEY: string; GEMINI_API_KEY: string }

type TabId = 'store' | 'payments' | 'delivery' | 'ai' | 'notifications' | 'danger'

// ── Primitives ─────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{children}</label>
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{children}</p>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <div className="w-0.5 h-4 rounded-full bg-primary" />
      <h3 className="font-heading font-bold text-slate-800 text-sm uppercase tracking-wide">{children}</h3>
    </div>
  )
}

function SecretInput({ label, value, onChange, placeholder, hint, testStatus }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder: string; hint?: string; testStatus?: 'idle' | 'ok' | 'fail' | 'testing'
}) {
  const [show, setShow] = useState(false)
  const isMasked = value.startsWith('••')
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <input type={show || isMasked ? 'text' : 'password'} value={value}
          onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`${inputCls} pr-20 font-mono`} />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {testStatus === 'ok'      && <CheckCircle2 size={14} className="text-green-500" />}
          {testStatus === 'fail'    && <AlertCircle  size={14} className="text-red-500"   />}
          {testStatus === 'testing' && <Loader2      size={14} className="animate-spin text-slate-400" />}
          <button type="button" onClick={() => setShow(s => !s)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>
      {hint && <Hint>{hint}</Hint>}
      {isMasked && <p className="text-[10px] text-amber-600 mt-1">A key is set. Type a new value to replace it.</p>}
    </div>
  )
}

function SaveBtn({ section, saving, saved }: { section: string; saving: string | null; saved: string | null }) {
  return (
    <button type="submit" disabled={saving === section}
      className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-md shadow-primary/15">
      {saving === section
        ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
        : saved === section
        ? <><CheckCircle2 size={14} /> Saved!</>
        : <><Save size={14} /> Save changes</>}
    </button>
  )
}

function InfoBanner({ icon: Icon, color, children }: { icon: typeof Sparkles; color: string; children: React.ReactNode }) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl text-xs mb-5 ${color}`}>
      <Icon size={13} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

// ── Tabs config ────────────────────────────────────────────────────────────

const TABS: { id: TabId; icon: typeof Settings; label: string; desc: string }[] = [
  { id: 'store',         icon: Store,      label: 'Store',         desc: 'Name, contact & delivery' },
  { id: 'payments',      icon: CreditCard, label: 'Payments',      desc: 'eSewa & Khalti keys'       },
  { id: 'delivery',      icon: Truck,      label: 'Delivery',      desc: 'Pathao & logistics'        },
  { id: 'ai',            icon: Sparkles,   label: 'AI',            desc: 'Anthropic & Gemini'        },
  { id: 'notifications', icon: Bell,       label: 'Notifications', desc: 'Email alerts'              },
  { id: 'danger',        icon: Shield,     label: 'Danger Zone',   desc: 'Destructive actions'       },
]

// ── Logo uploader ─────────────────────────────────────────────────────────

function LogoUploader({ url, onChange }: { url: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { 'content-type': file.type },
        body: await file.arrayBuffer(),
      })
      const data = await res.json()
      if (res.ok && data.url) onChange(data.url)
    } catch {}
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <Label>Store Logo</Label>
      <div className="flex items-center gap-4 mt-1">
        {/* Preview */}
        <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
          {url ? (
            <Image src={url} alt="Store logo" width={80} height={80} className="object-contain w-full h-full p-1" />
          ) : (
            <Upload size={20} className="text-slate-300" />
          )}
        </div>
        {/* Actions */}
        <div className="flex-1">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50">
            {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><Upload size={14} /> Upload logo</>}
          </button>
          <p className="text-[10px] text-slate-400 mt-1.5">PNG or SVG recommended · max 2MB</p>
          {url && (
            <input value={url} onChange={e => onChange(e.target.value)}
              placeholder="or paste URL…"
              className="mt-2 w-full px-3 py-1.5 text-[11px] font-mono border border-slate-100 rounded-lg bg-white text-slate-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/10" />
          )}
        </div>
      </div>
      <Hint>Used in shipping labels and email receipts</Hint>
    </div>
  )
}

// ── Delivery settings panel (embedded logistics config) ───────────────────

interface ProviderRow {
  provider: string; isActive: boolean; isMock: boolean
  clientId?: string; clientSecret?: string; apiKey?: string; apiSecret?: string
  storeId?: string; storeName?: string; storePhone?: string; storeAddress?: string
  storeLat?: number | null; storeLng?: number | null; baseUrl?: string; notes?: string
}

const PATHAO_DEFAULTS: ProviderRow = {
  provider: 'PATHAO', isActive: true, isMock: true,
  clientId: 'dev_5e5612b011f438ca5b30a2d6', clientSecret: 'F62z4qB1IazJzzgMYhKyBpdRWWRoAiikbQdR-SDrYdI',
  storeId: 'MROQI3O9', storeName: '', storePhone: '',
  storeAddress: '', baseUrl: 'https://enterprise-api.pathao.com',
}
const PND_DEFAULTS: ProviderRow = {
  provider: 'PICKNDROP', isActive: true, isMock: false,
  apiKey: '', apiSecret: '', baseUrl: 'https://app-t.pickndropnepal.com',
}

function DeliverySettingsPanel() {
  const [pathao,  setPathao]  = useState<ProviderRow>(PATHAO_DEFAULTS)
  const [pnd,     setPnd]     = useState<ProviderRow>(PND_DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState<string | null>(null)
  const [saved,   setSaved]   = useState<string | null>(null)
  const [err,     setErr]     = useState('')

  useEffect(() => {
    fetch('/api/admin/logistics').then(r => r.json()).then(j => {
      const rows: ProviderRow[] = j.settings ?? []
      const p = rows.find(r => r.provider === 'PATHAO')
      const d = rows.find(r => r.provider === 'PICKNDROP')
      if (p) setPathao({ ...PATHAO_DEFAULTS, ...p })
      if (d) setPnd({ ...PND_DEFAULTS, ...d })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function saveProvider(data: ProviderRow) {
    setSaving(data.provider); setErr('')
    try {
      const res = await fetch('/api/admin/logistics', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(await res.text())
      setSaved(data.provider); setTimeout(() => setSaved(null), 3000)
    } catch (e) { setErr(String(e)) }
    setSaving(null)
  }

  if (loading) return <div className="bg-white rounded-2xl border border-slate-100 h-48 animate-pulse" />

  const fieldCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

  function ProviderSaveBtn({ provider }: { provider: string }) {
    return (
      <button onClick={() => saveProvider(provider === 'PATHAO' ? pathao : pnd)}
        disabled={saving === provider}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shadow-md shadow-primary/15">
        {saving === provider ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
          : saved === provider ? <><CheckCircle2 size={14} /> Saved!</>
          : <><Save size={14} /> Save</>}
      </button>
    )
  }

  return (
    <div className="space-y-6">
      {err && <p className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{err}</p>}

      {/* Pathao */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
              <Truck size={16} className="text-orange-500" />
            </div>
            <div>
              <p className="font-bold text-slate-800">Pathao Enterprise</p>
              <p className="text-[10px] text-slate-400">{pathao.baseUrl}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPathao(p => ({ ...p, isActive: !p.isActive }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${pathao.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {pathao.isActive ? 'Active' : 'Disabled'}
            </button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {/* Mock toggle */}
          <div className="flex items-start justify-between p-4 rounded-xl bg-amber-50 border border-amber-100">
            <div>
              <p className="text-sm font-bold text-amber-800">Mock / Test Mode</p>
              <p className="text-xs text-amber-600 mt-0.5">Returns simulated delivery options without calling live Pathao API.</p>
            </div>
            <button onClick={() => setPathao(p => ({ ...p, isMock: !p.isMock }))}
              className={`shrink-0 ml-4 w-11 h-6 rounded-full transition-colors cursor-pointer relative ${pathao.isMock ? 'bg-amber-400' : 'bg-green-500'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pathao.isMock ? 'translate-x-0.5' : 'translate-x-5'}`} />
            </button>
          </div>

          <SectionTitle>Credentials</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Client ID</Label>
              <input value={pathao.clientId ?? ''} onChange={e => setPathao(p => ({ ...p, clientId: e.target.value }))} className={fieldCls} placeholder="dev_..." />
            </div>
            <div>
              <Label>Client Secret</Label>
              <input type="password" value={pathao.clientSecret ?? ''} onChange={e => setPathao(p => ({ ...p, clientSecret: e.target.value }))} className={fieldCls} />
            </div>
            <div>
              <Label>Store ID</Label>
              <input value={pathao.storeId ?? ''} onChange={e => setPathao(p => ({ ...p, storeId: e.target.value }))} className={fieldCls} placeholder="MROQI3O9" />
            </div>
            <div>
              <Label>Base URL</Label>
              <input value={pathao.baseUrl ?? ''} onChange={e => setPathao(p => ({ ...p, baseUrl: e.target.value }))} className={fieldCls} />
            </div>
          </div>

          <SectionTitle>Pickup Details</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Store Name</Label><input value={pathao.storeName ?? ''} onChange={e => setPathao(p => ({ ...p, storeName: e.target.value }))} className={fieldCls} /></div>
            <div><Label>Store Phone</Label><input value={pathao.storePhone ?? ''} onChange={e => setPathao(p => ({ ...p, storePhone: e.target.value }))} className={fieldCls} /></div>
            <div className="sm:col-span-2"><Label>Store Address</Label><input value={pathao.storeAddress ?? ''} onChange={e => setPathao(p => ({ ...p, storeAddress: e.target.value }))} className={fieldCls} /></div>
            <div><Label>Latitude</Label><input type="number" value={pathao.storeLat ?? ''} onChange={e => setPathao(p => ({ ...p, storeLat: parseFloat(e.target.value) }))} className={fieldCls} /></div>
            <div><Label>Longitude</Label><input type="number" value={pathao.storeLng ?? ''} onChange={e => setPathao(p => ({ ...p, storeLng: parseFloat(e.target.value) }))} className={fieldCls} /></div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-50"><ProviderSaveBtn provider="PATHAO" /></div>
        </div>
      </div>

      {/* Pick & Drop */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Bell size={16} className="text-blue-500" />
            </div>
            <div>
              <p className="font-bold text-slate-800">Pick &amp; Drop Nepal</p>
              <p className="text-[10px] text-slate-400">{pnd.baseUrl}</p>
            </div>
          </div>
          <button onClick={() => setPnd(p => ({ ...p, isActive: !p.isActive }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${pnd.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            {pnd.isActive ? 'Active' : 'Disabled'}
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>API Key</Label><input value={pnd.apiKey ?? ''} onChange={e => setPnd(p => ({ ...p, apiKey: e.target.value }))} className={fieldCls} /></div>
            <div><Label>API Secret</Label><input type="password" value={pnd.apiSecret ?? ''} onChange={e => setPnd(p => ({ ...p, apiSecret: e.target.value }))} className={fieldCls} /></div>
            <div className="sm:col-span-2"><Label>Base URL</Label><input value={pnd.baseUrl ?? ''} onChange={e => setPnd(p => ({ ...p, baseUrl: e.target.value }))} className={fieldCls} /></div>
          </div>
          <div className="flex justify-end pt-2 border-t border-slate-50"><ProviderSaveBtn provider="PICKNDROP" /></div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab,        setTab]        = useState<TabId>('store')
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState<string | null>(null)
  const [saved,      setSaved]      = useState<string | null>(null)
  const [saveError,  setSaveError]  = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'ok' | 'fail' | 'testing'>>({})

  const [store, setStore] = useState<StoreForm>({
    STORE_NAME: STORE_NAME, STORE_EMAIL: '', STORE_PHONE: '',
    STORE_ADDRESS: 'Kathmandu, Nepal', FREE_DELIVERY_THRESHOLD: '5000', STORE_LOGO_URL: '', STORE_THEME: 'emerald',
  })
  const [payment, setPayment] = useState<PaymentForm>({ ESEWA_MERCHANT_ID: '', ESEWA_SECRET_KEY: '', KHALTI_SECRET_KEY: '' })
  const [notif,   setNotif]   = useState<NotifForm>({ ORDER_NOTIFICATION_EMAIL: '' })
  const [ai,      setAi]      = useState<AIForm>({ ANTHROPIC_API_KEY: '', GEMINI_API_KEY: '' })

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(({ settings }) => {
      if (!settings) return
      setStore(s  => ({ ...s,
        STORE_NAME:              settings.STORE_NAME              ?? s.STORE_NAME,
        STORE_EMAIL:             settings.STORE_EMAIL             ?? s.STORE_EMAIL,
        STORE_PHONE:             settings.STORE_PHONE             ?? s.STORE_PHONE,
        STORE_ADDRESS:           settings.STORE_ADDRESS           ?? s.STORE_ADDRESS,
        FREE_DELIVERY_THRESHOLD: settings.FREE_DELIVERY_THRESHOLD ?? s.FREE_DELIVERY_THRESHOLD,
        STORE_LOGO_URL:          settings.STORE_LOGO_URL          ?? s.STORE_LOGO_URL,
          STORE_THEME:             settings.STORE_THEME             ?? s.STORE_THEME,
      }))
      setPayment(p => ({
        ESEWA_MERCHANT_ID: settings.ESEWA_MERCHANT_ID ?? p.ESEWA_MERCHANT_ID,
        ESEWA_SECRET_KEY:  settings.ESEWA_SECRET_KEY  ?? p.ESEWA_SECRET_KEY,
        KHALTI_SECRET_KEY: settings.KHALTI_SECRET_KEY ?? p.KHALTI_SECRET_KEY,
      }))
      setNotif({ ORDER_NOTIFICATION_EMAIL: settings.ORDER_NOTIFICATION_EMAIL ?? '' })
      setAi(a => ({
        ANTHROPIC_API_KEY: settings.ANTHROPIC_API_KEY ?? a.ANTHROPIC_API_KEY,
        GEMINI_API_KEY:    settings.GEMINI_API_KEY    ?? a.GEMINI_API_KEY,
      }))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function save(section: string, data: Record<string, string>) {
    setSaving(section); setSaved(null); setSaveError(null)
    try {
      const res  = await fetch('/api/admin/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setSaveError(json.error ?? `HTTP ${res.status}`); setSaving(null); return }
      setSaved(section); setTimeout(() => setSaved(null), 3000)
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

  const activeTab = TABS.find(t => t.id === tab)!

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-primary-bg rounded-2xl flex items-center justify-center">
          <Settings size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Configure your store, integrations, and preferences</p>
        </div>
      </div>

      {/* Error banner */}
      {saveError && (
        <div className="flex items-start gap-2.5 px-4 py-3 mb-6 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <div><p className="font-bold">Save failed</p><p className="text-xs mt-0.5 font-mono">{saveError}</p></div>
        </div>
      )}

      {/* Settings layout: sidebar + panel */}
      <div className="flex gap-6 items-start">

        {/* ── Left sidebar ──────────────────────────────────────────── */}
        <nav className="w-52 shrink-0 bg-white rounded-2xl border border-slate-100 overflow-hidden sticky top-6">
          {TABS.map(t => {
            const Icon    = t.icon
            const isActive = tab === t.id
            const isDanger = t.id === 'danger'
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150 cursor-pointer relative ${
                  isActive
                    ? isDanger
                      ? 'bg-red-50 text-red-600'
                      : 'bg-primary-bg text-primary'
                    : isDanger
                    ? 'text-red-400 hover:bg-red-50 hover:text-red-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}>
                {isActive && (
                  <span className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full ${isDanger ? 'bg-red-500' : 'bg-primary'}`} />
                )}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isActive
                    ? isDanger ? 'bg-red-100' : 'bg-primary/15'
                    : 'bg-slate-100'
                }`}>
                  <Icon size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-none">{t.label}</p>
                  <p className={`text-[10px] mt-0.5 truncate ${isActive ? 'opacity-70' : 'text-slate-400'}`}>{t.desc}</p>
                </div>
              </button>
            )
          })}
        </nav>

        {/* ── Right panel ───────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Panel header */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
            <span>Settings</span>
            <ChevronRight size={12} />
            <span className="text-slate-600 font-semibold">{activeTab.label}</span>
          </div>

          {/* ── Store tab ─────────────────────────────────────────── */}
          {tab === 'store' && (
            <form onSubmit={e => { e.preventDefault(); save('store', store as unknown as Record<string, string>) }}>
              <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
                <SectionTitle>Store Identity</SectionTitle>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Store Name</Label>
                    <input value={store.STORE_NAME} onChange={e => setStore(s => ({ ...s, STORE_NAME: e.target.value }))}
                      placeholder="Your Store" className={inputCls} />
                  </div>
                  <div>
                    <Label>Store Email</Label>
                    <input type="email" value={store.STORE_EMAIL} onChange={e => setStore(s => ({ ...s, STORE_EMAIL: e.target.value }))}
                      placeholder="hello@store.com" className={inputCls} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <input value={store.STORE_PHONE} onChange={e => setStore(s => ({ ...s, STORE_PHONE: e.target.value }))}
                      placeholder="+977 98XXXXXXXX" className={inputCls} />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <input value={store.STORE_ADDRESS} onChange={e => setStore(s => ({ ...s, STORE_ADDRESS: e.target.value }))}
                      placeholder="Kathmandu, Nepal" className={inputCls} />
                  </div>
                </div>

                <div className="border-t border-slate-50 pt-5">
                  <SectionTitle>Branding & Commerce</SectionTitle>

                  {/* Logo upload */}
                  <LogoUploader
                    url={store.STORE_LOGO_URL}
                    onChange={url => setStore(s => ({ ...s, STORE_LOGO_URL: url }))}
                  />

                  <div className="mt-4">
                    <Label>Free Delivery Above (NPR)</Label>
                    <input type="number" min="0" value={store.FREE_DELIVERY_THRESHOLD}
                      onChange={e => setStore(s => ({ ...s, FREE_DELIVERY_THRESHOLD: e.target.value }))}
                      placeholder="5000" className={inputCls + ' max-w-xs'} />
                    <Hint>Orders at or above this amount get free delivery</Hint>
                  </div>
                </div>

                {/* Theme picker */}
                <div className="border-t border-slate-50 pt-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-0.5 h-4 rounded-full bg-primary" />
                    <h3 className="font-heading font-bold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-1.5">
                      <Palette size={14} className="text-primary" /> Theme Color
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(THEMES).map(([key, t]) => (
                      <button key={key} type="button"
                        onClick={() => { setStore(s => ({ ...s, STORE_THEME: key })); applyTheme(key) }}
                        title={t.name}
                        className={`group flex flex-col items-center gap-1.5 cursor-pointer`}>
                        <div className={`w-10 h-10 rounded-2xl transition-all ${store.STORE_THEME === key ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-105'}`}
                          style={{ background: t.primary, ringColor: t.primary }}>
                          {store.STORE_THEME === key && (
                            <div className="w-full h-full flex items-center justify-center">
                              <CheckCircle2 size={16} className="text-white" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500">{t.name}</span>
                      </button>
                    ))}
                  </div>
                  <Hint>Theme color applies to buttons, links, and accent elements across the store.</Hint>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-50">
                  <SaveBtn section="store" saving={saving} saved={saved} />
                </div>
              </div>
            </form>
          )}

          {/* ── Payments tab ──────────────────────────────────────── */}
          {tab === 'payments' && (
            <form onSubmit={e => { e.preventDefault(); save('payment', payment as unknown as Record<string, string>) }}>
              <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
                <InfoBanner icon={Shield} color="bg-slate-50 border border-slate-100 text-slate-600">
                  Keys saved here are masked in the UI and override <code className="font-mono bg-white px-1 rounded text-[10px]">.env.local</code> values. They take effect immediately.
                </InfoBanner>

                {/* eSewa */}
                <div>
                  <SectionTitle>eSewa</SectionTitle>
                  <div className="border border-slate-100 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
                          <span className="text-xs font-extrabold text-green-700">eS</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">eSewa Nepal</p>
                          <p className="text-[10px] text-slate-400">merchant.esewa.com.np</p>
                        </div>
                      </div>
                      <a href="https://merchant.esewa.com.np" target="_blank" rel="noopener"
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-primary cursor-pointer transition-colors">
                        Dashboard <ExternalLink size={11} />
                      </a>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Merchant ID</Label>
                        <input value={payment.ESEWA_MERCHANT_ID}
                          onChange={e => setPayment(p => ({ ...p, ESEWA_MERCHANT_ID: e.target.value }))}
                          placeholder="EPAYTEST" className={inputCls} />
                      </div>
                      <SecretInput label="Secret Key" value={payment.ESEWA_SECRET_KEY}
                        onChange={v => setPayment(p => ({ ...p, ESEWA_SECRET_KEY: v }))}
                        placeholder="8gBm/:&EnhH.1/q" />
                    </div>
                  </div>
                </div>

                {/* Khalti */}
                <div>
                  <SectionTitle>Khalti</SectionTitle>
                  <div className="border border-slate-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
                          <span className="text-xs font-extrabold text-purple-700">K</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Khalti Digital Wallet</p>
                          <p className="text-[10px] text-slate-400">admin.khalti.com → Merchant → API Keys</p>
                        </div>
                      </div>
                      <a href="https://admin.khalti.com" target="_blank" rel="noopener"
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-primary cursor-pointer transition-colors">
                        Dashboard <ExternalLink size={11} />
                      </a>
                    </div>
                    <SecretInput label="Secret Key" value={payment.KHALTI_SECRET_KEY}
                      onChange={v => setPayment(p => ({ ...p, KHALTI_SECRET_KEY: v }))}
                      placeholder="live_secret_key_..."
                      hint="Use live_ prefix for production, test_secret_key_ for sandbox" />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-50">
                  <SaveBtn section="payment" saving={saving} saved={saved} />
                </div>
              </div>
            </form>
          )}

          {/* ── Delivery tab ──────────────────────────────────────── */}
          {tab === 'delivery' && (
            <DeliverySettingsPanel />
          )}

          {/* ── AI tab ────────────────────────────────────────────── */}
          {tab === 'ai' && (
            <form onSubmit={e => { e.preventDefault(); save('ai', ai as unknown as Record<string, string>) }}>
              <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
                <InfoBanner icon={Sparkles} color="bg-violet-50 border border-violet-100 text-violet-700">
                  Keys are stored encrypted in the database and never sent to the browser. They power product tag generation, image descriptions, and AI-assisted features.
                </InfoBanner>

                {/* Anthropic */}
                <div>
                  <SectionTitle>Anthropic (Claude)</SectionTitle>
                  <div className="border border-slate-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                          <span className="text-xs font-extrabold text-violet-700">A</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Anthropic</p>
                          <p className="text-[10px] text-slate-400">console.anthropic.com → API Keys</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => testKey('claude')}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold rounded-lg transition-colors cursor-pointer">
                          <RefreshCw size={11} /> Test
                        </button>
                        <a href="https://console.anthropic.com" target="_blank" rel="noopener"
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-primary cursor-pointer transition-colors">
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                    <SecretInput label="API Key" value={ai.ANTHROPIC_API_KEY}
                      onChange={v => setAi(a => ({ ...a, ANTHROPIC_API_KEY: v }))}
                      placeholder="sk-ant-api03-..."
                      hint="claude-haiku-4-5 (fast) · claude-sonnet-4-6 (smart)"
                      testStatus={testStatus['ANTHROPIC_API_KEY'] as 'idle'|'ok'|'fail'|'testing' ?? 'idle'} />
                  </div>
                </div>

                {/* Gemini */}
                <div>
                  <SectionTitle>Google Gemini</SectionTitle>
                  <div className="border border-slate-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                          <span className="text-xs font-extrabold text-blue-700">G</span>
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
                          className="text-slate-400 hover:text-primary cursor-pointer transition-colors">
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                    <SecretInput label="API Key" value={ai.GEMINI_API_KEY}
                      onChange={v => setAi(a => ({ ...a, GEMINI_API_KEY: v }))}
                      placeholder="AIzaSy..."
                      hint="Free tier: 60 req/min. Gemini 2.0 Flash · Flash Lite · Pro 2.5"
                      testStatus={testStatus['GEMINI_API_KEY'] as 'idle'|'ok'|'fail'|'testing' ?? 'idle'} />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-50">
                  <SaveBtn section="ai" saving={saving} saved={saved} />
                </div>
              </div>
            </form>
          )}

          {/* ── Notifications tab ─────────────────────────────────── */}
          {tab === 'notifications' && (
            <form onSubmit={e => { e.preventDefault(); save('notif', notif as unknown as Record<string, string>) }}>
              <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
                <SectionTitle>Email Alerts</SectionTitle>
                <div className="max-w-md">
                  <Label>Order Notification Email</Label>
                  <input type="email" value={notif.ORDER_NOTIFICATION_EMAIL}
                    onChange={e => setNotif({ ORDER_NOTIFICATION_EMAIL: e.target.value })}
                    placeholder="admin@yourstore.com" className={inputCls} />
                  <Hint>Receive an email whenever a new order is placed. Leave empty to disable.</Hint>
                </div>
                <div className="flex justify-end pt-2 border-t border-slate-50">
                  <SaveBtn section="notif" saving={saving} saved={saved} />
                </div>
              </div>
            </form>
          )}

          {/* ── Danger tab ────────────────────────────────────────── */}
          {tab === 'danger' && (
            <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-red-50 bg-red-50/50">
                <p className="text-sm font-bold text-red-700">These actions are permanent and cannot be undone.</p>
                <p className="text-xs text-red-500 mt-0.5">Proceed only if you are absolutely sure.</p>
              </div>
              <div className="divide-y divide-red-50">
                <div className="p-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Clear all orders</p>
                    <p className="text-xs text-slate-400 mt-0.5">Permanently delete all orders and order items from the database.</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm('Delete ALL orders permanently? This cannot be undone.')) return
                      const res = await fetch('/api/admin/products/all', { method: 'DELETE' })
                      alert(res.ok ? 'All orders cleared.' : 'Failed.')
                    }}
                    className="shrink-0 px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 font-bold text-xs rounded-xl transition-colors cursor-pointer">
                    Clear Orders
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
