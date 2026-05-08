'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, RefreshCw, Lock, Unlock, Plus, X,
  Loader2, CheckCircle2, AlertCircle, Image as ImageIcon,
  Sparkles, Wand2, Tag, ChevronDown, Link as LinkIcon,
} from 'lucide-react'
import CreatableSelect, { type SelectOption } from '@/components/ui/CreatableSelect'
import BrandInput from '@/components/ui/BrandInput'
import VariantsEditor, { type VOption, type VVariant } from '@/components/admin/VariantsEditor'
import ImageUploader from '@/components/admin/ImageUploader'
import VideoUploader    from '@/components/admin/VideoUploader'
import RichTextEditor  from '@/components/admin/RichTextEditor'

interface Category { id: string; name: string }
interface Supplier  { id: string; name: string }

export interface ProductData {
  id?: string
  name: string; slug: string; sku: string; description: string; images: string[]
  videoUrl: string
  price: string; salePrice: string; salePriceExpiresAt: string; costPrice: string; isTaxable: boolean
  trackInventory: boolean; stock: string; lowStockThreshold: string
  barcode: string; weight: string
  categoryId: string; supplierId: string; brand: string; tags: string[]
  isActive: boolean; isFeatured: boolean; isNew: boolean
  boughtTogetherIds: string[]
}

const EMPTY: ProductData = {
  name: '', slug: '', sku: '', description: '', images: [], videoUrl: '',
  price: '', salePrice: '', salePriceExpiresAt: '', costPrice: '', isTaxable: false,
  trackInventory: true, stock: '0', lowStockThreshold: '10',
  barcode: '', weight: '',
  categoryId: '', supplierId: '', brand: '', tags: [],
  isActive: true, isFeatured: false, isNew: true,
  boughtTogetherIds: [],
}

function discountPct(price: string, salePrice: string) {
  const p = Number(price), s = Number(salePrice)
  if (!p || !s || s >= p) return 0
  return Math.round(((p - s) / p) * 100)
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
}
function generateSKU(name: string) {
  const code = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase().padEnd(4, 'X')
  return `BLP-${code}-${Math.floor(Math.random() * 900) + 100}`
}

// ── Sub-components ─────────────────────────────────────────────────────────

function AutoField({ label, value, onChange, hint, mono, onRegenerate }: {
  label: string; value: string; onChange: (v: string) => void
  hint?: string; mono?: boolean; onRegenerate?: () => void
}) {
  const [locked, setLocked] = useState(true)
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
        <div className="flex items-center gap-1.5">
          {locked && <span className="text-[10px] font-bold text-primary bg-primary-bg px-2 py-0.5 rounded-full">auto</span>}
          <button type="button" onClick={() => setLocked(l => !l)} title="Toggle auto-update" className="text-slate-400 hover:text-slate-700 cursor-pointer">
            {locked ? <Lock size={11} /> : <Unlock size={11} />}
          </button>
          {onRegenerate && (
            <button type="button" onClick={() => { onRegenerate(); setLocked(true) }} title="Regenerate" className="text-slate-400 hover:text-primary cursor-pointer">
              <RefreshCw size={11} />
            </button>
          )}
        </div>
      </div>
      <input type="text" value={value} readOnly={locked}
        onChange={e => { setLocked(false); onChange(e.target.value) }}
        className={`w-full px-3 py-2.5 rounded-xl text-sm border transition-all outline-none
          ${mono ? 'font-mono tracking-wide' : ''}
          ${locked ? 'bg-slate-50 border-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/10'}`}
      />
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')
  function add(val?: string) {
    const v = (val ?? input).trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setInput('')
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(t => (
        <span key={t} className="flex items-center gap-1 px-2.5 py-1 bg-primary-bg text-primary text-xs font-bold rounded-full">
          {t}<button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="hover:text-red-500 cursor-pointer ml-0.5"><X size={9} /></button>
        </span>
      ))}
      <div className="flex gap-1.5 flex-1 min-w-[160px]">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
          placeholder="Type tag, press Enter…"
          className="flex-1 px-3 py-1.5 rounded-lg text-xs border border-slate-200 bg-white outline-none focus:border-primary transition-all" />
        <button type="button" onClick={() => add()} className="px-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"><Plus size={12} /></button>
      </div>
    </div>
  )
}

function ImageInput({ images, onChange }: { images: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')
  function add() { const v = input.trim(); if (v && !images.includes(v)) onChange([...images, v]); setInput('') }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Paste image URL and press Enter…"
          className="flex-1 px-3 py-2.5 rounded-xl text-sm border border-slate-200 bg-white outline-none focus:border-primary transition-all" />
        <button type="button" onClick={add} className="px-3 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors cursor-pointer"><Plus size={14} /></button>
      </div>
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 group shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="w-full h-full object-cover" onError={e => ((e.target as HTMLElement).style.display = 'none')} />
              {i === 0 && <span className="absolute bottom-0 inset-x-0 text-[7px] font-bold bg-primary/90 text-white text-center py-0.5">PRIMARY</span>}
              <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))}
                className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center cursor-pointer">
                <X size={8} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-14 rounded-xl border-2 border-dashed border-slate-100 text-slate-300">
          <ImageIcon size={18} />
        </div>
      )}
    </div>
  )
}

function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <button type="button" onClick={() => onChange(!value)}
        className={`w-10 h-6 rounded-full transition-all duration-200 relative cursor-pointer shrink-0 ${value ? 'bg-primary' : 'bg-slate-200'}`}>
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-5' : 'left-1'}`} />
      </button>
    </div>
  )
}

// ── Sale Date-Time Picker ─────────────────────────────────────────────────

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const WEEK_DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

function SaleDateTimePicker({ value, onChange, onClear }: {
  value: string; onChange: (v: string) => void; onClear: () => void
}) {
  const [open, setOpen]   = useState(false)
  const parsed = value ? new Date(value) : null
  const [view, setView]   = useState(() => parsed ?? new Date())
  const [sel,  setSel]    = useState<Date | null>(parsed)
  const [hour, setHour]   = useState(parsed?.getHours() ?? 23)
  const [min,  setMin]    = useState(parsed?.getMinutes() ?? 59)

  const today    = new Date(); today.setHours(0,0,0,0)
  const firstDay = new Date(view.getFullYear(), view.getMonth(), 1).getDay()
  const daysInM  = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const cells    = Array.from({ length: firstDay + daysInM }, (_, i) => i < firstDay ? null : i - firstDay + 1)

  function pick(day: number) {
    const d = new Date(view.getFullYear(), view.getMonth(), day)
    if (d < today) return
    setSel(d)
  }

  function apply() {
    if (!sel) return
    const d = new Date(sel); d.setHours(hour, min, 0, 0)
    onChange(d.toISOString().slice(0, 16))
    setOpen(false)
  }

  function applyPreset(d: Date) {
    setSel(d); setHour(d.getHours()); setMin(d.getMinutes())
  }

  function makePreset(daysAhead: number) {
    const d = new Date(); d.setDate(d.getDate() + daysAhead); d.setHours(23, 59, 0, 0); return d
  }
  const presets = [
    { label: 'Tonight',  date: makePreset(0) },
    { label: '+3 days',  date: makePreset(3) },
    { label: '+7 days',  date: makePreset(7) },
    { label: '+30 days', date: makePreset(30) },
  ]

  function fmt(d: Date) {
    return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}  ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`
  }

  return (
    <>
      {/* Trigger */}
      <button type="button" onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm border transition-all cursor-pointer ${value ? 'bg-amber-50 border-amber-200 text-amber-800 font-semibold' : 'bg-white border-slate-200 text-slate-400 hover:border-primary/50'}`}>
        <span>{value && sel ? fmt(sel) : 'Click to set expiry date & time'}</span>
        <svg viewBox="0 0 20 20" className="w-4 h-4 shrink-0 text-current opacity-60" fill="currentColor">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs pointer-events-auto animate-fade-in-up overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-primary text-white">
                <button type="button" onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth()-1, 1))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                  <svg viewBox="0 0 20 20" className="w-4 h-4 fill-white"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                </button>
                <span className="font-bold text-sm">{MONTHS[view.getMonth()]} {view.getFullYear()}</span>
                <button type="button" onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth()+1, 1))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                  <svg viewBox="0 0 20 20" className="w-4 h-4 fill-white"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
                </button>
              </div>

              {/* Calendar */}
              <div className="p-3">
                <div className="grid grid-cols-7 mb-1">
                  {WEEK_DAYS.map(d => <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {cells.map((day, i) => {
                    if (!day) return <div key={i} />
                    const d = new Date(view.getFullYear(), view.getMonth(), day)
                    const isPast    = d < today
                    const isToday   = d.toDateString() === today.toDateString()
                    const isSelected = sel?.toDateString() === d.toDateString()
                    return (
                      <button key={i} type="button" onClick={() => pick(day)} disabled={isPast}
                        className={`w-8 h-8 mx-auto rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          isSelected ? 'bg-primary text-white shadow-md shadow-primary/30' :
                          isToday    ? 'border-2 border-primary text-primary' :
                          isPast     ? 'text-slate-200 cursor-not-allowed' :
                          'text-slate-700 hover:bg-primary-bg hover:text-primary'
                        }`}>
                        {day}
                      </button>
                    )
                  })}
                </div>

                {/* Time picker */}
                <div className="mt-3 flex items-center justify-center gap-2 bg-slate-50 rounded-xl p-2.5">
                  <svg viewBox="0 0 20 20" className="w-4 h-4 text-slate-400 shrink-0" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                  </svg>
                  <select value={hour} onChange={e => setHour(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 outline-none focus:border-primary cursor-pointer">
                    {Array.from({length:24},(_,i)=>(
                      <option key={i} value={i}>{String(i).padStart(2,'0')}</option>
                    ))}
                  </select>
                  <span className="font-extrabold text-slate-400">:</span>
                  <select value={min} onChange={e => setMin(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 outline-none focus:border-primary cursor-pointer">
                    {[0,15,30,45,59].map(m => (
                      <option key={m} value={m}>{String(m).padStart(2,'0')}</option>
                    ))}
                  </select>
                </div>

                {/* Presets */}
                <div className="flex gap-1.5 mt-2.5 flex-wrap">
                  {presets.map(({ label, date }) => (
                    <button key={label} type="button"
                      onClick={() => { applyPreset(date); setView(date) }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-primary-bg hover:text-primary text-slate-600 rounded-lg transition-colors cursor-pointer">
                      {label}
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  {value && (
                    <button type="button" onClick={() => { onClear(); setOpen(false) }}
                      className="flex-1 py-2 text-xs font-bold text-red-500 hover:bg-red-50 border border-red-100 rounded-xl transition-colors cursor-pointer">
                      Clear
                    </button>
                  )}
                  <button type="button" onClick={() => setOpen(false)}
                    className="flex-1 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button type="button" onClick={apply} disabled={!sel}
                    className="flex-1 py-2 text-xs font-bold bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer">
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ── Bought Together Picker ────────────────────────────────────────────────

interface SlimProduct { id: string; name: string; price: number; salePrice: number | null; images: string[] }

function BoughtTogetherPicker({
  currentId, selectedIds, onChange,
}: { currentId?: string; selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<SlimProduct[]>([])
  const [selected, setSelected] = useState<SlimProduct[]>([])
  const [loading,  setLoading]  = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load existing selected products on mount
  useEffect(() => {
    if (!selectedIds.length) return
    fetch(`/api/products?limit=50`)
      .then(r => r.json())
      .then(d => {
        const all: SlimProduct[] = d.products ?? []
        setSelected(all.filter(p => selectedIds.includes(p.id)))
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      fetch(`/api/products?search=${encodeURIComponent(query)}&limit=8`)
        .then(r => r.json())
        .then(d => setResults((d.products ?? []).filter((p: SlimProduct) => p.id !== currentId && !selectedIds.includes(p.id))))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 300)
  }, [query, currentId, selectedIds])

  function add(p: SlimProduct) {
    if (selected.length >= 4) return
    const next = [...selected, p]
    setSelected(next)
    onChange(next.map(x => x.id))
    setQuery(''); setResults([])
  }

  function remove(id: string) {
    const next = selected.filter(p => p.id !== id)
    setSelected(next)
    onChange(next.map(x => x.id))
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-extrabold flex items-center justify-center">5</span>
        <h2 className="font-heading font-bold text-slate-800 text-sm">Frequently Bought Together</h2>
        <span className="text-[10px] text-slate-400 ml-auto">up to 4 products</span>
      </div>

      {/* Selected products */}
      {selected.length > 0 && (
        <div className="space-y-2">
          {selected.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
              {p.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-slate-100" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                <p className="text-xs text-slate-500">
                  NPR {(p.salePrice ?? p.price).toLocaleString()}
                  {p.salePrice && <span className="line-through text-slate-300 ml-1">NPR {p.price.toLocaleString()}</span>}
                </p>
              </div>
              <button type="button" onClick={() => remove(p.id)}
                className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center cursor-pointer transition-colors shrink-0">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {selected.length < 4 && (
        <div className="relative">
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search products to bundle…"
            className="w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all pr-8"
          />
          {loading && <Loader2 size={13} className="absolute right-3 top-3 text-slate-400 animate-spin" />}
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
              {results.map(p => (
                <button key={p.id} type="button" onClick={() => add(p)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer text-left border-b border-slate-50 last:border-0">
                  {p.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 bg-slate-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">NPR {(p.salePrice ?? p.price).toLocaleString()}</p>
                  </div>
                  <Plus size={14} className="text-primary shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selected.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-2">
          No products added — customers will see top-rated products instead
        </p>
      )}
    </div>
  )
}

// ── Category hint banner (extracted to avoid conditional hook) ───────────

function CategoryHintBanner({
  hint, categories,
  onDismiss,
  onMapped,
  onCreated,
}: {
  hint: string
  categories: { id: string; name: string }[]
  onDismiss: () => void
  onMapped: (catId: string) => void
  onCreated: (cat: { id: string; name: string }) => void
}) {
  const [saving, setSaving] = useState(false)

  async function createAndMap() {
    setSaving(true)
    const res = await fetch('/api/admin/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: hint }),
    })
    const cat = await res.json()
    if (res.ok) {
      onCreated(cat)
      await fetch('/api/admin/category-mappings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'daraz', externalName: hint, categoryId: cat.id }),
      })
      onDismiss()
    }
    setSaving(false)
  }

  async function mapExisting(catId: string) {
    if (!catId) return
    onMapped(catId)
    await fetch('/api/admin/category-mappings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'daraz', externalName: hint, categoryId: catId }),
    })
    onDismiss()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
        <AlertCircle size={12} className="shrink-0" />
        <span>Daraz category: <strong>{hint}</strong> — select a match or create new</span>
        <button type="button" onClick={onDismiss} className="ml-auto text-amber-400 hover:text-amber-600 cursor-pointer"><X size={11} /></button>
      </div>
      <div className="flex gap-2">
        <select
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary"
          defaultValue=""
          onChange={e => e.target.value && mapExisting(e.target.value)}
        >
          <option value="">Map to existing category…</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="button" onClick={createAndMap} disabled={saving}
          className="flex items-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors whitespace-nowrap shrink-0">
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          Create & Map
        </button>
      </div>
      <p className="text-[10px] text-slate-400 px-1">Mapping is saved — future imports of &ldquo;{hint}&rdquo; will auto-select your chosen category.</p>
    </div>
  )
}

// ── AI Model registry ─────────────────────────────────────────────────────

const AI_PROVIDERS = {
  claude: {
    label: 'Claude', color: 'bg-violet-600', hoverColor: 'hover:bg-violet-700', textColor: 'text-violet-700', bgColor: 'bg-violet-50',
    models: [
      { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5',  badge: 'Fast · $0.001'  },
      { id: 'claude-sonnet-4-6',         label: 'Sonnet 4.6', badge: 'Smart · $0.003'  },
      { id: 'claude-opus-4-7',           label: 'Opus 4.7',   badge: 'Best · $0.015'   },
    ],
  },
  gemini: {
    label: 'Gemini', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600', textColor: 'text-blue-700', bgColor: 'bg-blue-50',
    models: [
      { id: 'gemini-2.5-flash-lite', label: 'Flash Lite',  badge: 'Fastest · Free'  },
      { id: 'gemini-2.5-flash',      label: 'Flash 2.5',   badge: 'Fast · $0.0003'  },
      { id: 'gemini-2.5-pro',        label: 'Pro 2.5',     badge: 'Best · $0.004'   },
    ],
  },
} as const

type ProviderKey = keyof typeof AI_PROVIDERS

// ── AI Toolbar ─────────────────────────────────────────────────────────────

function AIToolbar({
  name, category, brand, description, onDescriptionChange, tags, onTagsChange,
}: {
  name: string; category: string; brand: string; description: string
  onDescriptionChange: (v: string) => void; tags: string[]; onTagsChange: (t: string[]) => void
}) {
  const [aiLoading,  setAiLoading]  = useState(false)
  const [tagLoading, setTagLoading] = useState(false)
  const [aiMode,     setAiMode]     = useState<'generate' | 'improve' | 'shorter' | 'detailed'>('generate')
  const [showModes,  setShowModes]  = useState(false)
  const [provider,   setProvider]   = useState<ProviderKey>('claude')
  const [modelId,    setModelId]    = useState(AI_PROVIDERS.claude.models[0].id)
  const [showModels, setShowModels] = useState(false)
  const [error,      setError]      = useState('')
  const [configured, setConfigured] = useState<Record<ProviderKey, boolean>>({ claude: false, gemini: false })
  const [statusLoading, setStatusLoading] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  // Fetch which providers are configured
  useEffect(() => {
    fetch('/api/admin/ai/status')
      .then(r => r.json())
      .then(d => {
        const cfg = { claude: !!d.claude?.configured, gemini: !!d.gemini?.configured }
        setConfigured(cfg)
        // Auto-select first available provider
        const first = (Object.keys(cfg) as ProviderKey[]).find(k => cfg[k])
        if (first && !cfg[provider]) {
          setProvider(first)
          setModelId(AI_PROVIDERS[first].models[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setStatusLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const availableProviders = (Object.keys(AI_PROVIDERS) as ProviderKey[]).filter(k => configured[k])
  const anyConfigured = availableProviders.length > 0

  const prov   = AI_PROVIDERS[provider]
  const models = prov.models as readonly { id: string; label: string; badge: string }[]
  const selectedModel = models.find(m => m.id === modelId) ?? models[0]

  function switchProvider(p: ProviderKey) {
    setProvider(p)
    setModelId(AI_PROVIDERS[p].models[0].id)
    setShowModels(false)
  }

  const MODES = [
    { value: 'generate' as const, label: 'Generate from name' },
    { value: 'improve'  as const, label: 'Improve existing'   },
    { value: 'shorter'  as const, label: 'Make shorter'        },
    { value: 'detailed' as const, label: 'Add more detail'     },
  ]

  async function runAI() {
    if (!name) { setError('Enter a product name first'); return }
    setAiLoading(true); setError(''); setShowModes(false)
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/admin/ai/describe', {
        method: 'POST', signal: abortRef.current.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, brand, existing: description, mode: aiMode, provider, model: modelId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'AI generation failed')
        return
      }

      if (aiMode === 'generate') onDescriptionChange('')
      const reader = res.body!.getReader()
      const dec    = new TextDecoder()
      let buf = aiMode === 'generate' ? '' : description.replace(/<[^>]+>/g, '')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        // Wrap plain text in paragraph tags for the rich text editor
        const html = buf.split('\n\n')
          .map(p => p.trim()).filter(Boolean)
          .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
          .join('')
        onDescriptionChange(html || buf)
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') setError('AI generation failed')
    } finally { setAiLoading(false) }
  }

  async function suggestTags() {
    if (!name) { setError('Enter a product name first'); return }
    setTagLoading(true); setError('')
    const res = await fetch('/api/admin/ai/tags', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, description, provider, model: modelId }),
    })
    const data = await res.json()
    if (data.tags?.length) {
      onTagsChange([...tags, ...data.tags.filter((t: string) => !tags.includes(t))])
    } else if (data.error) setError(data.error)
    setTagLoading(false)
  }

  // ── Loading state ───────────────────────────────────────────────────────
  if (statusLoading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center gap-2 text-slate-400 text-xs">
        <Loader2 size={13} className="animate-spin" /> Checking AI configuration…
      </div>
    )
  }

  // ── No keys configured ────────────────────────────────────────────────
  if (!anyConfigured) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-500">
          <Sparkles size={14} className="text-slate-400" />
          <span className="text-xs">AI writing assistant is not configured.</span>
        </div>
        <a href="/admin/settings" target="_blank"
          className="text-xs font-bold text-primary hover:underline cursor-pointer shrink-0">
          Add API key in Settings →
        </a>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-indigo-50 to-blue-50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-600" />
          <span className="text-xs font-extrabold text-violet-700 uppercase tracking-wider">AI Writing Assistant</span>
        </div>

        {/* Provider toggle — only shows configured providers */}
        {availableProviders.length > 1 && (
          <div className="flex items-center gap-1 bg-white/70 rounded-lg p-0.5 border border-slate-200">
            {availableProviders.map(p => (
              <button key={p} type="button" onClick={() => switchProvider(p)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${provider === p ? `${AI_PROVIDERS[p].color} text-white shadow-sm` : 'text-slate-500 hover:text-slate-700'}`}>
                {AI_PROVIDERS[p].label}
              </button>
            ))}
          </div>
        )}
        {availableProviders.length === 1 && (
          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${AI_PROVIDERS[availableProviders[0]].color} text-white`}>
            {AI_PROVIDERS[availableProviders[0]].label}
          </span>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-red-600 font-medium bg-red-50 px-2.5 py-1.5 rounded-lg">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Mode + Generate button */}
        <div className="relative flex">
          <button type="button" onClick={runAI} disabled={aiLoading}
            className={`flex items-center gap-1.5 pl-3 pr-2 py-2 ${prov.color} ${prov.hoverColor} disabled:opacity-60 text-white text-xs font-bold rounded-l-xl transition-colors cursor-pointer`}>
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
            {MODES.find(m => m.value === aiMode)?.label}
          </button>
          <button type="button" onClick={() => { setShowModes(s => !s); setShowModels(false) }}
            className={`px-2 py-2 text-white rounded-r-xl cursor-pointer border-l border-white/20 transition-colors ${prov.color} ${prov.hoverColor}`}>
            <ChevronDown size={12} />
          </button>
          {showModes && (
            <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden w-44">
              {MODES.map(m => (
                <button key={m.value} type="button"
                  onClick={() => { setAiMode(m.value); setShowModes(false) }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors cursor-pointer ${aiMode === m.value ? `font-bold ${prov.textColor} ${prov.bgColor}` : 'text-slate-700'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Model selector */}
        <div className="relative">
          <button type="button" onClick={() => { setShowModels(s => !s); setShowModes(false) }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer">
            {selectedModel.label}
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${prov.bgColor} ${prov.textColor}`}>{selectedModel.badge}</span>
            <ChevronDown size={11} className="text-slate-400" />
          </button>
          {showModels && (
            <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden w-56">
              <p className="px-3 pt-2 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{prov.label} Models</p>
              {models.map(m => (
                <button key={m.id} type="button"
                  onClick={() => { setModelId(m.id); setShowModels(false) }}
                  className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between ${modelId === m.id ? `${prov.bgColor}` : ''}`}>
                  <span className={`text-xs font-bold ${modelId === m.id ? prov.textColor : 'text-slate-700'}`}>{m.label}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{m.badge}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Suggest tags */}
        <button type="button" onClick={suggestTags} disabled={tagLoading}
          className={`flex items-center gap-1.5 px-3 py-2 ${prov.bgColor} hover:opacity-80 disabled:opacity-60 ${prov.textColor} text-xs font-bold rounded-xl transition-colors cursor-pointer`}>
          {tagLoading ? <Loader2 size={12} className="animate-spin" /> : <Tag size={12} />}
          Suggest Tags
        </button>

        {aiLoading && (
          <button type="button" onClick={() => abortRef.current?.abort()}
            className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer">
            <X size={11} /> Stop
          </button>
        )}
      </div>

      <p className="text-[10px] text-slate-400">
        {provider === 'claude' ? 'Powered by Anthropic Claude' : 'Powered by Google Gemini'} ·
        Using <strong>{selectedModel.label}</strong> · {selectedModel.badge}
      </p>
    </div>
  )
}

// ── Main ProductForm ──────────────────────────────────────────────────────

interface Props {
  initial?: Partial<ProductData>
  mode: 'create' | 'edit'
  productId?: string
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'

export default function ProductForm({ initial, mode, productId }: Props) {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers,  setSuppliers]  = useState<Supplier[]>([])
  const [brands,     setBrands]     = useState<string[]>([])

  const [form, setForm] = useState<ProductData>({ ...EMPTY, ...initial })
  const [variantOptions, setVariantOptions] = useState<VOption[]>([])
  const [variants,       setVariants]       = useState<VVariant[]>([])

  // URL import
  const [importUrl,     setImportUrl]     = useState('')
  const [importOpen,    setImportOpen]    = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importError,   setImportError]   = useState('')
  const [importedVariantOpts, setImportedVariantOpts] = useState<VOption[] | undefined>(undefined)
  const [importVariantKey,    setImportVariantKey]    = useState(0)
  const [categoryHint,        setCategoryHint]        = useState('')

  async function handleImport() {
    if (!importUrl.trim()) return
    setImportLoading(true); setImportError('')
    try {
      const res  = await fetch('/api/admin/import/url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      })
      const data = await res.json()
      if (!res.ok) { setImportError(data.error ?? 'Import failed'); return }
      const p = data.product

      if (p.name)             set('name',        p.name)
      if (p.description)      set('description', p.description)
      if (p.price)            set('price',       String(p.price))
      if (p.salePrice)        set('salePrice',   String(p.salePrice))
      if (p.brand)            set('brand',       p.brand)
      if (p.sku)              set('sku',         p.sku)
      if (p.images?.length)   set('images',      p.images)
      if (p.tags?.length)     set('tags',        p.tags)
      // Show how many images were saved to Supabase
      const uploaded = data.uploaded_to_supabase ?? 0
      if (uploaded > 0) console.info(`[import] ${uploaded}/${p.images?.length} images re-uploaded to Supabase Storage`)

      // Category resolution: mapping table → fuzzy match → hint
      if (data.mappedCategoryId) {
        set('categoryId', data.mappedCategoryId)   // saved mapping → auto-select
      } else if (p.category) {
        const match = categories.find(c =>
          c.name.toLowerCase().includes(p.category.toLowerCase()) ||
          p.category.toLowerCase().includes(c.name.toLowerCase())
        )
        if (match) set('categoryId', match.id)
        else setCategoryHint(p.category)           // no match → show hint with create/map
      }

      // Inject variant options into VariantsEditor
      if (p.variantOptions?.length) {
        setImportedVariantOpts(p.variantOptions)
        setImportVariantKey(k => k + 1)
      }

      setImportOpen(false); setImportUrl('')
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
    }
    setImportLoading(false)
  }

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [saved,  setSaved]  = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/categories').then(r => r.json()),
      fetch('/api/admin/suppliers').then(r => r.json()),
      fetch('/api/admin/brands').then(r => r.json()),
    ]).then(([c, s, b]) => {
      setCategories(c.categories ?? [])
      setSuppliers(s.suppliers ?? [])
      setBrands(b.brands ?? [])
    }).catch(() => {})
  }, [])

  const regenSKU = useCallback(() => set('sku', generateSKU(form.name)), [form.name])

  function set<K extends keyof ProductData>(k: K, v: ProductData[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  // Auto-generate slug + SKU when name changes (only in create mode)
  useEffect(() => {
    if (mode === 'create' && form.name) {
      set('slug', slugify(form.name))
      set('sku',  generateSKU(form.name))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name, mode])

  const categoryName = categories.find(c => c.id === form.categoryId)?.name ?? ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.categoryId) { setError('Please select a category'); return }
    setSaving(true); setError('')

    const payload = {
      name: form.name, slug: form.slug, description: form.description, images: form.images,
      price: Number(form.price),
      salePrice: form.salePrice ? Number(form.salePrice) : null,
      salePriceExpiresAt: form.salePrice && form.salePriceExpiresAt ? new Date(form.salePriceExpiresAt).toISOString() : null,
      costPrice: form.costPrice ? Number(form.costPrice) : null,
      isTaxable: form.isTaxable, stock: Number(form.stock),
      lowStockThreshold: Number(form.lowStockThreshold),
      trackInventory: form.trackInventory,
      barcode: form.barcode || null, weight: form.weight ? Number(form.weight) : null,
      categoryId: form.categoryId, supplierId: form.supplierId || null,
      brand: form.brand || null, tags: form.tags,
      videoUrl: form.videoUrl || null,
      sku: form.sku || null, isActive: form.isActive,
      isFeatured: form.isFeatured, isNew: form.isNew,
      boughtTogetherIds: form.boughtTogetherIds,
      variantOptions: variantOptions.length ? variantOptions : undefined,
      variants: variants.length ? variants.map(v => ({
        title: v.title, options: v.options,
        sku:   v.sku   || null,
        price: v.price ? Number(v.price) : null,
        stock: Number(v.stock ?? 0),
      })) : undefined,
    }

    const url    = mode === 'create' ? '/api/products' : `/api/products/${productId}`
    const method = mode === 'create' ? 'POST'          : 'PATCH'

    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to save product'); setSaving(false); return }
    setSaved(true)
    setTimeout(() => router.push('/admin/products'), 1000)
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <Link href="/admin/products"
          className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer">
          <ArrowLeft size={16} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">
            {mode === 'create' ? 'Add Product' : `Edit: ${form.name || 'Product'}`}
          </h1>
          <p className="text-slate-500 text-sm">{mode === 'create' ? 'Fill in details to create a new product' : 'Update product information'}</p>
        </div>
      </div>

      {/* Import from URL */}
      <div className="mb-5">
        {!importOpen ? (
          <button type="button" onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 hover:border-primary/50 hover:bg-primary-bg text-slate-500 hover:text-primary text-sm font-semibold rounded-2xl transition-all cursor-pointer w-full justify-center">
            <LinkIcon size={14} /> Import product from Daraz, Amazon, or any product URL
          </button>
        ) : (
          <div className="border border-blue-200 bg-blue-50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-blue-800">Import from product URL</p>
              <button type="button" onClick={() => { setImportOpen(false); setImportError('') }}
                className="text-blue-400 hover:text-blue-600 cursor-pointer"><X size={14} /></button>
            </div>
            {importError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{importError}</p>}
            <div className="flex gap-2">
              <input value={importUrl} onChange={e => setImportUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleImport())}
                placeholder="https://www.daraz.com.np/products/..."
                className="flex-1 px-3 py-2.5 text-sm border border-blue-200 bg-white rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
              <button type="button" onClick={handleImport} disabled={importLoading || !importUrl.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap">
                {importLoading ? <><Loader2 size={13} className="animate-spin" /> Importing…</> : <><LinkIcon size={13} /> Import</>}
              </button>
            </div>
            <p className="text-[10px] text-blue-500">
              Supported: Daraz, Lazada, Amazon — extracts name, description, price, all images, variants (Size/Color), brand, SKU, category
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0" /> {error}
        </div>
      )}
      {saved && (
        <div className="mb-5 flex items-center gap-2.5 px-4 py-3 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-700">
          <CheckCircle2 size={15} className="shrink-0" /> {mode === 'create' ? 'Product created!' : 'Changes saved!'} Redirecting…
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Main column ─────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Basic */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
              <h2 className="font-heading font-bold text-slate-800 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-extrabold flex items-center justify-center">1</span>
                Basic Information
              </h2>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name <span className="text-red-400">*</span></label>
                <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. AirPods Pro Max Clone" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description <span className="text-red-400">*</span></label>
                <RichTextEditor
                  value={form.description}
                  onChange={v => set('description', v)}
                  placeholder="Describe the product features, benefits, and specifications…"
                />
              </div>
              <AIToolbar
                name={form.name} category={categoryName} brand={form.brand}
                description={form.description} onDescriptionChange={v => set('description', v)}
                tags={form.tags} onTagsChange={v => set('tags', v)}
              />
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Product Images
                  <span className="ml-2 text-slate-300 font-normal normal-case text-[10px]">First image = primary photo</span>
                </label>
                <ImageUploader images={form.images} onChange={v => set('images', v)} max={10} />
              </div>

              {/* Video */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Product Video
                  <span className="ml-2 text-slate-300 font-normal normal-case text-[10px]">optional — shown in Watch &amp; Learn section</span>
                </label>
                <VideoUploader value={form.videoUrl} onChange={v => set('videoUrl', v)} />
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
              <h2 className="font-heading font-bold text-slate-800 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-extrabold flex items-center justify-center">2</span>
                Pricing
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Price (NPR) <span className="text-red-400">*</span>
                  </label>
                  <input type="number" min="0" step="0.01" required
                    value={form.price} onChange={e => set('price', e.target.value)} placeholder="0" className={inputCls} />
                </div>
                {/* Cost Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cost Price</label>
                  <input type="number" min="0" step="0.01"
                    value={form.costPrice} onChange={e => set('costPrice', e.target.value)} placeholder="0" className={inputCls} />
                  <p className="text-[10px] text-slate-400 mt-1">Internal only</p>
                </div>
              </div>

              {/* Sale Price + Expiry */}
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sale Price</label>
                  {form.salePrice && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      {discountPct(form.price, form.salePrice)}% OFF
                    </span>
                  )}
                </div>
                <input type="number" min="0" step="0.01"
                  value={form.salePrice} onChange={e => set('salePrice', e.target.value)}
                  placeholder="Leave blank for no discount"
                  className={inputCls} />

                {/* Expiry — only shown when sale price is set */}
                {form.salePrice && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-500">Sale ends</label>
                      <button type="button"
                        onClick={() => set('salePriceExpiresAt', '')}
                        className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${!form.salePriceExpiresAt ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        ∞ Never expires
                      </button>
                    </div>
                    <SaleDateTimePicker
                      value={form.salePriceExpiresAt}
                      onChange={v => set('salePriceExpiresAt', v)}
                      onClear={() => set('salePriceExpiresAt', '')}
                    />
                  </div>
                )}
              </div>
              {form.price && form.costPrice && (() => {
                const sell = Number(form.salePrice || form.price), cost = Number(form.costPrice)
                const m = Math.round(((sell - cost) / sell) * 100)
                return (
                  <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl text-xs">
                    <span className="text-slate-500">Margin:</span>
                    <span className={`font-extrabold ${m >= 20 ? 'text-green-600' : m >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{m}%</span>
                    <span className="text-slate-400">· Profit: NPR {Math.max(0, sell - cost).toLocaleString()}</span>
                  </div>
                )
              })()}
              <Toggle label="Taxable (VAT 13%)" desc="Show VAT breakdown to customers" value={form.isTaxable} onChange={v => set('isTaxable', v)} />
            </div>

            {/* Inventory */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
              <h2 className="font-heading font-bold text-slate-800 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-extrabold flex items-center justify-center">3</span>
                Inventory
              </h2>
              <Toggle label="Track inventory" desc="When off, product always shows 'In Stock' (digital goods, services)" value={form.trackInventory} onChange={v => set('trackInventory', v)} />
              {form.trackInventory && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Initial Stock</label>
                    <input type="number" min="0" value={form.stock} onChange={e => set('stock', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Low Stock Alert At</label>
                    <input type="number" min="0" value={form.lowStockThreshold} onChange={e => set('lowStockThreshold', e.target.value)} className={inputCls} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Barcode / EAN</label>
                  <input value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="e.g. 8901234567890" className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Weight (kg)</label>
                  <input type="number" min="0" step="0.001" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="0.000" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Variants */}
            <VariantsEditor
              key={importVariantKey}
              basePrice={form.price}
              baseSku={form.sku}
              productImages={form.images}
              initialOptions={importedVariantOpts}
              onChange={(opts, vars) => { setVariantOptions(opts); setVariants(vars) }}
            />

            <BoughtTogetherPicker
              currentId={form.id}
              selectedIds={form.boughtTogetherIds}
              onChange={ids => set('boughtTogetherIds', ids)}
            />
          </div>

          {/* ── Sidebar ─────────────────────────── */}
          <div className="space-y-5">

            {/* Identifiers */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
              <h2 className="font-heading font-bold text-slate-800 text-sm">Identifiers</h2>
              <AutoField label="SKU" value={form.sku} onChange={v => set('sku', v)} mono hint="Auto-generated from name" onRegenerate={regenSKU} />
              <AutoField label="URL Slug" value={form.slug} onChange={v => set('slug', v)} hint="Used in the product URL" />
            </div>

            {/* Organization */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
              <h2 className="font-heading font-bold text-slate-800 text-sm">Organization</h2>

              {categoryHint && !form.categoryId && (
                <CategoryHintBanner
                  hint={categoryHint}
                  categories={categories}
                  onDismiss={() => setCategoryHint('')}
                  onMapped={catId => set('categoryId', catId)}
                  onCreated={cat => {
                    setCategories(prev => [...prev, cat])
                    set('categoryId', cat.id)
                  }}
                />
              )}

              <CreatableSelect
                label="Category"
                value={form.categoryId}
                options={categories.map(c => ({ id: c.id, name: c.name }))}
                onChange={id => set('categoryId', id)}
                placeholder="Select category…"
                required
                createTitle="Category"
                createFields={[
                  { key: 'name',  label: 'Category Name', required: true, placeholder: 'e.g. Electronics'  },
                  { key: 'color', label: 'Color',          type: 'color'                                   },
                ]}
                onCreateNew={async data => {
                  const res = await fetch('/api/admin/categories', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                  })
                  const cat = await res.json()
                  if (!res.ok) throw new Error(cat.error)
                  return { id: cat.id, name: cat.name } satisfies SelectOption
                }}
                onRefresh={() => fetch('/api/admin/categories').then(r => r.json()).then(d => setCategories(d.categories ?? []))}
              />

              <CreatableSelect
                label="Supplier"
                value={form.supplierId}
                options={suppliers.map(s => ({ id: s.id, name: s.name }))}
                onChange={id => set('supplierId', id)}
                placeholder="No supplier"
                createTitle="Supplier"
                createFields={[
                  { key: 'name',  label: 'Supplier Name', required: true, placeholder: 'e.g. ABC Traders' },
                  { key: 'email', label: 'Email',          type: 'email', placeholder: 'supplier@email.com' },
                  { key: 'phone', label: 'Phone',          type: 'tel',   placeholder: '98XXXXXXXX'        },
                ]}
                onCreateNew={async data => {
                  const res = await fetch('/api/admin/suppliers', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                  })
                  const sup = await res.json()
                  if (!res.ok) throw new Error(sup.error)
                  return { id: sup.id, name: sup.name } satisfies SelectOption
                }}
                onRefresh={() => fetch('/api/admin/suppliers').then(r => r.json()).then(d => setSuppliers(d.suppliers ?? []))}
              />

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Brand</label>
                <BrandInput
                  value={form.brand}
                  onChange={v => set('brand', v)}
                  suggestions={brands}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tags</label>
                <TagInput tags={form.tags} onChange={v => set('tags', v)} />
              </div>
            </div>

            {/* Visibility */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="font-heading font-bold text-slate-800 text-sm mb-1">Visibility</h2>
              <Toggle label="Active" desc="Visible to customers" value={form.isActive} onChange={v => set('isActive', v)} />
              <Toggle label="Featured" desc="Show in featured sections" value={form.isFeatured} onChange={v => set('isFeatured', v)} />
              <Toggle label="Mark as New" desc="Show 'New' badge on product" value={form.isNew} onChange={v => set('isNew', v)} />
            </div>

            {/* Actions */}
            <button type="submit" disabled={saving || saved}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-2xl transition-colors cursor-pointer shadow-md shadow-primary/20">
              {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                : saved ? <><CheckCircle2 size={15} /> Saved!</>
                : mode === 'create' ? 'Create Product' : 'Save Changes'}
            </button>
            <Link href="/admin/products" className="w-full flex items-center justify-center py-2.5 text-sm text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
