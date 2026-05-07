'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin, Search } from 'lucide-react'
import SearchableSelect from '@/components/ui/SearchableSelect'
import {
  NEPAL_PROVINCES,
  getDistricts,
  getMunicipalities,
} from '@/data/nepal-addresses'

export interface NepalAddress {
  province:     string
  district:     string
  municipality: string
  ward:         string
  street:       string
  tole:         string
}

interface Props {
  value:       NepalAddress
  onChange:    (addr: NepalAddress) => void
  onComplete?: (addr: NepalAddress) => void
}

const PROVINCES     = NEPAL_PROVINCES.map(p => p.name)

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

  // ── Street autocomplete (Nominatim OSM) ─────────────────────────────────────
  const [streetSugg,    setStreetSugg]    = useState<string[]>([])
  const [showStreetSugg, setShowStreetSugg] = useState(false)
  const streetDebounce  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streetRef       = useRef<HTMLInputElement>(null)

  function onStreetType(v: string) {
    set('street', v)
    if (streetDebounce.current) clearTimeout(streetDebounce.current)
    setStreetSugg([])

    if (!v.trim() || v.length < 2 || !value.municipality) return

    streetDebounce.current = setTimeout(async () => {
      try {
        // Search broadly — Nepal OSM has better POI/amenity coverage than strict street data.
        // Include the municipality for localisation but don't restrict featuretype.
        const params = new URLSearchParams({
          q:                 `${v}, ${value.municipality}, Nepal`,
          countrycodes:      'np',
          format:            'json',
          limit:             '7',
          addressdetails:    '0',
          namedetails:       '1',
          'accept-language': 'en',
        })
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          { headers: { 'User-Agent': 'Balapasa/1.0' } },
        )
        if (!res.ok) return
        const data: { name: string; display_name: string }[] = await res.json()

        // Use `name` (short, clean) and de-duplicate
        const names = [
          ...new Set(
            data
              .map(d => d.name || d.display_name.split(',')[0].trim())
              .filter(n => n.length > 1),
          ),
        ]
        setStreetSugg(names)
        if (names.length > 0) setShowStreetSugg(true)
      } catch { /* network error — silently ignore */ }
    }, 600)
  }

  // Clean up debounce on unmount
  useEffect(() => () => { if (streetDebounce.current) clearTimeout(streetDebounce.current) }, [])

  function set(key: keyof NepalAddress, val: string) {
    const next: NepalAddress = { ...value, [key]: val }
    if (key === 'province')     { next.district = ''; next.municipality = ''; next.ward = '' }
    if (key === 'district')     { next.municipality = ''; next.ward = '' }
    if (key === 'municipality') { next.ward = '' }
    onChange(next)
    if (next.province && next.district && next.municipality) onComplete?.(next)
  }

  const filled = [value.province, value.district, value.municipality, value.ward, value.street, value.tole]
    .filter(Boolean).length
  const pct = Math.round((filled / 6) * 100)

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

      {/* Municipality + Ward */}
      <div className="grid sm:grid-cols-2 gap-4">
        <SearchableSelect label="Municipality / City" value={value.municipality} options={municipalities}
          onChange={v => set('municipality', v)}
          placeholder={value.district ? 'Select Municipality' : 'Select District first'}
          disabled={!value.district} />
        <SearchableSelect label="Ward No." value={value.ward} options={wardOptions}
          onChange={v => set('ward', v)}
          placeholder={value.municipality ? 'Select Ward' : 'Select Municipality first'}
          disabled={!value.municipality} />
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
            {/* Inline error */}
            {streetTouched && !value.street && (
              <p className="mt-1 text-[11px] text-red-500 font-medium">Street / Road is required</p>
            )}
            {/* Nominatim suggestions dropdown */}
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

      {/* Live address preview */}
      {value.municipality && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-primary-bg border border-primary/15 animate-fade-in">
          <MapPin size={14} className="text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600 leading-relaxed">
            {[value.tole, value.street, value.ward, value.municipality, value.district, value.province]
              .filter(Boolean).join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}
