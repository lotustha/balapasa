'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
}

export default function BrandInput({ value, onChange, suggestions }: Props) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase()) && s.toLowerCase() !== query.toLowerCase())
    : []

  // Sync external value changes
  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  function pick(s: string) { onChange(s); setQuery(s); setOpen(false) }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="e.g. Apple, Samsung…"
          className="w-full pl-8 pr-8 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        />
        {query && (
          <button type="button" onClick={() => { onChange(''); setQuery(''); setOpen(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={12} />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-40 rounded-2xl overflow-hidden shadow-xl"
          style={{ background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(16px)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Existing brands</p>
          {filtered.slice(0, 8).map(s => (
            <button key={s} type="button" onMouseDown={() => pick(s)}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
