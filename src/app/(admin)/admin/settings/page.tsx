'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Settings, Store, Bell, Shield, Sparkles, CreditCard, Truck,
  Save, Loader2, CheckCircle2, Eye, EyeOff, Copy,
  ExternalLink, AlertCircle, RefreshCw, ChevronRight, ChevronLeft, Upload, Palette,
  MessageCircle, LayoutTemplate, ShieldCheck, Star, Zap, Trash2, Plus, Library, Info,
  AlertTriangle, X, Package, ShoppingCart, Receipt, Users, UserCog, Megaphone,
  Activity,
} from 'lucide-react'
import { STORE_NAME } from '@/lib/config'
import { THEMES, applyTheme } from '@/components/layout/ThemeApplicator'
import {
  HERO_DEFAULTS, FAQ_DEFAULTS, splitBrandName, cleanBrandName,
  BANNER_DEFAULTS, POPUP_DEFAULTS, parseBanner, parsePopup,
  type HeroBadge, type FaqItem, type StoreBanner, type StorePopup,
} from '@/lib/site-settings-shared'
import GalleryPickerModal from '@/components/admin/GalleryPickerModal'

// ── Types ─────────────────────────────────────────────────────────────────

interface StoreForm {
  STORE_NAME: string; STORE_EMAIL: string; STORE_PHONE: string
  STORE_ADDRESS: string; FREE_DELIVERY_THRESHOLD: string; STORE_LOGO_URL: string
  STORE_THEME: string; STORE_FAVICON_URL: string
  STORE_URL: string
  RETURN_WINDOW_DAYS: string
  ORDER_CODE_PREFIX: string
  SEO_TITLE: string; SEO_DESCRIPTION: string; SEO_KEYWORDS: string
}
interface PaymentForm {
  ESEWA_MERCHANT_ID: string; ESEWA_SECRET_KEY: string
  ESEWA_BASE_URL:    string; ESEWA_STATUS_URL: string
  KHALTI_SECRET_KEY: string; KHALTI_PUBLIC_KEY: string; KHALTI_BASE_URL: string
  // 'true' / 'false' string flags driving checkout's payment-method visibility.
  PAYMENT_COD_ENABLED:     string
  PAYMENT_DIGITAL_ENABLED: string
  PAYMENT_ESEWA_ENABLED:   string
  PAYMENT_KHALTI_ENABLED:  string
}
interface NotifForm   {
  ORDER_NOTIFICATION_EMAIL: string; OPENWEATHER_API_KEY: string
  FCM_PROJECT_ID: string; FCM_CLIENT_EMAIL: string; FCM_PRIVATE_KEY: string
  ADMIN_STATUS_CHANGE_EMAIL: string   // 'true' | 'false' — opt-in, off by default
}
interface AIForm      { ANTHROPIC_API_KEY: string; GEMINI_API_KEY: string }
interface ContentForm {
  LEGAL_PRIVACY_BODY:      string
  LEGAL_TERMS_BODY:        string
  LEGAL_REFUND_BODY:       string
  LEGAL_SHIPPING_BODY:     string
  LEGAL_CANCELLATION_BODY: string
  ABOUT_TITLE:             string
  ABOUT_BODY:              string
  CONTACT_INSTAGRAM:       string
  CONTACT_X:               string
  CONTACT_YOUTUBE:         string
  CONTACT_HOURS:           string
  CONTACT_MAP_EMBED:       string
}

type TabId = 'store' | 'homepage' | 'content' | 'notices' | 'tracking' | 'payments' | 'delivery' | 'ai' | 'notifications' | 'messaging' | 'danger'

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
  { id: 'content',       icon: Library,         label: 'Content',       desc: 'Legal pages, about & FAQ' },
  { id: 'notices',       icon: Megaphone,       label: 'Notices',       desc: 'Banner & popup'           },
  { id: 'tracking',      icon: Activity,        label: 'Analytics',     desc: 'Google Analytics & tracking' },
  { id: 'payments',      icon: CreditCard, label: 'Payments',      desc: 'eSewa & Khalti keys'       },
  { id: 'delivery',      icon: Truck,      label: 'Delivery',      desc: 'Pathao & logistics'        },
  { id: 'ai',            icon: Sparkles,   label: 'AI',            desc: 'Anthropic & Gemini'        },
  { id: 'notifications', icon: Bell,          label: 'Notifications', desc: 'Email alerts'              },
  { id: 'messaging',     icon: MessageCircle, label: 'Messaging',     desc: 'WhatsApp & Facebook'       },
  { id: 'danger',        icon: Shield,        label: 'Danger Zone',   desc: 'Destructive actions'       },
]

// ── Email health card ─────────────────────────────────────────────────────

interface EmailHealth {
  ok:                 boolean
  apiKeyPresent:      boolean
  apiKeySource:       'db' | 'env' | 'none'
  fromAddress:        string
  fromDomain:         string | null
  fromDomainListed:   boolean | null
  fromDomainVerified: boolean | null
  replyTo:            string | null
  warnings:           string[]
}

function EmailHealthCard() {
  const [health, setHealth]   = useState<EmailHealth | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const run = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/emails/health')
      if (!res.ok) throw new Error('HTTP ' + res.status)
      setHealth(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { run() }, [run])

  const tone =
    !health           ? 'bg-slate-50 border-slate-200 text-slate-600'
    : health.ok        ? 'bg-green-50 border-green-200 text-green-800'
    : health.apiKeyPresent ? 'bg-amber-50 border-amber-200 text-amber-800'
    :                    'bg-red-50 border-red-200 text-red-800'

  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/60 flex items-center justify-center">
            {loading ? <Loader2 size={14} className="animate-spin" />
              : health?.ok ? <CheckCircle2 size={14} />
              : <AlertCircle size={14} />}
          </div>
          <div>
            <p className="text-sm font-bold">Email pipeline health</p>
            <p className="text-[11px] opacity-80">
              {loading           ? 'Probing Resend…'
                : !health         ? 'Not checked yet.'
                : health.ok        ? 'All good — customers will receive emails.'
                : health.apiKeyPresent ? 'Configured but with issues.'
                :                    'No Resend API key — emails are disabled.'}
            </p>
          </div>
        </div>
        <button type="button" onClick={run} disabled={loading}
          className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white/70 hover:bg-white border border-current/20 cursor-pointer disabled:opacity-50">
          Re-check
        </button>
      </div>
      {error && <p className="text-xs mt-2 font-mono">{error}</p>}
      {health && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <p><span className="opacity-60">From:</span> <span className="font-semibold">{health.fromAddress}</span></p>
          <p><span className="opacity-60">API key:</span> {health.apiKeyPresent ? `present (${health.apiKeySource})` : 'missing'}</p>
          <p><span className="opacity-60">Reply-to:</span> {health.replyTo ?? '—'}</p>
          <p><span className="opacity-60">Domain verified:</span>{' '}
            {health.fromDomainVerified === true ? 'yes'
              : health.fromDomainVerified === false ? 'no'
              : health.fromDomainListed === false ? 'not added to Resend'
              : 'unknown'}
          </p>
        </div>
      )}
      {health && health.warnings.length > 0 && (
        <ul className="mt-3 list-disc list-inside space-y-0.5 text-[11px]">
          {health.warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}
    </div>
  )
}

// ── Logo uploader ─────────────────────────────────────────────────────────

function LogoUploader({ url, onChange }: { url: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
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
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50">
              {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><Upload size={14} /> Upload logo</>}
            </button>
            <button type="button" onClick={() => setPickerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
              <Library size={14} /> From library
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">PNG or SVG recommended · max 2MB</p>
          {url && (
            <input value={url} onChange={e => onChange(e.target.value)}
              placeholder="or paste URL…"
              className="mt-2 w-full px-3 py-1.5 text-[11px] font-mono border border-slate-100 rounded-lg bg-white text-slate-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/10" />
          )}
        </div>
      </div>
      <Hint>Used in shipping labels and email receipts</Hint>
      <GalleryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(urls) => { if (urls[0]) onChange(urls[0]) }}
        mode="single"
        kind="image"
        initiallySelected={url ? [url] : []}
        title="Pick a logo"
      />
    </div>
  )
}

function FaviconUploader({ url, onChange }: { url: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
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
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50">
          {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><Upload size={14} /> Upload favicon</>}
        </button>
        <button type="button" onClick={() => setPickerOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
          <Library size={14} /> From library
        </button>
      </div>
      {url && (
        <input value={url} onChange={e => onChange(e.target.value)} placeholder="or paste URL…"
          className="w-full px-3 py-1.5 text-[11px] font-mono border border-slate-100 rounded-lg bg-white text-slate-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/10" />
      )}
      <GalleryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(urls) => { if (urls[0]) onChange(urls[0]) }}
        mode="single"
        kind="image"
        initiallySelected={url ? [url] : []}
        title="Pick a favicon"
      />
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
  maxWeightKg?: number | null; maxLengthCm?: number | null; maxWidthCm?: number | null; maxHeightCm?: number | null
}

const PATHAO_DEFAULTS: ProviderRow = {
  provider: 'PATHAO', isActive: true, isMock: true,
  clientId: 'dev_5e5612b011f438ca5b30a2d6', clientSecret: 'F62z4qB1IazJzzgMYhKyBpdRWWRoAiikbQdR-SDrYdI',
  storeId: 'MROQI3O9', storeName: '', storePhone: '',
  storeAddress: '', baseUrl: 'https://enterprise-api.pathao.com',
  maxWeightKg: 25, maxLengthCm: 60, maxWidthCm: 60, maxHeightCm: 60,
}
const PND_DEFAULTS: ProviderRow = {
  provider: 'PICKNDROP', isActive: true, isMock: false,
  apiKey: '', apiSecret: '', baseUrl: 'https://app-t.pickndropnepal.com',
  pickupBranch: 'KATHMANDU VALLEY', pickupArea: 'Kathmandu', pickupLocation: 'Balaju',
  maxWeightKg: 50, maxLengthCm: 120, maxWidthCm: 80, maxHeightCm: 80,
}

interface VendorSync {
  vendorName?: string
  vendorAddress?: string
  parsed?: { pickupBranch?: string; pickupArea?: string; pickupLocation?: string }
  error?: string
}

function DeliverySettingsPanel() {
  const [pathao,  setPathao]  = useState<ProviderRow>(PATHAO_DEFAULTS)
  const [pnd,     setPnd]     = useState<ProviderRow>(PND_DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState<string | null>(null)
  const [saved,   setSaved]   = useState<string | null>(null)
  const [err,     setErr]     = useState('')
  const [pndVendor, setPndVendor] = useState<VendorSync | null>(null)
  const [deliveryMode, setDeliveryMode] = useState<'FREE' | 'PAID'>('PAID')
  const [deliveryEnabled, setDeliveryEnabled] = useState(true)
  const [modeSaving, setModeSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/logistics').then(r => r.json()).then(j => {
      const rows: ProviderRow[] = j.settings ?? []
      const p = rows.find(r => r.provider === 'PATHAO')
      const d = rows.find(r => r.provider === 'PICKNDROP')
      if (p) setPathao({ ...PATHAO_DEFAULTS, ...p })
      if (d) {
        setPnd({ ...PND_DEFAULTS, ...d })
        if (d.storeName || d.storeAddress) {
          setPndVendor({ vendorName: d.storeName, vendorAddress: d.storeAddress })
        }
      }
    }).catch(() => {}).finally(() => setLoading(false))

    fetch('/api/admin/settings').then(r => r.json()).then(j => {
      const v = j?.settings?.DELIVERY_MODE
      if (v === 'FREE' || v === 'PAID') setDeliveryMode(v)
      if (j?.settings?.DELIVERY_ENABLED === 'false') setDeliveryEnabled(false)
    }).catch(() => {})
  }, [])

  async function saveDeliveryMode(next: 'FREE' | 'PAID') {
    setDeliveryMode(next)
    setModeSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ DELIVERY_MODE: next }),
      })
    } catch (e) { setErr(String(e)) }
    finally { setModeSaving(false) }
  }

  async function saveProvider(data: ProviderRow) {
    setSaving(data.provider); setErr('')
    try {
      const res = await fetch('/api/admin/logistics', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(await res.text())
      const j = await res.json()
      if (data.provider === 'PICKNDROP') {
        if (j?.setting) setPnd(prev => ({ ...prev, ...j.setting }))
        if (j?.vendorSync) setPndVendor(j.vendorSync as VendorSync)
      }
      if (data.provider === 'PATHAO' && j?.setting) setPathao(prev => ({ ...prev, ...j.setting }))
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

  const limitsGroup = (row: ProviderRow, setRow: React.Dispatch<React.SetStateAction<ProviderRow>>) => (
    <>
      <SectionTitle>Parcel limits</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['maxWeightKg', 'maxLengthCm', 'maxWidthCm', 'maxHeightCm'] as const).map(key => (
          <div key={key}>
            <Label>{key === 'maxWeightKg' ? 'Max kg' : key === 'maxLengthCm' ? 'Max L (cm)' : key === 'maxWidthCm' ? 'Max W (cm)' : 'Max H (cm)'}</Label>
            <input
              type="number" min={0} step="0.1"
              value={row[key] ?? ''}
              onChange={e => setRow(p => ({ ...p, [key]: e.target.value === '' ? null : Number(e.target.value) }))}
              className={fieldCls}
            />
          </div>
        ))}
      </div>
      <Hint>Orders heavier or larger than this hide this carrier on the order page and warn on the product form. Blank = use default.</Hint>
    </>
  )

  return (
    <div className="space-y-6">
      {err && <p className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{err}</p>}

      {/* Delivery mode (global) */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Truck size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-bold text-slate-800">Delivery mode</p>
            <p className="text-[11px] text-slate-500">Controls whether checkout shows shipping carriers and charges.</p>
          </div>
          {modeSaving && <Loader2 size={14} className="ml-auto animate-spin text-slate-400" />}
          <button
            type="button"
            role="switch"
            aria-checked={deliveryEnabled}
            aria-label="Enable store delivery"
            onClick={async () => {
              const next = !deliveryEnabled
              setDeliveryEnabled(next)
              await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ DELIVERY_ENABLED: String(next) }),
              })
            }}
            className={`ml-auto relative w-11 h-6 rounded-full transition-colors cursor-pointer ${deliveryEnabled ? 'bg-emerald-500' : 'bg-red-400'}`}
            title={deliveryEnabled ? 'Delivery is ON — click to pause' : 'Delivery is PAUSED — click to enable'}
          >
            <span className={`absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${deliveryEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {!deliveryEnabled && (
          <div className="px-6 pt-4">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
              <Info size={13} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-800">
                Delivery is paused. Customers will see a notice and cannot place orders at checkout.
              </p>
            </div>
          </div>
        )}

        <div className="p-6 grid sm:grid-cols-2 gap-3">
          {([
            { v: 'PAID', title: 'Paid delivery', sub: 'Charge per-order via Pick & Drop / Pathao.' },
            { v: 'FREE', title: 'Free delivery', sub: 'Store builds shipping into product prices. Customers see no delivery charge.' },
          ] as const).map(opt => (
            <button
              key={opt.v}
              type="button"
              onClick={() => saveDeliveryMode(opt.v)}
              disabled={modeSaving}
              className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer disabled:opacity-60 ${
                deliveryMode === opt.v ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-slate-800">{opt.title}</span>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${deliveryMode === opt.v ? 'border-emerald-500' : 'border-slate-300'}`}>
                  {deliveryMode === opt.v && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">{opt.sub}</p>
            </button>
          ))}
        </div>
        {deliveryMode === 'FREE' && (
          <div className="px-6 pb-5">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <Info size={13} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Free-delivery mode is on. The carrier panels below stay configured but will not be shown to customers at checkout.
              </p>
            </div>
          </div>
        )}
      </div>

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
              <span className={`absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${pathao.isMock ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
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

          {limitsGroup(pathao, setPathao)}

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

          {pndVendor && (pndVendor.vendorAddress || pndVendor.error) && (
            <div className={`p-4 rounded-xl border ${pndVendor.error ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
              {pndVendor.error ? (
                <p className="text-xs text-rose-700">{pndVendor.error}</p>
              ) : (
                <>
                  <p className="text-[11px] uppercase tracking-wider font-bold text-emerald-700">Registered with Pick &amp; Drop</p>
                  {pndVendor.vendorName && <p className="text-sm font-bold text-emerald-900 mt-1">{pndVendor.vendorName}</p>}
                  <p className="text-xs text-emerald-800/80 mt-0.5">{pndVendor.vendorAddress}</p>
                  <p className="text-[10px] text-emerald-700/70 mt-2">Auto-fetched from <code className="px-1 bg-emerald-100 rounded">business_address</code> · pickup fields below were parsed from this address.</p>
                </>
              )}
            </div>
          )}

          <SectionTitle>Pickup Origin</SectionTitle>
          <p className="text-xs text-slate-500 -mt-2">Auto-filled from your PnD registered address when credentials are saved. Sent as <code className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">pickup_branch</code>, <code className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">city_area</code>, and <code className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">location</code> on rate &amp; create_order calls.</p>
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

          {limitsGroup(pnd, setPnd)}

          <PndWebhookSection />

          <div className="flex justify-end pt-2 border-t border-slate-50"><ProviderSaveBtn provider="PICKNDROP" /></div>
        </div>
      </div>
    </div>
  )
}

// ── Pick & Drop webhook registration ──────────────────────────────────────

interface PndWebhookState {
  url:            string
  secretMasked:   string | null
  hasSecret:      boolean
  lastRegistered: string | null
  pndBaseUrl:     string
  pndActive:      boolean
}

function PndWebhookSection() {
  const [state, setState] = useState<PndWebhookState | null>(null)
  const [registering, setRegistering] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/logistics/pnd-webhook/register')
      if (!res.ok) return
      setState(await res.json())
    } catch { /* non-fatal */ }
  }, [])
  useEffect(() => { load() }, [load])

  async function copySecret() {
    try {
      const res = await fetch('/api/admin/logistics/pnd-webhook/register?reveal=true')
      const json = await res.json()
      if (!json.secretFull) return
      await navigator.clipboard.writeText(json.secretFull)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* non-fatal */ }
  }

  async function register(rotate: boolean) {
    setRegistering(true); setError(null); setSuccess(false)
    try {
      const res = await fetch('/api/admin/logistics/pnd-webhook/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rotate }),
      })
      const json = await res.json()
      if (!res.ok && !json.ok) {
        setError(json.error ?? `HTTP ${res.status}`)
      } else {
        // pndWarning means token was saved but PnD API auto-registration failed — manual entry needed
        if (json.pndWarning) setError(json.pndWarning)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
        await load()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div>
      <SectionTitle>Webhook</SectionTitle>
      <div className="rounded-2xl border border-slate-100 p-4 space-y-3 bg-slate-50/40">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Pick &amp; Drop pushes status updates here. Your tracking page and customer emails update automatically the moment they fire.
        </p>

        <div>
          <Label>Receiver URL</Label>
          <input
            readOnly
            value={state?.url ?? 'Loading…'}
            className={`${inputCls} font-mono text-[12px]`}
            onFocus={e => e.target.select()}
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Paste into PnD&apos;s dashboard under Integration → Webhook Integration if the API push below isn&apos;t available in your environment.
          </p>
        </div>

        <div>
          <Label>Web Token</Label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={state?.secretMasked ?? (state?.hasSecret ? '••••' : 'Not generated yet')}
              className={`${inputCls} font-mono`}
            />
            <button
              type="button"
              onClick={copySecret}
              disabled={!state?.hasSecret}
              className="px-3 py-2.5 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer disabled:opacity-40 flex items-center gap-1"
              title="Copy full token to clipboard"
            >
              {copied ? <><CheckCircle2 size={12} className="text-green-600" /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
            <button
              type="button"
              onClick={() => register(true)}
              disabled={registering}
              className="px-3 py-2.5 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer disabled:opacity-50"
              title="Generate a new token and re-register with PnD"
            >
              Rotate
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Paste the copied token into PnD&apos;s dashboard under Integration → Webhook Integration. Used to validate incoming webhook payloads (HMAC-SHA256).
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="text-[11px] text-slate-500">
            {state?.lastRegistered
              ? <>Last registered <span className="font-semibold text-slate-700">{new Date(state.lastRegistered).toLocaleString('en-NP', { dateStyle: 'medium', timeStyle: 'short' })}</span></>
              : <>Not registered yet — click below.</>}
          </div>
          <button
            type="button"
            onClick={() => register(false)}
            disabled={registering || !state}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-bold text-sm rounded-xl cursor-pointer shadow-md shadow-primary/15"
          >
            {registering ? <><Loader2 size={14} className="animate-spin" /> Registering…</>
              : success    ? <><CheckCircle2 size={14} /> Registered</>
              :              <><Bell size={14} /> {state?.lastRegistered ? 'Re-register' : 'Register webhook'}</>}
          </button>
        </div>

        {error && (
          <div className={`flex items-start gap-2 p-2.5 rounded-lg text-[11px] ${success ? 'bg-amber-50 border border-amber-100 text-amber-700' : 'bg-red-50 border border-red-100 text-red-700'}`}>
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            <span className="font-mono">{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Danger Zone ────────────────────────────────────────────────────────────

type DangerTarget = 'products' | 'orders' | 'transactions' | 'staff' | 'customers'
interface DangerCounts { products: number; orders: number; transactions: number; staff: number; customers: number }

const DANGER_ACTIONS: {
  target: DangerTarget; icon: typeof Trash2; title: string; desc: string
}[] = [
  { target: 'orders',       icon: ShoppingCart, title: 'Clear all orders',       desc: 'Deletes every order with its items, status history, return requests and order-code counters.' },
  { target: 'transactions', icon: Receipt,      title: 'Clear all transactions', desc: 'Deletes all financial records — the expense ledger, subscription invoices and gift-card redemptions.' },
  { target: 'products',     icon: Package,      title: 'Clear all products',     desc: 'Deletes every product with its variants, options, inventory logs, reviews, Q&A and wishlist entries.' },
  { target: 'customers',    icon: Users,        title: 'Clear all customers',    desc: 'Deletes all customer accounts AND every order they placed, plus their addresses, reviews and wishlists.' },
  { target: 'staff',        icon: UserCog,      title: 'Clear all staff',        desc: 'Deletes all staff, manager and admin accounts — except the one you are signed in with.' },
]

function DangerZone() {
  const [counts, setCounts]   = useState<DangerCounts | null>(null)
  const [confirmFor, setConfirmFor] = useState<DangerTarget | null>(null)
  const [typed, setTyped]     = useState('')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [done, setDone]       = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/danger')
      if (res.ok) setCounts(await res.json())
    } catch { /* non-fatal */ }
  }, [])
  useEffect(() => { load() }, [load])

  function openConfirm(target: DangerTarget) {
    setConfirmFor(target); setTyped(''); setError(null); setDone(null)
  }

  async function runClear() {
    if (!confirmFor) return
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/admin/danger', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ target: confirmFor, confirm: typed.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? `HTTP ${res.status}`); return }
      setDone(`Cleared all ${confirmFor}.`)
      setConfirmFor(null)
      await load()
      setTimeout(() => setDone(null), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-red-50 bg-red-50/50 flex items-start gap-3">
        <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-red-700">These actions are permanent and cannot be undone.</p>
          <p className="text-xs text-red-500 mt-0.5">Each one wipes data straight out of the database. Proceed only if you are absolutely sure.</p>
        </div>
      </div>

      {done && (
        <div className="mx-6 mt-4 flex items-center gap-2 p-2.5 rounded-lg text-[12px] bg-green-50 border border-green-100 text-green-700">
          <CheckCircle2 size={14} className="shrink-0" /> {done}
        </div>
      )}

      <div className="divide-y divide-red-50">
        {DANGER_ACTIONS.map(({ target, icon: Icon, title, desc }) => {
          const count = counts?.[target]
          return (
            <div key={target} className="p-6 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm">
                    {title}
                    {typeof count === 'number' && (
                      <span className="ml-2 text-[11px] font-semibold text-slate-400">
                        {count} record{count === 1 ? '' : 's'}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openConfirm(target)}
                disabled={count === 0}
                className="shrink-0 px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Trash2 size={13} /> Clear
              </button>
            </div>
          )
        })}
      </div>

      {confirmFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !busy && setConfirmFor(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                  <AlertTriangle size={18} className="text-red-500" />
                </div>
                <h3 className="font-heading font-bold text-slate-800 text-base">Clear all {confirmFor}?</h3>
              </div>
              <button type="button" onClick={() => !busy && setConfirmFor(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              This permanently deletes{' '}
              <span className="font-bold text-slate-700">{counts?.[confirmFor] ?? 0} {confirmFor}</span>
              {confirmFor === 'customers' && ' and every order those customers placed'}
              {' '}from the database. This cannot be undone.
            </p>
            <Label>Type <span className="font-mono text-red-600 lowercase">{confirmFor}</span> to confirm</Label>
            <input
              autoFocus
              value={typed}
              onChange={e => { setTyped(e.target.value); setError(null) }}
              onKeyDown={e => { if (e.key === 'Enter' && typed.trim().toLowerCase() === confirmFor && !busy) runClear() }}
              placeholder={confirmFor}
              className={`${inputCls} font-mono`}
            />
            {error && (
              <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg text-[12px] bg-red-50 border border-red-100 text-red-700">
                <AlertCircle size={14} className="shrink-0" /> {error}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 mt-5">
              <button type="button" onClick={() => setConfirmFor(null)} disabled={busy}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={runClear} disabled={busy || typed.trim().toLowerCase() !== confirmFor}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl cursor-pointer">
                {busy ? <><Loader2 size={14} className="animate-spin" /> Clearing…</> : <><Trash2 size={14} /> Delete permanently</>}
              </button>
            </div>
          </div>
        </div>
      )}
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

// ── Notices (banner + popup) settings panel ───────────────────────────────

// Small reusable on/off switch matching the toggle styling used elsewhere on
// this page (delivery mode / mock toggles).
function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`shrink-0 w-11 h-6 rounded-full transition-colors cursor-pointer relative ${checked ? 'bg-primary' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

// Popup image picker — reuses the exact same upload endpoint + GalleryPickerModal
// mechanism as the Store logo/favicon, yielding an internal /uploads/... path.
function PopupImagePicker({ url, onChange }: { url: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
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
    <div>
      <Label>Popup Image</Label>
      <div className="flex items-center gap-4 mt-1">
        <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
          {url
            ? <img src={url} alt="Popup image preview" className="object-cover w-full h-full" />
            : <Upload size={20} className="text-slate-300" />}
        </div>
        <div className="flex-1">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50">
              {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><Upload size={14} /> Upload image</>}
            </button>
            <button type="button" onClick={() => setPickerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-sm font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
              <Library size={14} /> From library
            </button>
          </div>
          {url && (
            <input value={url} onChange={e => onChange(e.target.value)} placeholder="or paste URL…"
              className="mt-2 w-full px-3 py-1.5 text-[11px] font-mono border border-slate-100 rounded-lg bg-white text-slate-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/10" />
          )}
        </div>
      </div>
      <Hint>Shown at the top of the promo popup. Recommended landscape image.</Hint>
      <GalleryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(urls) => { if (urls[0]) onChange(urls[0]) }}
        mode="single"
        kind="image"
        initiallySelected={url ? [url] : []}
        title="Pick a popup image"
      />
    </div>
  )
}

function NoticesSection({ saving, saved, onSave }: {
  saving: string | null; saved: string | null; onSave: (s: string, d: Record<string, string>) => void
}) {
  const [banner, setBanner] = useState<StoreBanner>(BANNER_DEFAULTS)
  const [popup,  setPopup]  = useState<StorePopup>(POPUP_DEFAULTS)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(({ settings: s }) => {
      if (!s) return
      setBanner(parseBanner(s.STORE_BANNER_JSON))
      setPopup(parsePopup(s.STORE_POPUP_JSON))
    }).catch(() => {})
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave('notices', {
      STORE_BANNER_JSON: JSON.stringify(banner),
      STORE_POPUP_JSON:  JSON.stringify(popup),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <InfoBanner icon={Megaphone} color="bg-amber-50 border border-amber-100 text-amber-700">
        Configure the store-wide announcement banner and the promotional popup shown on the storefront. Changes take effect immediately for new visitors.
      </InfoBanner>

      {/* ── Announcement banner ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 rounded-full bg-primary" />
            <h3 className="font-heading font-bold text-slate-800 text-sm uppercase tracking-wide">Announcement Banner</h3>
          </div>
          <ToggleSwitch checked={banner.enabled} onChange={v => setBanner(b => ({ ...b, enabled: v }))} label="Enable announcement banner" />
        </div>
        <p className="text-xs text-slate-400 -mt-2">A thin strip shown below the navbar across the storefront.</p>

        {/* Live preview */}
        {banner.message.trim() && (
          <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold text-center">
            <span>{banner.message}</span>
            {banner.linkLabel.trim() && (
              <span className="underline underline-offset-2 font-bold">{banner.linkLabel}</span>
            )}
          </div>
        )}

        <div>
          <Label>Message</Label>
          <input value={banner.message} onChange={e => setBanner(b => ({ ...b, message: e.target.value }))}
            placeholder="Free delivery on orders above NPR 5000 this week!" className={inputCls} maxLength={160} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Link Label <span className="normal-case font-normal text-slate-400">(optional)</span></Label>
            <input value={banner.linkLabel} onChange={e => setBanner(b => ({ ...b, linkLabel: e.target.value }))}
              placeholder="Shop now" className={inputCls} maxLength={40} />
            <Hint>Inline call-to-action text shown at the end of the message.</Hint>
          </div>
          <div>
            <Label>Link URL <span className="normal-case font-normal text-slate-400">(optional)</span></Label>
            <input value={banner.linkUrl} onChange={e => setBanner(b => ({ ...b, linkUrl: e.target.value }))}
              placeholder="/products" className={inputCls + ' font-mono text-xs'} />
          </div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/40">
          <div>
            <p className="text-sm font-semibold text-slate-700">Dismissible</p>
            <p className="text-[11px] text-slate-400">Let visitors close the banner with an ✕.</p>
          </div>
          <ToggleSwitch checked={banner.dismissible} onChange={v => setBanner(b => ({ ...b, dismissible: v }))} label="Banner dismissible" />
        </div>
      </div>

      {/* ── Promo popup ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 rounded-full bg-primary" />
            <h3 className="font-heading font-bold text-slate-800 text-sm uppercase tracking-wide">Promo Popup</h3>
          </div>
          <ToggleSwitch checked={popup.enabled} onChange={v => setPopup(p => ({ ...p, enabled: v }))} label="Enable promo popup" />
        </div>
        <p className="text-xs text-slate-400 -mt-2">A modal shown to storefront visitors.</p>

        <PopupImagePicker url={popup.image} onChange={url => setPopup(p => ({ ...p, image: url }))} />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Title</Label>
            <input value={popup.title} onChange={e => setPopup(p => ({ ...p, title: e.target.value }))}
              placeholder="Welcome offer!" className={inputCls} maxLength={80} />
          </div>
          <div>
            <Label>Frequency</Label>
            <select value={popup.frequency}
              onChange={e => setPopup(p => ({ ...p, frequency: e.target.value as StorePopup['frequency'] }))}
              className={inputCls + ' cursor-pointer'}>
              <option value="always">Always (every visit)</option>
              <option value="session">Once per session</option>
              <option value="once">Once ever</option>
            </select>
            <Hint>How often to re-show the popup after a visitor dismisses it.</Hint>
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <textarea value={popup.description} onChange={e => setPopup(p => ({ ...p, description: e.target.value }))}
            rows={3} maxLength={300} className={inputCls + ' resize-y'}
            placeholder="Get 10% off your first order — use code WELCOME10 at checkout." />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Button Label <span className="normal-case font-normal text-slate-400">(optional)</span></Label>
            <input value={popup.buttonLabel} onChange={e => setPopup(p => ({ ...p, buttonLabel: e.target.value }))}
              placeholder="Shop now" className={inputCls} maxLength={40} />
            <Hint>Leave empty to hide the popup's action button.</Hint>
          </div>
          <div>
            <Label>Button URL <span className="normal-case font-normal text-slate-400">(optional)</span></Label>
            <input value={popup.buttonUrl} onChange={e => setPopup(p => ({ ...p, buttonUrl: e.target.value }))}
              placeholder="/products" className={inputCls + ' font-mono text-xs'} />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SaveBtn section="notices" saving={saving} saved={saved} />
      </div>
    </form>
  )
}

// ── Tracking & Analytics ───────────────────────────────────────────────────

function TrackingSection({ saving, saved, onSave }: {
  saving: string | null; saved: string | null; onSave: (s: string, d: Record<string, string>) => void
}) {
  const [gaId, setGaId] = useState('')
  const [headCode, setHeadCode] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(({ settings: s }) => {
      if (!s) return
      setGaId(s.GA_MEASUREMENT_ID ?? '')
      setHeadCode(s.CUSTOM_HEAD_CODE ?? '')
    }).catch(() => {})
  }, [])

  const gaTrimmed = gaId.trim()
  const gaValid = gaTrimmed === '' || /^G-[A-Z0-9]+$/i.test(gaTrimmed)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!gaValid) return
    onSave('tracking', {
      GA_MEASUREMENT_ID: gaTrimmed,
      CUSTOM_HEAD_CODE:  headCode,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <InfoBanner icon={Activity} color="bg-indigo-50 border border-indigo-100 text-indigo-700">
        Connect Google Analytics and add tracking snippets to your storefront. These load on the public
        site only — never on the admin panel. Your dashboard&apos;s built-in visitor analytics work
        independently and need no setup here.
      </InfoBanner>

      {/* ── Google Analytics ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 rounded-full bg-primary" />
          <h3 className="font-heading font-bold text-slate-800 text-sm uppercase tracking-wide">Google Analytics 4</h3>
        </div>
        <div>
          <Label>Measurement ID</Label>
          <input
            value={gaId}
            onChange={e => setGaId(e.target.value)}
            placeholder="G-XXXXXXXXXX"
            className={inputCls + ' font-mono' + (gaValid ? '' : ' border-red-300 focus:border-red-400 focus:ring-red-100')}
          />
          {gaValid
            ? <Hint>Found in GA4 → Admin → Data Streams → your web stream. We load <code className="font-mono">gtag.js</code> site-wide and GA4 tracks page views automatically. Leave blank to disable.</Hint>
            : <p className="text-[11px] text-red-500 mt-1.5 font-medium">Measurement IDs look like <span className="font-mono">G-XXXXXXXXXX</span>.</p>}
        </div>
      </div>

      {/* ── Custom head code ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 rounded-full bg-primary" />
          <h3 className="font-heading font-bold text-slate-800 text-sm uppercase tracking-wide">Custom Head Code</h3>
        </div>
        <p className="text-xs text-slate-400 -mt-1">
          Pasted into the storefront <code className="font-mono">&lt;head&gt;</code>. Use for site-verification
          meta tags, the Meta Pixel, or other analytics snippets. Both inline and external
          <code className="font-mono"> &lt;script&gt;</code> tags execute.
        </p>
        <div>
          <Label>HTML snippet <span className="normal-case font-normal text-slate-400">(advanced)</span></Label>
          <textarea
            value={headCode}
            onChange={e => setHeadCode(e.target.value)}
            rows={8}
            spellCheck={false}
            placeholder={'<meta name="google-site-verification" content="..." />'}
            className={inputCls + ' resize-y font-mono text-xs leading-relaxed'}
          />
          <Hint>Leave empty if unused. Only paste code from sources you trust — it runs on every storefront page.</Hint>
        </div>
      </div>

      <div className="flex justify-end">
        <SaveBtn section="tracking" saving={saving} saved={saved} />
      </div>
    </form>
  )
}

// ── Legal page default templates ──────────────────────────────────────────

const LEGAL_DEFAULTS = {
  LEGAL_PRIVACY_BODY: `## Privacy Policy

We collect your name, email, phone number, and delivery address only to process and fulfil your orders. We do not sell or share your personal information with third parties except where required to complete delivery (logistics partners) or process payment (eSewa, Khalti).

## Data We Collect
- Contact details (name, email, phone)
- Delivery address
- Order history
- Payment method (we do not store card numbers)

## Cookies
We use cookies to keep you signed in and remember your cart. You can disable cookies in your browser settings, but some features may not work.

## Your Rights
You may request deletion of your account and personal data by contacting us at our store email address.

## Changes
We may update this policy from time to time. Continued use of our site after changes constitutes acceptance.`,

  LEGAL_TERMS_BODY: `## Terms of Service

By placing an order on our store, you agree to these terms.

## Orders
All orders are subject to product availability. We reserve the right to cancel any order and issue a full refund if a product becomes unavailable after purchase.

## Pricing
Prices are listed in Nepali Rupees (NPR) and are inclusive of applicable taxes. We reserve the right to change prices at any time without prior notice.

## Delivery
Delivery timelines are estimates and not guaranteed. We are not responsible for delays caused by logistics partners or circumstances beyond our control.

## Returns & Refunds
Please refer to our Refund & Return Policy for details.

## Governing Law
These terms are governed by the laws of Nepal.`,

  LEGAL_REFUND_BODY: `## Refund & Return Policy

We want you to be happy with your purchase. If you are not satisfied, you may request a return within the return window stated in your order confirmation.

## Eligibility
- Item must be unused, in original packaging, and in the same condition as received
- Return request must be submitted within the allowed return window
- Sale items and digital products are non-refundable

## Process
1. Submit a return request from your account's order page
2. Our team will review and approve within 1–2 business days
3. Ship the item back to us (return shipping cost is borne by the customer unless the item was defective)
4. Refund is issued within 5–7 business days after we receive the item

## Defective or Wrong Items
If you received a defective or incorrect item, contact us immediately. We will arrange a replacement or full refund including return shipping.`,

  LEGAL_SHIPPING_BODY: `## Shipping Policy

We deliver across Nepal via our logistics partners.

## Processing Time
Orders are typically processed within 1–2 business days after payment confirmation.

## Delivery Time
- Kathmandu Valley: 1–2 business days
- Major cities (outside valley): 2–4 business days
- Remote areas: 4–7 business days

## Shipping Charges
Delivery charges are calculated at checkout based on your location. Free delivery may apply above a minimum order amount.

## Order Tracking
Once your order is dispatched, you will receive a tracking number by email or SMS.

## Undeliverable Orders
If a delivery attempt fails and the order is returned to us, we will contact you to arrange re-delivery. Additional delivery charges may apply.`,

  LEGAL_CANCELLATION_BODY: `## Cancellation Policy

## Before Dispatch
You may cancel your order at no charge any time before it has been dispatched. To cancel, go to your account orders page and submit a cancellation request, or contact us directly.

## After Dispatch
Once an order has been dispatched, it cannot be cancelled. You may initiate a return after delivery by following our Return Policy.

## Refunds on Cancellation
For prepaid orders (eSewa / Khalti), refunds are processed within 5–7 business days after cancellation approval.

## Store-Initiated Cancellations
We reserve the right to cancel an order if a product is out of stock or if we detect a pricing error. You will be notified and receive a full refund.`,
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab,        setTab]        = useState<TabId>('store')
  // Mobile-only: when true, show the iOS-style settings index instead of the active panel.
  // Starts true so mobile users land on the index. On desktop (md+), this state has no
  // visual effect — both panes render via responsive classes.
  const [mobileNavOpen, setMobileNavOpen] = useState(true)
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
    RETURN_WINDOW_DAYS: '7',
    ORDER_CODE_PREFIX: '',
    SEO_TITLE: '', SEO_DESCRIPTION: '', SEO_KEYWORDS: '',
  })
  const [payment, setPayment] = useState<PaymentForm>({
    ESEWA_MERCHANT_ID: '', ESEWA_SECRET_KEY: '',
    ESEWA_BASE_URL:    '', ESEWA_STATUS_URL: '',
    KHALTI_SECRET_KEY: '', KHALTI_PUBLIC_KEY: '', KHALTI_BASE_URL: '',
    PAYMENT_COD_ENABLED:     'true',
    PAYMENT_DIGITAL_ENABLED: 'true',
    PAYMENT_ESEWA_ENABLED:   'true',
    PAYMENT_KHALTI_ENABLED:  'true',
  })
  const [notif,   setNotif]   = useState<NotifForm>({ ORDER_NOTIFICATION_EMAIL: '', OPENWEATHER_API_KEY: '', FCM_PROJECT_ID: '', FCM_CLIENT_EMAIL: '', FCM_PRIVATE_KEY: '', ADMIN_STATUS_CHANGE_EMAIL: 'false' })
  const [ai,      setAi]      = useState<AIForm>({ ANTHROPIC_API_KEY: '', GEMINI_API_KEY: '' })
  const [content, setContent] = useState<ContentForm>({
    LEGAL_PRIVACY_BODY: '', LEGAL_TERMS_BODY: '', LEGAL_REFUND_BODY: '', LEGAL_SHIPPING_BODY: '', LEGAL_CANCELLATION_BODY: '',
    ABOUT_TITLE: '', ABOUT_BODY: '',
    CONTACT_INSTAGRAM: '', CONTACT_X: '', CONTACT_YOUTUBE: '', CONTACT_HOURS: '', CONTACT_MAP_EMBED: '',
  })
  const [faq, setFaq] = useState<FaqItem[]>(FAQ_DEFAULTS)

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
        RETURN_WINDOW_DAYS:      settings.RETURN_WINDOW_DAYS      ?? s.RETURN_WINDOW_DAYS,
        ORDER_CODE_PREFIX:       settings.ORDER_CODE_PREFIX       ?? s.ORDER_CODE_PREFIX,
        SEO_TITLE:               settings.SEO_TITLE               ?? s.SEO_TITLE,
        SEO_DESCRIPTION:         settings.SEO_DESCRIPTION         ?? s.SEO_DESCRIPTION,
        SEO_KEYWORDS:            settings.SEO_KEYWORDS            ?? s.SEO_KEYWORDS,
      }))
      setPayment(p => ({
        ESEWA_MERCHANT_ID: settings.ESEWA_MERCHANT_ID ?? p.ESEWA_MERCHANT_ID,
        ESEWA_SECRET_KEY:  settings.ESEWA_SECRET_KEY  ?? p.ESEWA_SECRET_KEY,
        ESEWA_BASE_URL:    settings.ESEWA_BASE_URL    ?? p.ESEWA_BASE_URL,
        ESEWA_STATUS_URL:  settings.ESEWA_STATUS_URL  ?? p.ESEWA_STATUS_URL,
        KHALTI_SECRET_KEY: settings.KHALTI_SECRET_KEY ?? p.KHALTI_SECRET_KEY,
        KHALTI_PUBLIC_KEY: settings.KHALTI_PUBLIC_KEY ?? p.KHALTI_PUBLIC_KEY,
        KHALTI_BASE_URL:   settings.KHALTI_BASE_URL   ?? p.KHALTI_BASE_URL,
        PAYMENT_COD_ENABLED:     settings.PAYMENT_COD_ENABLED     ?? p.PAYMENT_COD_ENABLED,
        PAYMENT_DIGITAL_ENABLED: settings.PAYMENT_DIGITAL_ENABLED ?? p.PAYMENT_DIGITAL_ENABLED,
        PAYMENT_ESEWA_ENABLED:   settings.PAYMENT_ESEWA_ENABLED   ?? p.PAYMENT_ESEWA_ENABLED,
        PAYMENT_KHALTI_ENABLED:  settings.PAYMENT_KHALTI_ENABLED  ?? p.PAYMENT_KHALTI_ENABLED,
      }))
      setNotif({
        ORDER_NOTIFICATION_EMAIL: settings.ORDER_NOTIFICATION_EMAIL ?? '',
        OPENWEATHER_API_KEY:      settings.OPENWEATHER_API_KEY      ?? '',
        FCM_PROJECT_ID:           settings.FCM_PROJECT_ID           ?? '',
        FCM_CLIENT_EMAIL:         settings.FCM_CLIENT_EMAIL         ?? '',
        FCM_PRIVATE_KEY:          settings.FCM_PRIVATE_KEY          ?? '',
        ADMIN_STATUS_CHANGE_EMAIL: settings.ADMIN_STATUS_CHANGE_EMAIL ?? 'false',
      })
      setAi(a => ({
        ANTHROPIC_API_KEY: settings.ANTHROPIC_API_KEY ?? a.ANTHROPIC_API_KEY,
        GEMINI_API_KEY:    settings.GEMINI_API_KEY    ?? a.GEMINI_API_KEY,
      }))
      setContent(c => ({
        LEGAL_PRIVACY_BODY:      settings.LEGAL_PRIVACY_BODY      ?? c.LEGAL_PRIVACY_BODY,
        LEGAL_TERMS_BODY:        settings.LEGAL_TERMS_BODY        ?? c.LEGAL_TERMS_BODY,
        LEGAL_REFUND_BODY:       settings.LEGAL_REFUND_BODY       ?? c.LEGAL_REFUND_BODY,
        LEGAL_SHIPPING_BODY:     settings.LEGAL_SHIPPING_BODY     ?? c.LEGAL_SHIPPING_BODY,
        LEGAL_CANCELLATION_BODY: settings.LEGAL_CANCELLATION_BODY ?? c.LEGAL_CANCELLATION_BODY,
        ABOUT_TITLE:         settings.ABOUT_TITLE         ?? c.ABOUT_TITLE,
        ABOUT_BODY:          settings.ABOUT_BODY          ?? c.ABOUT_BODY,
        CONTACT_INSTAGRAM:   settings.CONTACT_INSTAGRAM   ?? c.CONTACT_INSTAGRAM,
        CONTACT_X:           settings.CONTACT_X           ?? c.CONTACT_X,
        CONTACT_YOUTUBE:     settings.CONTACT_YOUTUBE     ?? c.CONTACT_YOUTUBE,
        CONTACT_HOURS:       settings.CONTACT_HOURS       ?? c.CONTACT_HOURS,
        CONTACT_MAP_EMBED:   settings.CONTACT_MAP_EMBED   ?? c.CONTACT_MAP_EMBED,
      }))
      if (settings.FAQ_JSON) {
        try {
          const parsed = JSON.parse(settings.FAQ_JSON)
          if (Array.isArray(parsed)) setFaq(parsed.filter(
            (f): f is FaqItem => typeof f?.question === 'string' && typeof f?.answer === 'string',
          ))
        } catch { /* leave defaults */ }
      }
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
    <div className="p-4 md:p-8">
      {/* Page header — desktop only. Mobile uses its own sticky bar (below). */}
      <div className="hidden md:flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-primary-bg rounded-2xl flex items-center justify-center">
          <Settings size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Configure your store, integrations, and preferences</p>
        </div>
      </div>

      {/* Mobile sticky header — title on the index, back-arrow + tab name on detail */}
      <div className="md:hidden sticky top-14 -mx-4 z-30 bg-slate-50/95 backdrop-blur-xl border-b border-slate-200/60">
        <div className="flex items-center gap-2 px-4 h-12">
          {!mobileNavOpen && (
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="-ml-2 flex items-center gap-0.5 px-2 py-2 text-primary font-semibold text-sm cursor-pointer active:opacity-60"
            >
              <ChevronLeft size={20} /> Settings
            </button>
          )}
          <h1 className="font-heading font-bold text-slate-900 text-base flex-1 text-center pr-8">
            {mobileNavOpen ? 'Settings' : activeTab.label}
          </h1>
        </div>
      </div>

      {/* Error banner */}
      {saveError && (
        <div className="flex items-start gap-2.5 px-4 py-3 mb-4 md:mb-6 mt-4 md:mt-0 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <div><p className="font-bold">Save failed</p><p className="text-xs mt-0.5 font-mono">{saveError}</p></div>
        </div>
      )}

      {/* Settings layout: sidebar + panel */}
      <div className="flex flex-col md:flex-row md:gap-6 md:items-start mt-4 md:mt-0">

        {/* ── Left sidebar (desktop) / Index list (mobile) ─────────── */}
        <nav className={`md:w-52 md:shrink-0 bg-white rounded-2xl border border-slate-100 overflow-hidden md:sticky md:top-6 ${mobileNavOpen ? 'block' : 'hidden'} md:block`}>
          {TABS.map(t => {
            const Icon    = t.icon
            const isActive = tab === t.id
            const isDanger = t.id === 'danger'
            return (
              <button key={t.id}
                onClick={() => { setTab(t.id); setMobileNavOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-4 md:py-3.5 text-left transition-all duration-150 cursor-pointer relative border-b border-slate-50 last:border-b-0 md:border-b-0 ${
                  isActive
                    ? isDanger
                      ? 'md:bg-red-50 md:text-red-600 text-red-500'
                      : 'md:bg-primary-bg md:text-primary text-slate-700'
                    : isDanger
                    ? 'text-red-500 md:text-red-400 active:bg-red-50 md:hover:bg-red-50 md:hover:text-red-600'
                    : 'text-slate-700 active:bg-slate-50 md:hover:bg-slate-50 md:hover:text-slate-900'
                }`}>
                {isActive && (
                  <span className={`hidden md:block absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full ${isDanger ? 'bg-red-500' : 'bg-primary'}`} />
                )}
                <div className={`w-9 h-9 md:w-7 md:h-7 rounded-xl md:rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isActive
                    ? isDanger ? 'bg-red-100' : 'bg-primary/15'
                    : isDanger ? 'bg-red-50' : 'bg-slate-100'
                }`}>
                  <Icon size={16} className="md:hidden" />
                  <Icon size={14} className="hidden md:block" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-none">{t.label}</p>
                  <p className={`text-xs md:text-[10px] mt-1 md:mt-0.5 truncate ${isActive ? 'opacity-70' : 'text-slate-400'}`}>{t.desc}</p>
                </div>
                {/* Mobile chevron */}
                <ChevronRight size={16} className="md:hidden text-slate-300 shrink-0" />
              </button>
            )
          })}
        </nav>

        {/* ── Right panel ───────────────────────────────────────────── */}
        <div className={`flex-1 min-w-0 mt-4 md:mt-0 ${mobileNavOpen ? 'hidden' : 'block'} md:block`}>

          {/* Breadcrumb — desktop only (mobile uses sticky back-bar instead) */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 mb-4">
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
                    {/* Live wordmark preview — exactly how it renders in header / footer / sidebar / auth pages */}
                    {(() => {
                      const { primary, accent } = splitBrandName(store.STORE_NAME)
                      const clean = cleanBrandName(store.STORE_NAME)
                      return (
                        <div className="mt-2 flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Preview</span>
                          <span className="font-heading font-bold text-slate-800 text-base">
                            {primary}
                            {accent && <span className="iridescent-text">{accent}</span>}
                          </span>
                          {!accent && clean && (
                            <span className="text-[10px] text-slate-400 ml-auto">No accent — add a <code className="bg-white px-1 rounded">|</code> to colour part of the name</span>
                          )}
                        </div>
                      )
                    })()}
                    <Hint>
                      Add a single <code className="bg-slate-100 px-1 rounded">|</code> where you want the iridescent accent to begin.
                      Example: <code className="bg-slate-100 px-1 rounded">Bala|pasa</code> renders as
                      &ldquo;Bala<span className="iridescent-text font-bold">pasa</span>&rdquo; in the header, footer, admin sidebar, and auth pages.
                      Without a <code className="bg-slate-100 px-1 rounded">|</code> the whole name shows in plain text.
                      The pipe is stripped from titles, emails, and metadata.
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

                  <div className="mt-4">
                    <Label>Return Window (days)</Label>
                    <input type="number" min="0" max="60" value={store.RETURN_WINDOW_DAYS}
                      onChange={e => setStore(s => ({ ...s, RETURN_WINDOW_DAYS: e.target.value }))}
                      placeholder="7" className={inputCls + ' max-w-xs'} />
                    <Hint>How long a customer can request a return after delivery. Set to 0 to disable returns entirely.</Hint>
                  </div>

                  <div className="mt-4">
                    <Label>Order Code Prefix</Label>
                    <input
                      value={store.ORDER_CODE_PREFIX}
                      onChange={e => setStore(s => ({ ...s, ORDER_CODE_PREFIX: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) }))}
                      placeholder="BLP"
                      className={inputCls + ' max-w-xs font-mono'}
                    />
                    <Hint>
                      Short brand tag prepended to every order code (e.g. <code className="bg-slate-100 px-1 rounded">BLP</code> → <code className="bg-slate-100 px-1 rounded">BLP-WOOD-948-0001</code>).
                      Letters and numbers only, max 8 characters. Changing this only affects <em>new</em> orders.
                    </Hint>
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

          {/* ── Content tab (legal pages, about, contact, FAQ) ────── */}
          {/* Legal page default templates — loaded on demand via "Load defaults" button */}
          {tab === 'content' && (
            <form onSubmit={e => {
              e.preventDefault()
              const cleanFaq = faq.filter(f => f.question.trim() && f.answer.trim())
              save('content', {
                ...content,
                FAQ_JSON: JSON.stringify(cleanFaq),
              })
            }}>
              <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
                <InfoBanner icon={Info} color="bg-blue-50 border border-blue-100 text-blue-700">
                  Body fields accept <strong>Markdown</strong> — use <code className="font-mono bg-white px-1 rounded text-[10px]">## heading</code>, <code className="font-mono bg-white px-1 rounded text-[10px]">**bold**</code>, <code className="font-mono bg-white px-1 rounded text-[10px]">- bullet</code>, and <code className="font-mono bg-white px-1 rounded text-[10px]">[link](https://…)</code>. Untouched fields show built-in defaults; once you save a value it sticks (clearing the textarea later won&apos;t revert it).
                </InfoBanner>

                {/* Legal pages */}
                <SectionTitle>Legal pages</SectionTitle>
                <div className="space-y-5">
                  {(([
                    ['LEGAL_PRIVACY_BODY',      'Privacy Policy — /privacy'],
                    ['LEGAL_TERMS_BODY',         'Terms of Service — /terms'],
                    ['LEGAL_REFUND_BODY',        'Refund & Return Policy — /refund-policy'],
                    ['LEGAL_SHIPPING_BODY',      'Shipping Policy — /shipping-policy'],
                    ['LEGAL_CANCELLATION_BODY',  'Cancellation Policy — /cancellation-policy'],
                  ] as const).map(([key, label]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label>{label}</Label>
                        {!content[key] && (
                          <button
                            type="button"
                            onClick={() => setContent(s => ({ ...s, [key]: LEGAL_DEFAULTS[key] }))}
                            className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                          >
                            Load defaults
                          </button>
                        )}
                      </div>
                      <textarea value={content[key]}
                        onChange={e => setContent(s => ({ ...s, [key]: e.target.value }))}
                        rows={8} placeholder="Markdown supported… (click Load defaults for a starter template)" className={`${inputCls} font-mono text-xs`} />
                    </div>
                  )))}
                </div>

                {/* About */}
                <div className="border-t border-slate-50 pt-5">
                  <SectionTitle>About page — /about</SectionTitle>
                  <div className="space-y-3">
                    <div>
                      <Label>Title</Label>
                      <input value={content.ABOUT_TITLE}
                        onChange={e => setContent(s => ({ ...s, ABOUT_TITLE: e.target.value }))}
                        placeholder="About us" className={inputCls} />
                    </div>
                    <div>
                      <Label>Body (Markdown)</Label>
                      <textarea value={content.ABOUT_BODY}
                        onChange={e => setContent(s => ({ ...s, ABOUT_BODY: e.target.value }))}
                        rows={10} placeholder="Markdown supported…" className={`${inputCls} font-mono text-xs`} />
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="border-t border-slate-50 pt-5">
                  <SectionTitle>Contact page — /contact</SectionTitle>
                  <Hint>Email, phone, address and WhatsApp number are pulled from the <strong>Store</strong> tab. Extra channels and hours live here.</Hint>
                  <div className="grid sm:grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label>Instagram URL</Label>
                      <input value={content.CONTACT_INSTAGRAM}
                        onChange={e => setContent(s => ({ ...s, CONTACT_INSTAGRAM: e.target.value }))}
                        placeholder="https://instagram.com/yourhandle" className={`${inputCls} font-mono text-xs`} />
                    </div>
                    <div>
                      <Label>X (Twitter) URL</Label>
                      <input value={content.CONTACT_X}
                        onChange={e => setContent(s => ({ ...s, CONTACT_X: e.target.value }))}
                        placeholder="https://x.com/yourhandle" className={`${inputCls} font-mono text-xs`} />
                    </div>
                    <div>
                      <Label>YouTube URL</Label>
                      <input value={content.CONTACT_YOUTUBE}
                        onChange={e => setContent(s => ({ ...s, CONTACT_YOUTUBE: e.target.value }))}
                        placeholder="https://youtube.com/@yourchannel" className={`${inputCls} font-mono text-xs`} />
                    </div>
                    <div>
                      <Label>Business hours</Label>
                      <input value={content.CONTACT_HOURS}
                        onChange={e => setContent(s => ({ ...s, CONTACT_HOURS: e.target.value }))}
                        placeholder="Sun – Fri, 10:00 – 18:00" className={inputCls} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Google Maps embed URL</Label>
                      <input value={content.CONTACT_MAP_EMBED}
                        onChange={e => setContent(s => ({ ...s, CONTACT_MAP_EMBED: e.target.value }))}
                        placeholder="https://www.google.com/maps/embed?pb=…"
                        className={`${inputCls} font-mono text-xs`} />
                      <Hint>From Google Maps → Share → Embed a map → copy the <code className="font-mono bg-slate-100 px-1 rounded">src</code> URL only.</Hint>
                    </div>
                  </div>
                </div>

                {/* FAQ */}
                <div className="border-t border-slate-50 pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <SectionTitle>FAQ — /faq</SectionTitle>
                    <button type="button"
                      onClick={() => setFaq(f => [...f, { question: '', answer: '' }])}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary/15 transition-colors">
                      <Plus size={13} /> Add question
                    </button>
                  </div>
                  <Hint>Up to 20 question/answer pairs. Empty rows are removed on save.</Hint>
                  <div className="space-y-3 mt-3">
                    {faq.map((item, i) => (
                      <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 w-6 shrink-0">#{i + 1}</span>
                          <input value={item.question}
                            onChange={e => {
                              const arr = [...faq]
                              arr[i] = { ...arr[i], question: e.target.value }
                              setFaq(arr)
                            }}
                            placeholder="Question…" maxLength={150}
                            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-primary" />
                          <button type="button"
                            onClick={() => setFaq(f => f.filter((_, j) => j !== i))}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors"
                            aria-label="Remove question">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <textarea value={item.answer}
                          onChange={e => {
                            const arr = [...faq]
                            arr[i] = { ...arr[i], answer: e.target.value }
                            setFaq(arr)
                          }}
                          rows={3} placeholder="Answer…"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-primary" />
                      </div>
                    ))}
                    {faq.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-6">No questions yet — click <em>Add question</em> to get started.</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-50">
                  <SaveBtn section="content" saving={saving} saved={saved} />
                </div>
              </div>
            </form>
          )}

          {/* ── Notices tab ───────────────────────────────────────── */}
          {tab === 'notices' && (
            <NoticesSection saving={saving} saved={saved} onSave={save} />
          )}

          {tab === 'tracking' && (
            <TrackingSection saving={saving} saved={saved} onSave={save} />
          )}

          {/* ── Payments tab ──────────────────────────────────────── */}
          {tab === 'payments' && (
            <form onSubmit={e => { e.preventDefault(); save('payment', payment as unknown as Record<string, string>) }}>
              <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
                <InfoBanner icon={Shield} color="bg-slate-50 border border-slate-100 text-slate-600">
                  Keys saved here are masked in the UI and override <code className="font-mono bg-white px-1 rounded text-[10px]">.env.local</code> values. They take effect immediately.
                </InfoBanner>

                {/* COD */}
                <div>
                  <SectionTitle>Cash on Delivery</SectionTitle>
                  <div className="border border-slate-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                          <span className="text-xs font-extrabold text-amber-700">₨</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Cash on Delivery</p>
                          <p className="text-[10px] text-slate-400">Customer pays the courier on receipt</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={payment.PAYMENT_COD_ENABLED === 'true'}
                        aria-label="Offer COD at checkout"
                        onClick={() => {
                          const turningOff = payment.PAYMENT_COD_ENABLED === 'true'
                          const updates: Record<string, string> = { PAYMENT_COD_ENABLED: turningOff ? 'false' : 'true' }
                          // Auto-enable digital payments if COD is being turned off and digital is off
                          if (turningOff && payment.PAYMENT_DIGITAL_ENABLED !== 'true') {
                            updates.PAYMENT_DIGITAL_ENABLED = 'true'
                          }
                          setPayment(p => ({ ...p, ...updates }))
                          save('payment', updates)
                        }}
                        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${payment.PAYMENT_COD_ENABLED === 'true' ? 'bg-amber-500' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${payment.PAYMENT_COD_ENABLED === 'true' ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Digital Payments master toggle */}
                <div>
                  <SectionTitle>Digital Payments</SectionTitle>
                  <div className="border border-slate-100 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                          <CreditCard size={15} className="text-blue-700" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Digital Payments</p>
                          <p className="text-[10px] text-slate-400">Master switch for eSewa &amp; Khalti</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={payment.PAYMENT_DIGITAL_ENABLED === 'true'}
                        aria-label="Enable digital payments"
                        onClick={() => {
                          const turningOff = payment.PAYMENT_DIGITAL_ENABLED === 'true'
                          const updates: Record<string, string> = { PAYMENT_DIGITAL_ENABLED: turningOff ? 'false' : 'true' }
                          // Auto-enable COD if digital is being turned off and COD is off
                          if (turningOff && payment.PAYMENT_COD_ENABLED !== 'true') {
                            updates.PAYMENT_COD_ENABLED = 'true'
                          }
                          setPayment(p => ({ ...p, ...updates }))
                          save('payment', updates)
                        }}
                        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${payment.PAYMENT_DIGITAL_ENABLED === 'true' ? 'bg-blue-500' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${payment.PAYMENT_DIGITAL_ENABLED === 'true' ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {payment.PAYMENT_DIGITAL_ENABLED !== 'true' && (
                      <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                        Digital payments are disabled. eSewa and Khalti will not appear at checkout.
                      </p>
                    )}
                  </div>
                </div>

                {/* eSewa */}
                <div className={payment.PAYMENT_DIGITAL_ENABLED !== 'true' ? 'opacity-40 pointer-events-none' : ''}>
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
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={payment.PAYMENT_ESEWA_ENABLED === 'true'}
                          aria-label="Offer eSewa at checkout"
                          onClick={() => {
                            const next = payment.PAYMENT_ESEWA_ENABLED === 'true' ? 'false' : 'true'
                            setPayment(p => ({ ...p, PAYMENT_ESEWA_ENABLED: next }))
                            save('payment', { PAYMENT_ESEWA_ENABLED: next })
                          }}
                          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${payment.PAYMENT_ESEWA_ENABLED === 'true' ? 'bg-green-500' : 'bg-slate-300'}`}
                          title={payment.PAYMENT_ESEWA_ENABLED === 'true' ? 'Hide eSewa from checkout' : 'Offer eSewa at checkout'}
                        >
                          <span className={`absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${payment.PAYMENT_ESEWA_ENABLED === 'true' ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                        </button>
                        <a href="https://merchant.esewa.com.np" target="_blank" rel="noopener"
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-primary cursor-pointer transition-colors">
                          Dashboard <ExternalLink size={11} />
                        </a>
                      </div>
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
                      <div>
                        <Label>Form Base URL</Label>
                        <input value={payment.ESEWA_BASE_URL}
                          onChange={e => setPayment(p => ({ ...p, ESEWA_BASE_URL: e.target.value }))}
                          placeholder="https://rc-epay.esewa.com.np" className={`${inputCls} font-mono text-[11px]`} />
                        <Hint>Sandbox: rc-epay.esewa.com.np · Live: epay.esewa.com.np</Hint>
                      </div>
                      <div>
                        <Label>Status Check URL</Label>
                        <input value={payment.ESEWA_STATUS_URL}
                          onChange={e => setPayment(p => ({ ...p, ESEWA_STATUS_URL: e.target.value }))}
                          placeholder="https://rc.esewa.com.np/api/epay/transaction/status/" className={`${inputCls} font-mono text-[11px]`} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Khalti */}
                <div className={payment.PAYMENT_DIGITAL_ENABLED !== 'true' ? 'opacity-40 pointer-events-none' : ''}>
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
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={payment.PAYMENT_KHALTI_ENABLED === 'true'}
                          aria-label="Offer Khalti at checkout"
                          onClick={() => {
                            const next = payment.PAYMENT_KHALTI_ENABLED === 'true' ? 'false' : 'true'
                            setPayment(p => ({ ...p, PAYMENT_KHALTI_ENABLED: next }))
                            save('payment', { PAYMENT_KHALTI_ENABLED: next })
                          }}
                          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${payment.PAYMENT_KHALTI_ENABLED === 'true' ? 'bg-purple-500' : 'bg-slate-300'}`}
                          title={payment.PAYMENT_KHALTI_ENABLED === 'true' ? 'Hide Khalti from checkout' : 'Offer Khalti at checkout'}
                        >
                          <span className={`absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${payment.PAYMENT_KHALTI_ENABLED === 'true' ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                        </button>
                        <a href="https://admin.khalti.com" target="_blank" rel="noopener"
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-primary cursor-pointer transition-colors">
                          Dashboard <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <SecretInput label="Secret Key" value={payment.KHALTI_SECRET_KEY}
                        onChange={v => setPayment(p => ({ ...p, KHALTI_SECRET_KEY: v }))}
                        placeholder="live_secret_key_..."
                        hint="Use live_ prefix for production, test_secret_key_ for sandbox" />
                      <div>
                        <Label>Public Key</Label>
                        <input value={payment.KHALTI_PUBLIC_KEY}
                          onChange={e => setPayment(p => ({ ...p, KHALTI_PUBLIC_KEY: e.target.value }))}
                          placeholder="live_public_key_..." className={`${inputCls} font-mono text-[11px]`} />
                        <Hint>Used by client-side Khalti SDK initialisation.</Hint>
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Base URL</Label>
                        <input value={payment.KHALTI_BASE_URL}
                          onChange={e => setPayment(p => ({ ...p, KHALTI_BASE_URL: e.target.value }))}
                          placeholder="https://dev.khalti.com" className={`${inputCls} font-mono text-[11px]`} />
                        <Hint>Sandbox: dev.khalti.com · Live: khalti.com</Hint>
                      </div>
                    </div>
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
              <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
                <EmailHealthCard />
                <div>
                  <SectionTitle>Email Alerts</SectionTitle>
                  <div className="max-w-md">
                    <Label>Order Notification Email</Label>
                    <input type="email" value={notif.ORDER_NOTIFICATION_EMAIL}
                      onChange={e => setNotif(n => ({ ...n, ORDER_NOTIFICATION_EMAIL: e.target.value }))}
                      placeholder="admin@yourstore.com" className={inputCls} />
                    <Hint>Receive an email whenever a new order is placed. Leave empty to disable.</Hint>

                    <label className="flex items-start gap-2.5 mt-4 cursor-pointer select-none">
                      <input type="checkbox" className="mt-0.5 w-4 h-4 accent-primary cursor-pointer"
                        checked={notif.ADMIN_STATUS_CHANGE_EMAIL === 'true'}
                        onChange={e => setNotif(n => ({ ...n, ADMIN_STATUS_CHANGE_EMAIL: e.target.checked ? 'true' : 'false' }))} />
                      <span className="text-sm text-slate-700">
                        Email me on every order status change
                        <span className="block text-xs text-slate-400 mt-0.5">Sends to the address above each time an order moves to Confirmed / Processing / Shipped / Delivered / Cancelled (manual or Pick &amp; Drop webhook).</span>
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <SectionTitle>Weather (checkout widget)</SectionTitle>
                  <div className="max-w-md">
                    <SecretInput label="OpenWeatherMap API Key" value={notif.OPENWEATHER_API_KEY}
                      onChange={v => setNotif(n => ({ ...n, OPENWEATHER_API_KEY: v }))}
                      placeholder="your-openweathermap-key"
                      hint="Powers the live weather widget on the checkout page. Free tier is fine — get one at openweathermap.org/api." />
                  </div>
                </div>

                <div>
                  <SectionTitle>Push Notifications (Firebase Cloud Messaging)</SectionTitle>
                  <p className="text-xs text-slate-500 mb-3 max-w-xl leading-relaxed">
                    Powers push notifications to the mobile apps (order, payment and delivery updates).
                    Get these from <span className="font-semibold">Firebase Console → Project Settings → Service accounts → Generate new private key</span>,
                    then copy the values out of the downloaded JSON. Until all three are set, pushes are silently skipped.
                  </p>
                  <div className="space-y-3 max-w-xl">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Project ID</Label>
                        <input value={notif.FCM_PROJECT_ID}
                          onChange={e => setNotif(n => ({ ...n, FCM_PROJECT_ID: e.target.value }))}
                          placeholder="your-project-id" className={inputCls} />
                        <Hint>The <code>project_id</code> field from the service-account JSON.</Hint>
                      </div>
                      <div>
                        <Label>Client Email</Label>
                        <input value={notif.FCM_CLIENT_EMAIL}
                          onChange={e => setNotif(n => ({ ...n, FCM_CLIENT_EMAIL: e.target.value }))}
                          placeholder="firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com" className={inputCls} />
                        <Hint>The <code>client_email</code> field.</Hint>
                      </div>
                    </div>
                    <div>
                      <Label>Private Key</Label>
                      <textarea value={notif.FCM_PRIVATE_KEY}
                        onChange={e => setNotif(n => ({ ...n, FCM_PRIVATE_KEY: e.target.value }))}
                        placeholder={'-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n'}
                        rows={4}
                        className={`${inputCls} font-mono text-xs resize-y`} />
                      {notif.FCM_PRIVATE_KEY.startsWith('••')
                        ? <p className="text-[10px] text-amber-600 mt-1">A key is set. Paste a new value to replace it.</p>
                        : <Hint>The full <code>private_key</code> value, including the BEGIN/END lines. Escaped <code>\n</code> or real line breaks both work.</Hint>}
                    </div>
                  </div>
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
          {tab === 'danger' && <DangerZone />}

        </div>
      </div>
    </div>
  )
}
