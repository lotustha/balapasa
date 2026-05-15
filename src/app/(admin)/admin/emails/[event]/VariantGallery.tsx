'use client'

import { useState, useMemo } from 'react'
import { Check, Loader2, AlertCircle, Maximize2, X } from 'lucide-react'

interface Variant {
  id:          string
  name:        string
  description: string
  accent:      string
}

interface Props {
  eventId:           string
  initialActiveId:   string
  variants:          Variant[]
  hasStatusVariants: boolean
}

type Status = 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

export default function VariantGallery({
  eventId,
  initialActiveId,
  variants,
  hasStatusVariants,
}: Props) {
  const [activeId, setActiveId] = useState(initialActiveId)
  const [status,   setStatus]   = useState<Status>('SHIPPED')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [zoomId,   setZoomId]   = useState<string | null>(null)

  function previewSrc(variantId: string) {
    const params = new URLSearchParams({ event: eventId, variant: variantId })
    if (hasStatusVariants) params.set('status', status)
    return `/api/admin/emails/preview?${params.toString()}`
  }

  // Bust iframe cache when the status flips so previews actually re-render.
  const previewKey = useMemo(() => `${status}-${Date.now() % 1_000_000}`, [status])

  async function activate(variantId: string) {
    setSavingId(variantId)
    setError(null)
    try {
      const res  = await fetch(`/api/admin/emails/templates/${eventId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ variantId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to activate')
      setActiveId(variantId)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-5">
      {hasStatusVariants && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mr-2">Preview status</span>
          {(['SHIPPED', 'DELIVERED', 'CANCELLED'] as Status[]).map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                status === s
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 text-rose-700 text-sm font-semibold p-3 ring-1 ring-rose-200">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {variants.map(v => {
          const isActive = v.id === activeId
          const isSaving = savingId === v.id
          return (
            <div
              key={v.id}
              className={`relative rounded-2xl overflow-hidden border bg-white transition-all duration-200 ${
                isActive ? 'border-slate-900 shadow-lg ring-2 ring-slate-900/10' : 'border-slate-200 hover:shadow-md hover:border-slate-300'
              }`}
            >
              <div className="h-1.5" style={{ background: v.accent }} />

              <div className="relative bg-slate-50 border-b border-slate-200" style={{ height: 320 }}>
                <iframe
                  key={previewKey}
                  src={previewSrc(v.id)}
                  sandbox=""
                  className="w-full h-full pointer-events-none"
                  loading="lazy"
                  title={`${v.name} preview`}
                />
                {/* Capture pointer so the iframe doesn't steal clicks */}
                <div className="absolute inset-0" />
                <button
                  onClick={() => setZoomId(v.id)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-white/90 backdrop-blur shadow ring-1 ring-slate-200 hover:ring-slate-400 flex items-center justify-center cursor-pointer transition"
                  aria-label="Zoom preview"
                >
                  <Maximize2 size={14} className="text-slate-700" />
                </button>
                {isActive && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold shadow">
                    <Check size={11} /> Active
                  </span>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start gap-2 mb-1">
                  <h3 className="font-heading font-bold text-slate-900 text-base flex-1">{v.name}</h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: v.accent + '20', color: v.accent }}>
                    {v.id}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-snug mb-4 min-h-[2.5rem]">{v.description}</p>

                <button
                  onClick={() => activate(v.id)}
                  disabled={isActive || isSaving}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                      : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60'
                  }`}
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : isActive ? <Check size={14} /> : null}
                  {isActive ? 'Active template' : isSaving ? 'Activating…' : 'Use this template'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {zoomId && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setZoomId(null)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-3xl"
            style={{ height: 'min(85vh, 800px)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomId(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white shadow ring-1 ring-slate-200 hover:ring-slate-400 flex items-center justify-center cursor-pointer transition"
              aria-label="Close preview"
            >
              <X size={16} className="text-slate-700" />
            </button>
            <iframe
              key={previewKey + zoomId}
              src={previewSrc(zoomId)}
              sandbox=""
              className="w-full h-full"
              title="Email preview"
            />
          </div>
        </div>
      )}
    </div>
  )
}
