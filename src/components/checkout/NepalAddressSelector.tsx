'use client'

import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { MapPin, Search, MapPinned, Loader2 } from 'lucide-react'
import SearchableSelect from '@/components/ui/SearchableSelect'
import {
  NEPAL_PROVINCES,
  getDistricts,
  getMunicipalities,
} from '@/data/nepal-addresses'

// Map picker is heavy (Leaflet bundle) — load it only when the user opens it.
const MapPicker  = lazy(() => import('./MapPicker'))
// Same Leaflet bundle — only loads when a pin exists. No cost for unpinned users.
const MapPreview = lazy(() => import('./MapPreview'))

export interface NepalAddress {
  province:     string
  district:     string
  municipality: string
  ward:         string
  street:       string
  tole:         string
  landmark?:    string  // Optional. Shown outside KTM Valley in place of Ward.
  lat?:         number | null
  lng?:         number | null
}

interface Props {
  value:       NepalAddress
  onChange:    (addr: NepalAddress) => void
  onComplete?: (addr: NepalAddress) => void
}

const PROVINCES = NEPAL_PROVINCES.map(p => p.name)

// Wards only meaningfully help inside the Kathmandu Valley where ward boundaries
// are dense and riders use them to disambiguate addresses. Outside the valley
// the field is more noise than signal, so we hide it.
const VALLEY_DISTRICTS = new Set(['Kathmandu', 'Lalitpur', 'Bhaktapur'])

export default function NepalAddressSelector({ value, onChange, onComplete }: Props) {
  const districts      = value.province ? getDistricts(value.province).map(d => d.name) : []
  const municipalities = (value.province && value.district)
    ? getMunicipalities(value.province, value.district).map(m => m.name)
    : []
  const maxWards = value.province && value.district && value.municipality
    ? (getMunicipalities(value.province, value.district)
        .find(m => m.name === value.municipality)?.wards ?? 33)
    : 33
  const wardOptions = Array.from({ length: maxWards }, (_, i) => `Ward ${i + 1}`)

  // ── Touched state for required text fields ──────────────────────────────────
  const [streetTouched, setStreetTouched] = useState(false)
  const [toleTouched,   setToleTouched]   = useState(false)

  // ── Street autocomplete (server proxy → Nominatim) ──────────────────────────
  const [streetSugg,     setStreetSugg]     = useState<string[]>([])
  const [showStreetSugg, setShowStreetSugg] = useState(false)
  const [streetLoading,  setStreetLoading]  = useState(false)
  const streetDebounce   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streetAbort      = useRef<AbortController | null>(null)
  const streetRef        = useRef<HTMLInputElement>(null)

  function onStreetType(v: string) {
    set('street', v)
    if (streetDebounce.current) clearTimeout(streetDebounce.current)
    streetAbort.current?.abort()
    setStreetSugg([])

    if (!v.trim() || v.length < 2 || !value.municipality) return

    streetDebounce.current = setTimeout(async () => {
      const ctrl = new AbortController()
      streetAbort.current = ctrl
      setStreetLoading(true)
      try {
        const params = new URLSearchParams({
          q:            v,
          municipality: value.municipality,
          limit:        '7',
        })
        const res = await fetch(`/api/geocode/search?${params}`, { signal: ctrl.signal })
        if (!res.ok) return
        const data = await res.json() as { results: { name: string }[] }
        const names = [...new Set(data.results.map(r => r.name).filter(Boolean))]
        setStreetSugg(names)
        if (names.length > 0) setShowStreetSugg(true)
      } catch (e: unknown) {
        // Aborted → user kept typing; not an error
        if (e instanceof Error && e.name === 'AbortError') return
      } finally {
        if (streetAbort.current === ctrl) setStreetLoading(false)
      }
    }, 350)
  }

  // Clean up debounce + in-flight request on unmount
  useEffect(() => () => {
    if (streetDebounce.current) clearTimeout(streetDebounce.current)
    streetAbort.current?.abort()
  }, [])

  function set(key: keyof NepalAddress, val: string) {
    const next: NepalAddress = { ...value, [key]: val }
    if (key === 'province')     { next.district = ''; next.municipality = ''; next.ward = '' }
    if (key === 'district')     { next.municipality = ''; next.ward = '' }
    if (key === 'municipality') { next.ward = '' }
    onChange(next)
    if (next.province && next.district && next.municipality) onComplete?.(next)
  }

  // ── Map picker ──────────────────────────────────────────────────────────────
  const [mapOpen, setMapOpen] = useState(false)

  function handleMapConfirm(picked: {
    lat:    number
    lng:    number
    street?: string
    suburb?: string
  }) {
    const next: NepalAddress = {
      ...value,
      lat: picked.lat,
      lng: picked.lng,
      // Only fill empty fields — don't overwrite what the user already typed
      street: value.street || picked.street || value.street,
      tole:   value.tole   || picked.suburb || value.tole,
    }
    onChange(next)
    if (next.province && next.district && next.municipality) onComplete?.(next)
    setMapOpen(false)
  }

  // Ward is intentionally excluded — it's optional. Don't penalise the progress
  // bar for not picking it; otherwise customers feel stuck at 83% complete.
  const REQUIRED_FIELDS = [value.province, value.district, value.municipality, value.street, value.tole]
  const filled = REQUIRED_FIELDS.filter(Boolean).length
  const pct = Math.round((filled / REQUIRED_FIELDS.length) * 100)
  const hasPin = value.lat != null && value.lng != null

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      {filled > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #16A34A, #06B6D4)' }} />
          </div>
          <span className="text-[10px] font-bold text-slate-400 shrink-0">{pct}% complete</span>
        </div>
      )}

      {/* Province + District */}
      <div className="grid sm:grid-cols-2 gap-4">
        <SearchableSelect label="Province" value={value.province} options={PROVINCES}
          onChange={v => set('province', v)} placeholder="Select Province" />
        <SearchableSelect label="District" value={value.district} options={districts}
          onChange={v => set('district', v)}
          placeholder={value.province ? 'Select District' : 'Select Province first'}
          disabled={!value.province} />
      </div>

      {/* Municipality (+ Ward inside KTM Valley · Landmark elsewhere) */}
      <div className="grid sm:grid-cols-2 gap-4">
        <SearchableSelect label="Municipality / City" value={value.municipality} options={municipalities}
          onChange={v => set('municipality', v)}
          placeholder={value.district ? 'Select Municipality' : 'Select District first'}
          disabled={!value.district} />
        {VALLEY_DISTRICTS.has(value.district) ? (
          <SearchableSelect label="Ward No." hint="optional · helps the rider"
            value={value.ward} options={wardOptions}
            onChange={v => set('ward', v)}
            placeholder={value.municipality ? 'Select Ward (optional)' : 'Select Municipality first'}
            disabled={!value.municipality} />
        ) : (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Landmark
              <span className="ml-2 text-slate-300 font-normal normal-case text-[10px]">optional · helps the rider</span>
            </label>
            <input
              type="text"
              value={value.landmark ?? ''}
              onChange={e => set('landmark', e.target.value)}
              placeholder={value.municipality ? 'e.g. near XYZ school' : 'Select Municipality first'}
              disabled={!value.municipality}
              className={`w-full px-4 py-3.5 rounded-xl text-sm border bg-white text-slate-800 outline-none focus:ring-2 transition-all
                ${!value.municipality
                  ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                  : 'border-slate-200 focus:border-primary focus:ring-primary/15'
                }`}
            />
          </div>
        )}
      </div>

      {/* Street + Tole — overflow-visible so dropdown is not clipped by grid */}
      <div className="grid sm:grid-cols-2 gap-4" style={{ overflow: 'visible' }}>
        {/* Street / Road */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Street / Road
            <span className="ml-1 text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              ref={streetRef}
              type="text"
              required
              aria-required="true"
              value={value.street}
              onChange={e => onStreetType(e.target.value)}
              onBlur={() => {
                setStreetTouched(true)
                setTimeout(() => setShowStreetSugg(false), 180)
              }}
              onFocus={() => streetSugg.length > 0 && setShowStreetSugg(true)}
              placeholder="e.g. Thamel Marg"
              className={`w-full px-4 py-3.5 rounded-xl text-sm border bg-white text-slate-800 outline-none focus:ring-2 transition-all
                ${streetTouched && !value.street
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                  : 'border-slate-200 focus:border-primary focus:ring-primary/15'
                }`}
            />
            {streetLoading && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
            )}
            {/* Inline error */}
            {streetTouched && !value.street && (
              <p className="mt-1 text-[11px] text-red-500 font-medium">Street / Road is required</p>
            )}
            {/* Suggestions dropdown */}
            {showStreetSugg && streetSugg.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-2xl overflow-hidden shadow-xl"
                style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', border: '1px solid rgba(99,102,241,0.12)' }}>
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Search size={10} /> Suggestions from OpenStreetMap
                </p>
                {streetSugg.map(s => (
                  <button key={s} type="button"
                    onMouseDown={() => { set('street', s); setShowStreetSugg(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tole / Locality */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Tole / Locality
            <span className="ml-1 text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            aria-required="true"
            value={value.tole}
            onChange={e => set('tole', e.target.value)}
            onBlur={() => setToleTouched(true)}
            placeholder="e.g. Jyatha Tole"
            className={`w-full px-4 py-3.5 rounded-xl text-sm border bg-white text-slate-800 outline-none focus:ring-2 transition-all
              ${toleTouched && !value.tole
                ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                : 'border-slate-200 focus:border-primary focus:ring-primary/15'
              }`}
          />
          {toleTouched && !value.tole && (
            <p className="mt-1 text-[11px] text-red-500 font-medium">Tole / Locality is required</p>
          )}
        </div>
      </div>

      {/* Map picker CTA — gives the rider a precise GPS pin */}
      <button
        type="button"
        onClick={() => setMapOpen(true)}
        disabled={!value.municipality}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
          !value.municipality
            ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
            : hasPin
            ? 'border-primary bg-primary-bg text-primary hover:bg-primary/10'
            : 'border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary hover:bg-primary-bg/30'
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          hasPin ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
        }`}>
          <MapPinned size={18} />
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">
            {hasPin ? 'Location pinned on map' : 'Pin your exact location'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {!value.municipality
              ? 'Select a municipality first to enable the map.'
              : hasPin
              ? 'Tap to adjust or re-pin your location.'
              : 'Helps the rider find you faster — especially for gated complexes or narrow lanes.'}
          </p>
          {hasPin && (
            <p className="mt-0.5 text-[10px] font-mono text-primary/70">
              {value.lat!.toFixed(5)}, {value.lng!.toFixed(5)}
            </p>
          )}
        </div>
        {hasPin && (
          <Suspense fallback={
            <div className="w-[120px] h-[76px] rounded-lg bg-slate-100 animate-pulse shrink-0" />
          }>
            <MapPreview lat={value.lat!} lng={value.lng!} />
          </Suspense>
        )}
      </button>

      {/* Live address preview */}
      {value.municipality && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-primary-bg border border-primary/15 animate-fade-in">
          <MapPin size={14} className="text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600 leading-relaxed">
            {[
              value.tole,
              value.street,
              value.ward && `Ward ${value.ward.replace(/^Ward\s+/, '')}`,
              value.landmark && `near ${value.landmark}`,
              value.municipality, value.district, value.province,
            ].filter(Boolean).join(', ')}
          </p>
        </div>
      )}

      {/* Map picker modal — lazy loaded */}
      {mapOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 flex items-center gap-3 shadow-xl">
              <Loader2 size={18} className="animate-spin text-primary" />
              <p className="text-sm font-semibold text-slate-700">Loading map…</p>
            </div>
          </div>
        }>
          <MapPicker
            initialLat={value.lat ?? null}
            initialLng={value.lng ?? null}
            municipality={value.municipality}
            district={value.district}
            onCancel={() => setMapOpen(false)}
            onConfirm={handleMapConfirm}
          />
        </Suspense>
      )}
    </div>
  )
}
