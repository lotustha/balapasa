'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Settings, Store, Bell, Shield, Sparkles, CreditCard, Truck,
  Save, Loader2, CheckCircle2, Eye, EyeOff,
  ExternalLink, AlertCircle, RefreshCw, ChevronRight, Upload, Palette,
  MessageCircle, LayoutTemplate, ShieldCheck, Star, Zap, Trash2, Plus,
} from 'lucide-react'
import { STORE_NAME } from '@/lib/config'
import { THEMES, applyTheme } from '@/components/layout/ThemeApplicator'
import { HERO_DEFAULTS, type HeroBadge } from '@/lib/site-settings-shared'

// ── Types ─────────────────────────────────────────────────────────────────

interface StoreForm {
  STORE_NAME: string; STORE_EMAIL: string; STORE_PHONE: string
  STORE_ADDRESS: string; FREE_DELIVERY_THRESHOLD: string; STORE_LOGO_URL: string
  STORE_THEME: string; STORE_FAVICON_URL: string
  STORE_URL: string
  SEO_TITLE: string; SEO_DESCRIPTION: string; SEO_KEYWORDS: string
}
interface PaymentForm { ESEWA_MERCHANT_ID: string; ESEWA_SECRET_KEY: string; KHALTI_SECRET_KEY: string }
interface NotifForm   { ORDER_NOTIFICATION_EMAIL: string }
interface AIForm      { ANTHROPIC_API_KEY: string; GEMINI_API_KEY: string }

type TabId = 'store' | 'homepage' | 'payments' | 'delivery' | 'ai' | 'notifications' | 'messaging' | 'danger'

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
  { id: 'store',         icon: Store,           label: 'Store',         desc: 'Name, contact & delivery' },
  { id: 'homepage',      icon: LayoutTemplate,  label: 'Homepage',      desc: 'Hero, headline & CTAs'    },
  { id: 'payments',      icon: CreditCard, label: 'Payments',      desc: 'eSewa & Khalti keys'       },
  { id: 'delivery',      icon: Truck,      label: 'Delivery',      desc: 'Pathao & logistics'        },
  { id: 'ai',            icon: Sparkles,   label: 'AI',            desc: 'Anthropic & Gemini'        },
  { id: 'notifications', icon: Bell,          label: 'Notifications', desc: 'Email alerts'              },
  { id: 'messaging',     icon: MessageCircle, label: 'Messaging',     desc: 'WhatsApp & Facebook'       },
  { id: 'danger',        icon: Shield,        label: 'Danger Zone',   desc: 'Destructive actions'       },
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

function FaviconUploader({ url, onChange }: { url: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const res = await fetch('/api/upload/image', {
        method: 'POST', headers: { 'content-type': file.type }, body: await file.arrayBuffer(),
      })
      const data = await res.json()
      if (res.ok && data.url) onChange(data.url)
    } catch {}
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex-1 space-y-2">
      <input ref={fileRef} type="file" accept="image/png,image/x-icon,image/svg+xml,image/jpeg" className="hidden" onChange={handleFile} />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
        className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50">
        {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><Upload size={14} /> Upload favicon</>}
      </button>
      {url && (
        <input value={url} onChange={e => onChange(e.target.value)} placeholder="or paste URL…"
          className="w-full px-3 py-1.5 text-[11px] font-mono border border-slate-100 rounded-lg bg-white text-slate-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/10" />
      )}
    </div>
  )
}

// ── Messaging settings panel ──────────────────────────────────────────────

function MessagingSettingsPanel({
  saving, saved, onSave,
}: { saving: string | null; saved: string | null; onSave: (s: string, d: Record<string, string>) => void }) {
  const [chat, setChat] = useState({ WHATSAPP_NUMBER: '' })
  const [wa, setWa] = useState({
    WHATSAPP_PHONE_NUMBER_ID: '', WHATSAPP_ACCESS_TOKEN: '',
    WHATSAPP_BUSINESS_ACCOUNT_ID: '', WHATSAPP_WEBHOOK_VERIFY_TOKEN: '',
  })
  const [fb, setFb] = useState({
    FACEBOOK_PAGE_ID: '', FACEBOOK_PAGE_ACCESS_TOKEN: '', FACEBOOK_PIXEL_ID: '',
  })
  const fieldCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(({ settings: s }) => {
      if (!s) return
      setChat(v => ({ WHATSAPP_NUMBER: s.WHATSAPP_NUMBER ?? v.WHATSAPP_NUMBER }))
      setWa(v => ({
        WHATSAPP_PHONE_NUMBER_ID:     s.WHATSAPP_PHONE_NUMBER_ID     ?? v.WHATSAPP_PHONE_NUMBER_ID,
        WHATSAPP_ACCESS_TOKEN:        s.WHATSAPP_ACCESS_TOKEN        ?? v.WHATSAPP_ACCESS_TOKEN,
        WHATSAPP_BUSINESS_ACCOUNT_ID: s.WHATSAPP_BUSINESS_ACCOUNT_ID ?? v.WHATSAPP_BUSINESS_ACCOUNT_ID,
        WHATSAPP_WEBHOOK_VERIFY_TOKEN:s.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? v.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
      }))
      setFb(v => ({
        FACEBOOK_PAGE_ID:           s.FACEBOOK_PAGE_ID           ?? v.FACEBOOK_PAGE_ID,
        FACEBOOK_PAGE_ACCESS_TOKEN: s.FACEBOOK_PAGE_ACCESS_TOKEN ?? v.FACEBOOK_PAGE_ACCESS_TOKEN,
        FACEBOOK_PIXEL_ID:          s.FACEBOOK_PIXEL_ID          ?? v.FACEBOOK_PIXEL_ID,
      }))
    }).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      {/* Chat (public-facing) */}
      <form onSubmit={e => { e.preventDefault(); onSave('chat', chat) }}
        className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
            <MessageCircle size={15} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-bold text-slate-800">Customer chat (WhatsApp button)</p>
            <p className="text-[10px] text-slate-400">Floating chat button shown on every page of the storefront</p>
          </div>
        </div>
        <div>
          <Label>Public WhatsApp number</Label>
          <input type="tel" inputMode="numeric"
            value={chat.WHATSAPP_NUMBER}
            onChange={e => setChat({ WHATSAPP_NUMBER: e.target.value })}
            placeholder="977 98XXXXXXXX (with country code, no +)"
            className={fieldCls} />
          <Hint>Used by the floating chat button. Include country code (e.g. 977 for Nepal). Spaces and dashes are stripped automatically.</Hint>
        </div>
        <div className="flex justify-end pt-2 border-t border-slate-50">
          <SaveBtn section="chat" saving={saving} saved={saved} />
        </div>
      </form>

      {/* WhatsApp */}
      <form onSubmit={e => { e.preventDefault(); onSave('whatsapp', wa as unknown as Record<string, string>) }}
        className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-green-600"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
          </div>
          <div>
            <p className="font-bold text-slate-800">WhatsApp Business (Meta Cloud API)</p>
            <a href="https://business.facebook.com" target="_blank" rel="noopener"
              className="text-[10px] text-slate-400 hover:text-primary flex items-center gap-1 cursor-pointer">
              business.facebook.com <ExternalLink size={9} />
            </a>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Phone Number ID</Label>
            <input type="text" inputMode="numeric" value={wa.WHATSAPP_PHONE_NUMBER_ID} onChange={e => setWa(v => ({ ...v, WHATSAPP_PHONE_NUMBER_ID: e.target.value }))} placeholder="e.g. 1135659409632322" className={fieldCls} />
            <Hint>Found in Meta App Dashboard → WhatsApp → API Setup → Phone number ID</Hint></div>
          <div><Label>Business Account ID (WABA ID)</Label>
            <input type="text" inputMode="numeric" value={wa.WHATSAPP_BUSINESS_ACCOUNT_ID} onChange={e => setWa(v => ({ ...v, WHATSAPP_BUSINESS_ACCOUNT_ID: e.target.value }))} placeholder="e.g. 9876543210" className={fieldCls} />
            <Hint>Found in Meta App Dashboard → WhatsApp → API Setup → WhatsApp Business Account ID</Hint></div>
          <div className="sm:col-span-2"><Label>System User Access Token</Label>
            <SecretInput label="" value={wa.WHATSAPP_ACCESS_TOKEN} onChange={v => setWa(s => ({ ...s, WHATSAPP_ACCESS_TOKEN: v }))} placeholder="EAABm..." hint="Generate in Meta Business Suite → System Users → Generate Token (never expires)" /></div>
          <div><Label>Webhook Verify Token</Label>
            <input value={wa.WHATSAPP_WEBHOOK_VERIFY_TOKEN} onChange={e => setWa(v => ({ ...v, WHATSAPP_WEBHOOK_VERIFY_TOKEN: e.target.value }))} placeholder="my-secret-verify-token" className={fieldCls} />
            <Hint>Register webhook URL: {typeof window !== 'undefined' ? window.location.origin : 'https://balapasa.com'}/api/webhooks/whatsapp</Hint></div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-50">
          <SaveBtn section="whatsapp" saving={saving} saved={saved} />
        </div>
      </form>

      {/* Facebook */}
      <form onSubmit={e => { e.preventDefault(); onSave('facebook', fb as unknown as Record<string, string>) }}
        className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-blue-600"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </div>
          <div>
            <p className="font-bold text-slate-800">Facebook & Messenger</p>
            <p className="text-[10px] text-slate-400">Facebook Pixel, Messenger widget, and Page access</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Facebook Page ID</Label>
            <input value={fb.FACEBOOK_PAGE_ID} onChange={e => setFb(v => ({ ...v, FACEBOOK_PAGE_ID: e.target.value }))} placeholder="12345678901234" className={fieldCls} /></div>
          <div><Label>Facebook Pixel ID</Label>
            <input value={fb.FACEBOOK_PIXEL_ID} onChange={e => setFb(v => ({ ...v, FACEBOOK_PIXEL_ID: e.target.value }))} placeholder="123456789012345" className={fieldCls} /></div>
          <div className="sm:col-span-2">
            <SecretInput label="Page Access Token" value={fb.FACEBOOK_PAGE_ACCESS_TOKEN} onChange={v => setFb(s => ({ ...s, FACEBOOK_PAGE_ACCESS_TOKEN: v }))} placeholder="EAABm..." hint="Grants Messenger send permission. Generate in Meta Business Suite → Your App → Messenger → Page Access Tokens." />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-50">
          <SaveBtn section="facebook" saving={saving} saved={saved} />
        </div>
      </form>

      {/* Catalog info */}
      <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
        <p className="font-bold text-slate-800 text-sm mb-1">Facebook Product Catalog</p>
        <p className="text-xs text-slate-500 mb-3">Register this URL as a data feed in Meta Commerce Manager to sync your products:</p>
        <code className="block px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-primary break-all">
          {typeof window !== 'undefined' ? window.location.origin : 'https://balapasa.com'}/api/facebook/catalog
        </code>
        <p className="text-[10px] text-slate-400 mt-2">Meta will crawl this URL hourly. Requires active products with images.</p>
      </div>
    </div>
  )
}

// ── Delivery settings panel (embedded logistics config) ───────────────────

interface ProviderRow {
  provider: string; isActive: boolean; isMock: boolean
  clientId?: string; clientSecret?: string; apiKey?: string; apiSecret?: string
  storeId?: string; storeName?: string; storePhone?: string; storeAddress?: string
  storeLat?: number | null; storeLng?: number | null; baseUrl?: string; notes?: string
  pickupBranch?: string; pickupArea?: string; pickupLocation?: string
  maxSurgeNpr?: number | null
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
  pickupBranch: 'KATHMANDU VALLEY', pickupArea: 'Kathmandu', pickupLocation: 'Balaju',
  maxSurgeNpr: 0,
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
            <button
              type="button"
              onClick={() => {
                const next = { ...pathao, isActive: !pathao.isActive }
                setPathao(next)
                saveProvider(next)
              }}
              disabled={saving === 'PATHAO'}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 ${pathao.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
              aria-pressed={pathao.isActive}
            >
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
            <button
              type="button"
              role="switch"
              aria-checked={pathao.isMock}
              aria-label="Mock / Test Mode"
              onClick={() => {
                const next = { ...pathao, isMock: !pathao.isMock }
                setPathao(next)
                saveProvider(next)
              }}
              disabled={saving === 'PATHAO'}
              className={`shrink-0 ml-4 w-11 h-6 rounded-full transition-colors cursor-pointer relative disabled:opacity-60 ${pathao.isMock ? 'bg-amber-500' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${pathao.isMock ? 'translate-x-5' : 'translate-x-0.5'}`} />
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
          <button
            type="button"
            onClick={() => {
              const next = { ...pnd, isActive: !pnd.isActive }
              setPnd(next)
              saveProvider(next)
            }}
            disabled={saving === 'PICKNDROP'}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 ${pnd.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
            aria-pressed={pnd.isActive}
          >
            {pnd.isActive ? 'Active' : 'Disabled'}
          </button>
        </div>
        <div className="p-6 space-y-5">
          <SectionTitle>Credentials</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>API Key</Label><input value={pnd.apiKey ?? ''} onChange={e => setPnd(p => ({ ...p, apiKey: e.target.value }))} className={fieldCls} /></div>
            <div><Label>API Secret</Label><input type="password" value={pnd.apiSecret ?? ''} onChange={e => setPnd(p => ({ ...p, apiSecret: e.target.value }))} className={fieldCls} /></div>
            <div className="sm:col-span-2"><Label>Base URL</Label><input value={pnd.baseUrl ?? ''} onChange={e => setPnd(p => ({ ...p, baseUrl: e.target.value }))} className={fieldCls} /></div>
          </div>

          <SectionTitle>Pickup Origin</SectionTitle>
          <p className="text-xs text-slate-500 -mt-2">Sent as <code className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">pickup_branch</code>, <code className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">city_area</code>, and <code className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">location</code> on rate &amp; create_order calls.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Pickup Branch</Label>
              <input value={pnd.pickupBranch ?? ''} onChange={e => setPnd(p => ({ ...p, pickupBranch: e.target.value }))} className={fieldCls} placeholder="KATHMANDU VALLEY" />
            </div>
            <div>
              <Label>City / Area</Label>
              <input value={pnd.pickupArea ?? ''} onChange={e => setPnd(p => ({ ...p, pickupArea: e.target.value }))} className={fieldCls} placeholder="Kathmandu" />
            </div>
            <div>
              <Label>Location</Label>
              <input value={pnd.pickupLocation ?? ''} onChange={e => setPnd(p => ({ ...p, pickupLocation: e.target.value }))} className={fieldCls} placeholder="Balaju" />
            </div>
          </div>

          <SectionTitle>Surge Cap</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Max Surge (NPR)</Label>
              <input
                type="number"
                min={0}
                value={pnd.maxSurgeNpr ?? 0}
                onChange={e => setPnd(p => ({ ...p, maxSurgeNpr: Number(e.target.value) || 0 }))}
                className={fieldCls}
                placeholder="0 = no cap"
              />
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">Caps PnD&apos;s peak-traffic surge passed to customer. Anything above this amount is absorbed by the store. Set to <code className="px-1 bg-slate-100 rounded">0</code> to pass surge through unchanged.</p>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-50"><ProviderSaveBtn provider="PICKNDROP" /></div>
        </div>
      </div>
    </div>
  )
}

// ── Homepage settings panel ───────────────────────────────────────────────

interface HeroForm {
  HERO_BADGE_TEXT: string
  HERO_HEADLINE_1: string
  HERO_HEADLINE_2: string
  HERO_ACCENT_WORD: string
  HERO_TAGLINE: string
  HERO_SUBHEAD: string
  HERO_CTA_PRIMARY_LABEL: string
  HERO_CTA_PRIMARY_URL: string
  HERO_CTA_SECONDARY_LABEL: string
  HERO_CTA_SECONDARY_URL: string
  HERO_BADGES_JSON: string
}

const ICON_CHOICES = [
  { name: 'ShieldCheck', Icon: ShieldCheck },
  { name: 'Truck',       Icon: Truck },
  { name: 'Star',        Icon: Star },
  { name: 'Zap',         Icon: Zap },
  { name: 'Sparkles',    Icon: Sparkles },
] as const

interface HeroPreviewData {
  badgeText: string
  headline1: string
  headline2: string
  accentWord: string
  tagline: string
  subhead: string
  ctaPrimaryLabel: string
  ctaSecondaryLabel: string
  badges: HeroBadge[]
}

function HeroPreview({ hero }: { hero: HeroPreviewData }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur rounded-full mb-4 border border-white shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-pulse" />
        <span className="text-[10px] font-semibold text-slate-700">{hero.badgeText || '—'}</span>
      </div>
      <h2 className="font-heading font-extrabold leading-tight text-slate-900">
        <span className="block text-2xl">{hero.headline1 || '—'}</span>
        <span className="block text-2xl">
          {hero.headline2 || '—'}{' '}
          <span className="bg-gradient-to-r from-amber-500 to-pink-500 bg-clip-text text-transparent">{hero.accentWord || '—'}</span>
        </span>
        {hero.tagline && (
          <span className="block text-base mt-1 text-slate-400 font-medium">{hero.tagline}</span>
        )}
      </h2>
      <p className="mt-3 text-xs text-slate-500 max-w-md leading-relaxed line-clamp-3">{hero.subhead || '—'}</p>
      <div className="flex flex-wrap gap-2 mt-4">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 text-white font-bold text-xs rounded-xl">
          {hero.ctaPrimaryLabel || '—'}
        </span>
        {hero.ctaSecondaryLabel && (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/80 backdrop-blur text-slate-700 font-bold text-xs rounded-xl border border-white">
            {hero.ctaSecondaryLabel}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-4">
        {hero.badges.filter(b => b.text.trim()).map((b, i) => {
          const found = ICON_CHOICES.find(c => c.name === b.icon)
          const Icon = found?.Icon ?? ShieldCheck
          return (
            <div key={i} className="flex items-center gap-1 text-[10px] text-slate-500">
              <Icon size={11} className="text-violet-600" /> {b.text}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HomepageSettingsPanel({ saving, saved, onSave }: {
  saving: string | null; saved: string | null; onSave: (s: string, d: Record<string, string>) => void
}) {
  const [form, setForm] = useState<HeroForm>({
    HERO_BADGE_TEXT:          HERO_DEFAULTS.badgeText,
    HERO_HEADLINE_1:          HERO_DEFAULTS.headline1,
    HERO_HEADLINE_2:          HERO_DEFAULTS.headline2,
    HERO_ACCENT_WORD:         HERO_DEFAULTS.accentWord,
    HERO_TAGLINE:             HERO_DEFAULTS.tagline,
    HERO_SUBHEAD:             HERO_DEFAULTS.subhead,
    HERO_CTA_PRIMARY_LABEL:   HERO_DEFAULTS.ctaPrimaryLabel,
    HERO_CTA_PRIMARY_URL:     HERO_DEFAULTS.ctaPrimaryUrl,
    HERO_CTA_SECONDARY_LABEL: HERO_DEFAULTS.ctaSecondaryLabel,
    HERO_CTA_SECONDARY_URL:   HERO_DEFAULTS.ctaSecondaryUrl,
    HERO_BADGES_JSON:         JSON.stringify(HERO_DEFAULTS.badges),
  })
  const [badges, setBadges] = useState<HeroBadge[]>(HERO_DEFAULTS.badges)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(({ settings: s }) => {
      if (!s) return
      setForm(v => ({
        HERO_BADGE_TEXT:          s.HERO_BADGE_TEXT          ?? v.HERO_BADGE_TEXT,
        HERO_HEADLINE_1:          s.HERO_HEADLINE_1          ?? v.HERO_HEADLINE_1,
        HERO_HEADLINE_2:          s.HERO_HEADLINE_2          ?? v.HERO_HEADLINE_2,
        HERO_ACCENT_WORD:         s.HERO_ACCENT_WORD         ?? v.HERO_ACCENT_WORD,
        HERO_TAGLINE:             s.HERO_TAGLINE             ?? v.HERO_TAGLINE,
        HERO_SUBHEAD:             s.HERO_SUBHEAD             ?? v.HERO_SUBHEAD,
        HERO_CTA_PRIMARY_LABEL:   s.HERO_CTA_PRIMARY_LABEL   ?? v.HERO_CTA_PRIMARY_LABEL,
        HERO_CTA_PRIMARY_URL:     s.HERO_CTA_PRIMARY_URL     ?? v.HERO_CTA_PRIMARY_URL,
        HERO_CTA_SECONDARY_LABEL: s.HERO_CTA_SECONDARY_LABEL ?? v.HERO_CTA_SECONDARY_LABEL,
        HERO_CTA_SECONDARY_URL:   s.HERO_CTA_SECONDARY_URL   ?? v.HERO_CTA_SECONDARY_URL,
        HERO_BADGES_JSON:         s.HERO_BADGES_JSON         ?? v.HERO_BADGES_JSON,
      }))
      if (s.HERO_BADGES_JSON) {
        try {
          const parsed = JSON.parse(s.HERO_BADGES_JSON)
          if (Array.isArray(parsed)) setBadges(parsed.slice(0, 3).map(b => ({ text: String(b.text ?? ''), icon: String(b.icon ?? 'ShieldCheck') })))
        } catch {}
      }
    }).catch(() => {})
  }, [])

  function updateBadge(i: number, patch: Partial<HeroBadge>) {
    setBadges(prev => prev.map((b, idx) => idx === i ? { ...b, ...patch } : b))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanBadges = badges
      .filter(b => b.text.trim())
      .slice(0, 3)
      .map(b => ({ text: b.text.trim(), icon: b.icon }))
    onSave('homepage', { ...form, HERO_BADGES_JSON: JSON.stringify(cleanBadges) })
  }

  // Pad to 3 slots for editing
  const editBadges = [...badges, ...Array(Math.max(0, 3 - badges.length)).fill({ text: '', icon: 'ShieldCheck' })].slice(0, 3)

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
        <InfoBanner icon={LayoutTemplate} color="bg-violet-50 border border-violet-100 text-violet-700">
          Edit the public homepage hero section. Changes take effect immediately for new visitors.
        </InfoBanner>

        {/* Badge */}
        <div>
          <SectionTitle>Hero Badge</SectionTitle>
          <Label>Pill text (above the headline)</Label>
          <input value={form.HERO_BADGE_TEXT} onChange={e => setForm(s => ({ ...s, HERO_BADGE_TEXT: e.target.value }))}
            placeholder="New arrivals every week" className={inputCls} maxLength={60} />
        </div>

        {/* Headline */}
        <div className="border-t border-slate-50 pt-5">
          <SectionTitle>Headline</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Line 1</Label>
              <input value={form.HERO_HEADLINE_1} onChange={e => setForm(s => ({ ...s, HERO_HEADLINE_1: e.target.value }))}
                placeholder="Where Tech" className={inputCls} maxLength={40} />
            </div>
            <div>
              <Label>Line 2</Label>
              <input value={form.HERO_HEADLINE_2} onChange={e => setForm(s => ({ ...s, HERO_HEADLINE_2: e.target.value }))}
                placeholder="Meets" className={inputCls} maxLength={40} />
            </div>
            <div>
              <Label>Accent word (gradient highlight)</Label>
              <input value={form.HERO_ACCENT_WORD} onChange={e => setForm(s => ({ ...s, HERO_ACCENT_WORD: e.target.value }))}
                placeholder="Beauty" className={inputCls} maxLength={20} />
              <Hint>Renders next to Line 2 with the warm gradient effect.</Hint>
            </div>
            <div>
              <Label>Tagline (smaller, optional)</Label>
              <input value={form.HERO_TAGLINE} onChange={e => setForm(s => ({ ...s, HERO_TAGLINE: e.target.value }))}
                placeholder="All in one place." className={inputCls} maxLength={50} />
            </div>
          </div>

          <div className="mt-4">
            <Label>Subhead (paragraph below headline)</Label>
            <textarea value={form.HERO_SUBHEAD} onChange={e => setForm(s => ({ ...s, HERO_SUBHEAD: e.target.value }))}
              rows={3} maxLength={300}
              className={inputCls + ' resize-y'}
              placeholder="Premium electronics, cutting-edge gadgets, and luxe beauty…" />
            <Hint>{form.HERO_SUBHEAD.length}/300 characters</Hint>
          </div>
        </div>

        {/* CTAs */}
        <div className="border-t border-slate-50 pt-5">
          <SectionTitle>Call to Action Buttons</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-3 p-4 rounded-xl bg-violet-50/40 border border-violet-100">
              <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">Primary (filled)</p>
              <div>
                <Label>Button label</Label>
                <input value={form.HERO_CTA_PRIMARY_LABEL} onChange={e => setForm(s => ({ ...s, HERO_CTA_PRIMARY_LABEL: e.target.value }))}
                  placeholder="Shop Now" className={inputCls} maxLength={20} />
              </div>
              <div>
                <Label>Link URL</Label>
                <input value={form.HERO_CTA_PRIMARY_URL} onChange={e => setForm(s => ({ ...s, HERO_CTA_PRIMARY_URL: e.target.value }))}
                  placeholder="/products" className={inputCls + ' font-mono text-xs'} />
              </div>
            </div>

            <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Secondary (outline) — optional</p>
              <div>
                <Label>Button label</Label>
                <input value={form.HERO_CTA_SECONDARY_LABEL} onChange={e => setForm(s => ({ ...s, HERO_CTA_SECONDARY_LABEL: e.target.value }))}
                  placeholder="Featured Picks" className={inputCls} maxLength={20} />
                <Hint>Leave empty to hide the secondary button.</Hint>
              </div>
              <div>
                <Label>Link URL</Label>
                <input value={form.HERO_CTA_SECONDARY_URL} onChange={e => setForm(s => ({ ...s, HERO_CTA_SECONDARY_URL: e.target.value }))}
                  placeholder="/products?featured=true" className={inputCls + ' font-mono text-xs'} />
              </div>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="border-t border-slate-50 pt-5">
          <SectionTitle>Trust Badges</SectionTitle>
          <Hint>Up to 3 small badges below the CTAs. Leave a row empty to hide it.</Hint>
          <div className="space-y-2 mt-3">
            {editBadges.map((b, i) => (
              <div key={i} className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0">#{i + 1}</span>
                <input value={b.text}
                  onChange={e => {
                    const arr = [...editBadges]
                    arr[i] = { ...arr[i], text: e.target.value }
                    setBadges(arr)
                  }}
                  placeholder="Badge text…"
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-primary"
                  maxLength={30} />
                <select value={b.icon}
                  onChange={e => {
                    const arr = [...editBadges]
                    arr[i] = { ...arr[i], icon: e.target.value }
                    setBadges(arr)
                  }}
                  className="px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:border-primary cursor-pointer">
                  {ICON_CHOICES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  {(() => {
                    const found = ICON_CHOICES.find(c => c.name === b.icon)
                    const Icon = found?.Icon ?? ShieldCheck
                    return <Icon size={13} className="text-primary" />
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div className="border-t border-slate-50 pt-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-0.5 h-4 rounded-full bg-primary" />
            <h3 className="font-heading font-bold text-slate-800 text-sm uppercase tracking-wide">Live Preview</h3>
          </div>
          <HeroPreview hero={{
            badgeText: form.HERO_BADGE_TEXT,
            headline1: form.HERO_HEADLINE_1,
            headline2: form.HERO_HEADLINE_2,
            accentWord: form.HERO_ACCENT_WORD,
            tagline: form.HERO_TAGLINE,
            subhead: form.HERO_SUBHEAD,
            ctaPrimaryLabel: form.HERO_CTA_PRIMARY_LABEL,
            ctaSecondaryLabel: form.HERO_CTA_SECONDARY_LABEL,
            badges: editBadges,
          }} />
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-50">
          <SaveBtn section="homepage" saving={saving} saved={saved} />
        </div>
      </div>
    </form>
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
  const [aiSuggesting, setAiSuggesting] = useState(false)
  const [aiError,      setAiError]      = useState<string | null>(null)

  async function suggestSeoWithAI() {
    setAiSuggesting(true)
    setAiError(null)
    try {
      const res = await fetch('/api/admin/ai/seo', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          storeName: store.STORE_NAME,
          storeUrl:  store.STORE_URL,
          niche:     'Electronics, gadgets, skincare and beauty products',
          region:    'Nepal (primary Kathmandu Valley)',
          existing:  {
            title:       store.SEO_TITLE       || undefined,
            description: store.SEO_DESCRIPTION || undefined,
            keywords:    store.SEO_KEYWORDS    || undefined,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.suggestion) {
        setAiError(data.error ?? 'AI suggestion failed')
        return
      }
      setStore(s => ({
        ...s,
        SEO_TITLE:       data.suggestion.title       ?? s.SEO_TITLE,
        SEO_DESCRIPTION: data.suggestion.description ?? s.SEO_DESCRIPTION,
        SEO_KEYWORDS:    data.suggestion.keywords    ?? s.SEO_KEYWORDS,
      }))
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setAiSuggesting(false)
    }
  }

  const [store, setStore] = useState<StoreForm>({
    STORE_NAME: STORE_NAME, STORE_EMAIL: '', STORE_PHONE: '',
    STORE_ADDRESS: 'Kathmandu, Nepal', FREE_DELIVERY_THRESHOLD: '5000', STORE_LOGO_URL: '', STORE_THEME: 'emerald', STORE_FAVICON_URL: '',
    STORE_URL: '',
    SEO_TITLE: '', SEO_DESCRIPTION: '', SEO_KEYWORDS: '',
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
        STORE_FAVICON_URL:       settings.STORE_FAVICON_URL       ?? s.STORE_FAVICON_URL,
        STORE_URL:               settings.STORE_URL               ?? s.STORE_URL,
        SEO_TITLE:               settings.SEO_TITLE               ?? s.SEO_TITLE,
        SEO_DESCRIPTION:         settings.SEO_DESCRIPTION         ?? s.SEO_DESCRIPTION,
        SEO_KEYWORDS:            settings.SEO_KEYWORDS            ?? s.SEO_KEYWORDS,
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
                    <Hint>
                      Use <code className="bg-slate-100 px-1 rounded">|</code> to mark the footer-wordmark accent split.
                      Example: <code className="bg-slate-100 px-1 rounded">Bala|pasa</code> shows as
                      &ldquo;Bala<span className="iridescent-text font-bold">pasa</span>&rdquo; in the footer.
                      The pipe is stripped everywhere else (titles, emails, search results).
                    </Hint>
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

                  {/* Favicon upload */}
                  <div className="mt-5">
                    <Label>Favicon <span className="normal-case font-normal text-slate-400">(browser tab icon · .ico, .png or .svg · 32×32 recommended)</span></Label>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                        {store.STORE_FAVICON_URL
                          ? <img src={store.STORE_FAVICON_URL} alt="Favicon preview" className="w-10 h-10 object-contain" />
                          : <span className="text-[10px] text-slate-400 font-bold text-center leading-tight px-1">No<br/>favicon</span>}
                      </div>
                      <FaviconUploader
                        url={store.STORE_FAVICON_URL}
                        onChange={url => setStore(s => ({ ...s, STORE_FAVICON_URL: url }))}
                      />
                    </div>
                  </div>

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

                {/* ── Site URL ─────────────────────────────────────── */}
                <div className="border-t border-slate-50 pt-5">
                  <SectionTitle>Site URL</SectionTitle>
                  <Label>Public URL</Label>
                  <input
                    type="url"
                    value={store.STORE_URL}
                    onChange={e => setStore(s => ({ ...s, STORE_URL: e.target.value }))}
                    placeholder="https://yourstore.com"
                    className={inputCls}
                  />
                  <Hint>
                    Canonical URL of your live storefront. Used in email links, payment redirects, JSON-LD structured data, and openGraph URLs.
                    Include <code className="bg-slate-100 px-1 rounded">https://</code> and no trailing slash.
                  </Hint>
                </div>

                {/* ── SEO ──────────────────────────────────────────── */}
                <div className="border-t border-slate-50 pt-5">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-0.5 h-4 rounded-full bg-primary" />
                      <h3 className="font-heading font-bold text-slate-800 text-sm uppercase tracking-wide">Search Engines (SEO)</h3>
                    </div>
                    <button
                      type="button"
                      onClick={suggestSeoWithAI}
                      disabled={aiSuggesting || !store.STORE_NAME.trim()}
                      title={!store.STORE_NAME.trim() ? 'Set a store name first' : 'Fill all 3 SEO fields with AI suggestions'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      {aiSuggesting
                        ? <><Loader2 size={12} className="animate-spin" /> Generating…</>
                        : <><Sparkles size={12} /> Suggest with AI</>}
                    </button>
                  </div>

                  {aiError && (
                    <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                      <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-red-600 font-medium leading-relaxed">{aiError}</p>
                        {aiError.toLowerCase().includes('api key') && (
                          <p className="text-[10px] text-red-500 mt-1">
                            Configure your key in <span className="font-bold">AI Configuration</span> tab below.
                          </p>
                        )}
                      </div>
                      <button type="button" onClick={() => setAiError(null)}
                        className="text-red-400 hover:text-red-600 cursor-pointer">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <Label>SEO Title <span className="normal-case font-normal text-slate-400">(50–60 characters recommended)</span></Label>
                      <input
                        type="text"
                        value={store.SEO_TITLE}
                        onChange={e => setStore(s => ({ ...s, SEO_TITLE: e.target.value }))}
                        placeholder="Balapasa — Tech & Beauty Hub Nepal"
                        maxLength={70}
                        className={inputCls}
                      />
                      <Hint>The clickable blue link shown in Google search results.</Hint>
                    </div>

                    <div>
                      <Label>SEO Description <span className="normal-case font-normal text-slate-400">(140–160 characters recommended)</span></Label>
                      <textarea
                        value={store.SEO_DESCRIPTION}
                        onChange={e => setStore(s => ({ ...s, SEO_DESCRIPTION: e.target.value }))}
                        placeholder="Shop electronics, gadgets, skincare & beauty at the best prices…"
                        rows={3}
                        maxLength={200}
                        className={inputCls + ' resize-none'}
                      />
                      <Hint>The gray tagline shown under the title in Google. Sell the experience — fast delivery, authenticity, prices.</Hint>
                    </div>

                    <div>
                      <Label>SEO Keywords <span className="normal-case font-normal text-slate-400">(comma-separated)</span></Label>
                      <input
                        type="text"
                        value={store.SEO_KEYWORDS}
                        onChange={e => setStore(s => ({ ...s, SEO_KEYWORDS: e.target.value }))}
                        placeholder="online shopping Nepal, electronics Nepal, beauty products, fast delivery Kathmandu"
                        className={inputCls}
                      />
                      <Hint>Lower priority than title/description but still indexed. Aim for 5–8 phrases your customers actually type.</Hint>
                    </div>

                    {/* Google preview card */}
                    {(store.SEO_TITLE || store.SEO_DESCRIPTION) && (
                      <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Google Preview</p>
                        <div className="bg-white rounded-xl p-4 border border-slate-100">
                          <p className="text-xs text-slate-600 mb-1 truncate">
                            {store.STORE_URL || 'https://yourstore.com'}
                          </p>
                          <p className="text-lg text-[#1a0dab] hover:underline cursor-pointer font-medium leading-snug line-clamp-1">
                            {store.SEO_TITLE || 'Your SEO Title — appears here'}
                          </p>
                          <p className="text-sm text-slate-600 leading-relaxed mt-1 line-clamp-2">
                            {store.SEO_DESCRIPTION || 'Your SEO description appears here. This is what people see when searching for your site in Google.'}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                          Actual appearance may vary — Google sometimes rewrites titles/descriptions based on the search query.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-50">
                  <SaveBtn section="store" saving={saving} saved={saved} />
                </div>
              </div>
            </form>
          )}

          {/* ── Homepage tab ──────────────────────────────────────── */}
          {tab === 'homepage' && (
            <HomepageSettingsPanel saving={saving} saved={saved} onSave={save} />
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

          {/* ── Messaging tab ────────────────────────────────────── */}
          {tab === 'messaging' && (
            <MessagingSettingsPanel saving={saving} saved={saved} onSave={save} />
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
