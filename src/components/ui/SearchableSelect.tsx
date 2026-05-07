'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { ChevronDown, Search, Check, X } from 'lucide-react'

interface Props {
  label:       string
  value:       string
  options:     string[]
  onChange:    (v: string) => void
  placeholder: string
  disabled?:   boolean
  hint?:       string
}

export default function SearchableSelect({
  label, value, options, onChange, placeholder, disabled, hint,
}: Props) {
  const id                   = useId()
  const [open, setOpen]      = useState(false)
  const [query, setQuery]    = useState('')
  const containerRef         = useRef<HTMLDivElement>(null)
  const searchRef            = useRef<HTMLInputElement>(null)
  const listRef              = useRef<HTMLUListElement>(null)
  const [highlighted, setHl] = useState(0)
  const initialQueryRef      = useRef('')   // seed from keyboard shortcut

  const filtered = query.trim()
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options

  // Reset highlight when query or options change
  useEffect(() => { setHl(0) }, [query, options])

  // Focus search on open; apply keyboard-seeded query
  useEffect(() => {
    if (open) {
      const seed = initialQueryRef.current
      initialQueryRef.current = ''
      setQuery(seed)
      setTimeout(() => {
        searchRef.current?.focus()
        if (seed) searchRef.current?.setSelectionRange(seed.length, seed.length)
      }, 30)
    }
  }, [open])

  // Auto-select when typing narrows results to exactly one match
  useEffect(() => {
    if (open && query.trim() && filtered.length === 1) {
      select(filtered[0])
    }
  }, [filtered]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click / ESC; arrow / Enter navigation
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setHl(h => Math.min(h + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setHl(h => Math.max(h - 1, 0)) }
      if (e.key === 'Enter' && filtered[highlighted]) {
        e.preventDefault()
        select(filtered[highlighted])
      }
    }
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open, filtered, highlighted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll highlighted item into view
  useEffect(() => {
    const item = listRef.current?.children[highlighted] as HTMLElement
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  function select(v: string) {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  function clearSelection(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
  }

  // Keyboard UX on the trigger: printable char → seed query + open
  function onTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled || options.length === 0) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      initialQueryRef.current = e.key
      setOpen(true)
    }
  }

  const isEmpty = options.length === 0

  return (
    <div ref={containerRef} className="relative" id={id}>
      {/* Label */}
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}
        {hint && <span className="ml-2 text-slate-300 font-normal normal-case text-[10px]">{hint}</span>}
      </label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && !isEmpty && setOpen(o => !o)}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled || isEmpty}
        className={`
          w-full flex items-center gap-2 px-4 py-3.5 rounded-2xl text-sm text-left
          border transition-all duration-200 cursor-pointer
          ${disabled || isEmpty
            ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
            : open
            ? 'bg-white border-primary ring-2 ring-primary/15 shadow-sm'
            : 'bg-white border-slate-200 text-slate-800 hover:border-primary/40 hover:shadow-sm'
          }
        `}
      >
        <span className={`flex-1 truncate ${value ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
          {value || placeholder}
        </span>

        {value && !disabled && (
          <span
            role="button"
            onClick={clearSelection}
            className="shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={11} />
          </span>
        )}

        <ChevronDown
          size={15}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-primary' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      <div
        className="absolute left-0 right-0 z-40 mt-1.5 overflow-hidden"
        style={{
          opacity:       open ? 1 : 0,
          transform:     open ? 'translateY(0)' : 'translateY(-8px)',
          pointerEvents: open ? 'auto' : 'none',
          transition:    'opacity 0.18s ease, transform 0.18s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background:     'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            border:         '1px solid rgba(99,102,241,0.15)',
            boxShadow:      '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(99,102,241,0.08)',
          }}
        >
          {/* Search input */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 text-slate-800 placeholder-slate-400 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <ul
            ref={listRef}
            role="listbox"
            aria-label={label}
            className="overflow-y-auto py-1.5"
            style={{ maxHeight: '220px' }}
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400 text-center">
                No results for &ldquo;{query}&rdquo;
              </li>
            ) : (
              filtered.map((opt, i) => {
                const isSelected    = opt === value
                const isHighlighted = i === highlighted
                return (
                  <li
                    key={opt}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHl(i)}
                    onClick={() => select(opt)}
                    className={`
                      flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer
                      transition-colors duration-100 mx-1.5 rounded-xl
                      ${isSelected
                        ? 'bg-primary-bg text-primary font-semibold'
                        : isHighlighted
                        ? 'bg-slate-50 text-slate-800'
                        : 'text-slate-700 hover:bg-slate-50'
                      }
                    `}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && <Check size={14} className="shrink-0 text-primary ml-2" />}
                  </li>
                )
              })
            )}
          </ul>

          {filtered.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-50 text-[10px] text-slate-400 text-right">
              {filtered.length} of {options.length} option{options.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
