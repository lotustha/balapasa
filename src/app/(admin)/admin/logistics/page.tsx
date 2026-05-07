'use client'

import { useState, useEffect } from 'react'
import {
  Truck, Package, Save, RotateCcw, CheckCircle,
  Eye, EyeOff, AlertCircle, Loader2, Power,
} from 'lucide-react'

interface ProviderSettings {
  id?: string
  provider: string
  isActive: boolean
  isMock: boolean
  clientId?: string
  clientSecret?: string
  apiKey?: string
  apiSecret?: string
  storeId?: string
  storeName?: string
  storePhone?: string
  storeAddress?: string
  storeLat?: number | null
  storeLng?: number | null
  baseUrl?: string
  notes?: string
}

const DEFAULTS: Record<string, Partial<ProviderSettings>> = {
  PATHAO: {
    provider: 'PATHAO', isActive: true, isMock: true,
    clientId: 'dev_5e5612b011f438ca5b30a2d6',
    clientSecret: 'F62z4qB1IazJzzgMYhKyBpdRWWRoAiikbQdR-SDrYdI',
    storeId: 'MROQI3O9', storeName: 'Balapasa Store',
    storePhone: '01772793058',
    storeAddress: 'Concord Silvy Height, 73/A, Gulshan 1',
    storeLat: 23.784519208568934, storeLng: 90.4169082847168,
    baseUrl: 'https://enterprise-api.pathao.com',
  },
  PICKNDROP: {
    provider: 'PICKNDROP', isActive: true, isMock: false,
    apiKey: 'bf1a7ce75dacf51', apiSecret: '63b8931e70aee27',
    baseUrl: 'https://app-t.pickndropnepal.com',
  },
}

function SecretField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '••••••••'}
          className="w-full pl-4 pr-10 py-2.5 rounded-xl text-sm border border-gray-200 bg-white text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 bg-white text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </div>
  )
}

function ProviderCard({
  provider, icon: Icon, label, accent,
}: {
  provider: string; icon: typeof Truck; label: string; accent: string
}) {
  const [data, setData]   = useState<ProviderSettings>(DEFAULTS[provider] as ProviderSettings)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetch('/api/admin/logistics')
      .then(r => r.json())
      .then(j => {
        const row = j.settings?.find((s: ProviderSettings) => s.provider === provider)
        if (row) setData({ ...DEFAULTS[provider], ...row })
      })
      .catch(() => setError('Could not load settings'))
      .finally(() => setLoading(false))
  }, [provider])

  function set(k: keyof ProviderSettings, v: unknown) {
    setData(d => ({ ...d, [k]: v }))
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/admin/logistics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(await res.text())
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(String(e))
    }
    setSaving(false)
  }

  if (loading) return <div className="bg-white rounded-2xl border border-gray-100 p-8 animate-pulse h-48" />

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}15` }}>
            <Icon size={18} style={{ color: accent }} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{label}</h3>
            <p className="text-xs text-gray-400">{data.baseUrl}</p>
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => set('isActive', !data.isActive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              data.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <Power size={12} /> {data.isActive ? 'Active' : 'Disabled'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Mock mode (Pathao only) */}
        {provider === 'PATHAO' && (
          <div className="flex items-start justify-between p-4 rounded-2xl bg-amber-50 border border-amber-100">
            <div>
              <p className="font-bold text-sm text-amber-800">Mock / Test Mode</p>
              <p className="text-xs text-amber-600 mt-0.5 max-w-xs">
                When ON, returns simulated delivery options without calling the live Pathao API.
                Turn OFF once you have a live Pathao Enterprise account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => set('isMock', !data.isMock)}
              className={`shrink-0 ml-4 w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer relative ${
                data.isMock ? 'bg-amber-500' : 'bg-green-500'
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                data.isMock ? 'translate-x-0.5' : 'translate-x-5'
              }`} />
            </button>
          </div>
        )}

        {/* Credentials */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Credentials</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {provider === 'PATHAO' ? (
              <>
                <Field label="Client ID" value={data.clientId ?? ''} onChange={v => set('clientId', v)} placeholder="dev_..." />
                <SecretField label="Client Secret" value={data.clientSecret ?? ''} onChange={v => set('clientSecret', v)} />
              </>
            ) : (
              <>
                <Field label="API Key"    value={data.apiKey    ?? ''} onChange={v => set('apiKey', v)} />
                <SecretField label="API Secret" value={data.apiSecret ?? ''} onChange={v => set('apiSecret', v)} />
              </>
            )}
            <Field label="Base URL" value={data.baseUrl ?? ''} onChange={v => set('baseUrl', v)} />
            {provider === 'PATHAO' && (
              <Field label="Store / External Store ID" value={data.storeId ?? ''} onChange={v => set('storeId', v)} placeholder="MROQI3O9" />
            )}
          </div>
        </div>

        {/* Store / Pickup details (Pathao only) */}
        {provider === 'PATHAO' && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Pickup / Store Details</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Store Name" value={data.storeName ?? ''} onChange={v => set('storeName', v)} placeholder="Balapasa Store" />
              <Field label="Store Phone" value={data.storePhone ?? ''} onChange={v => set('storePhone', v)} placeholder="01XXXXXXXXX" />
              <div className="sm:col-span-2">
                <Field label="Store Address" value={data.storeAddress ?? ''} onChange={v => set('storeAddress', v)} placeholder="Full pickup address" />
              </div>
              <Field label="Latitude" value={String(data.storeLat ?? '')} onChange={v => set('storeLat', parseFloat(v))} placeholder="23.784519..." type="number" />
              <Field label="Longitude" value={String(data.storeLng ?? '')} onChange={v => set('storeLng', parseFloat(v))} placeholder="90.416908..." type="number" />
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
          <textarea
            value={data.notes ?? ''}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            placeholder="Internal notes about this provider..."
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 bg-white text-gray-800 outline-none focus:border-primary resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-600 border border-red-100">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:bg-gray-300 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : saved  ? <><CheckCircle size={14} /> Saved!</>
              : <><Save size={14} /> Save Changes</>}
          </button>
          <button
            onClick={() => setData(DEFAULTS[provider] as ProviderSettings)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} /> Reset defaults
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LogisticsSettingsPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-heading font-extrabold text-3xl text-gray-900">Logistics Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage delivery provider credentials and configuration. Changes take effect immediately without restarting the server.
        </p>
      </div>

      <div className="space-y-6">
        <ProviderCard provider="PATHAO"    icon={Truck}   label="Pathao Delivery"  accent="#F97316" />
        <ProviderCard provider="PICKNDROP" icon={Package} label="Pick & Drop Nepal" accent="#0EA5E9" />
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-2xl border border-blue-100 text-sm text-blue-700">
        <strong>How it works:</strong> Settings are stored in the database and take precedence over environment variables.
        The config is cached in memory for 30 seconds per server process.
        Saving a new credential immediately invalidates the cache and any cached auth tokens.
      </div>
    </div>
  )
}
