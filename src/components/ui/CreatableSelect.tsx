'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { Search, Plus, X, Loader2, Check, ChevronDown } from 'lucide-react'

export interface SelectOption { id: string; name: string }

export interface CreateField {
  key:          string
  label:        string
  type?:        'text' | 'email' | 'tel' | 'color'
  placeholder?: string
  required?:    boolean
  hint?:        string
}

interface Props {
  label:         string
  value:         string                               // selected id
  options:       SelectOption[]
  onChange:      (id: string) => void
  placeholder?:  string
  disabled?:     boolean
  required?:     boolean
  // Create-new feature
  createTitle?:  string                               // "New Category"
  createFields?: CreateField[]
  onCreateNew?:  (data: Record<string, string>) => Promise<SelectOption>
  onRefresh?:    () => void
}

const PRESET_COLORS = [
  '#16A34A','#06B6D4','#8B5CF6','#EC4899',
  '#F59E0B','#EF4444','#3B82F6','#10B981',
  '#F97316','#6366F1','#14B8A6','#84CC16',
]

export default function CreatableSelect({
  label, value, options, onChange, placeholder = 'Select…',
  disabled, required, createTitle, createFields, onCreateNew, onRefresh,
}: Props) {
  const uid = useId()
  const [open,       setOpen]       = useState(false)
  const [query,      setQuery]       = useState('')
  const [creating,   setCreating]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [createErr,  setCreateErr]  = useState('')
  const [createForm, setCreateForm] = useState<Record<string, string>>({})
  const [highlighted, setHl]        = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef    = useRef<HTMLInputElement>(null)
  const listRef      = useRef<HTMLUListElement>(null)

  const filtered = query.trim()
    ? options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()))
    : options

  const selected = options.find(o => o.id === value)

  // Auto-select if exactly one match
  useEffect(() => {
    if (open && query.trim() && filtered.length === 1) {
      onChange(filtered[0].id)
      setOpen(false); setQuery('')
    }
  }, [filtered]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setHl(0) }, [query, options])

  useEffect(() => {
    if (open) { setTimeout(() => searchRef.current?.focus(), 30); setQuery(''); setCreating(false) }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setHl(h => Math.min(h + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setHl(h => Math.max(h - 1, 0)) }
      if (e.key === 'Enter' && filtered[highlighted] && !creating) {
        e.preventDefault(); select(filtered[highlighted].id)
      }
    }
    function onMouse(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onMouse)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onMouse) }
  }, [open, filtered, highlighted, creating]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const item = listRef.current?.children[highlighted] as HTMLElement
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  function select(id: string) { onChange(id); setOpen(false); setQuery('') }

  function openCreate() {
    const initial: Record<string, string> = {}
    if (query.trim()) initial[createFields?.[0]?.key ?? 'name'] = query.trim()
    setCreateForm(initial)
    setCreateErr('')
    setCreating(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!onCreateNew) return
    setSaving(true); setCreateErr('')
    try {
      const newItem = await onCreateNew(createForm)
      onChange(newItem.id)
      setOpen(false); setQuery(''); setCreating(false)
      onRefresh?.()
    } catch (err) {
      setCreateErr(err instanceof Error ? err.message : 'Creation failed')
    }
    setSaving(false)
  }

  function onTriggerKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true) }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      setQuery(e.key); setOpen(true)
    }
  }

  return (
    <div ref={containerRef} className="relative" id={uid}>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>

      {/* Trigger */}
      <button type="button" disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={onTriggerKey}
        aria-haspopup="listbox" aria-expanded={open}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left border transition-all duration-200 cursor-pointer
          ${disabled ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
            : open ? 'bg-white border-primary ring-2 ring-primary/15 shadow-sm'
            : 'bg-white border-slate-200 text-slate-800 hover:border-primary/40'}`}
      >
        <span className={`flex-1 truncate ${selected ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
          {selected?.name ?? placeholder}
        </span>
        {selected && !disabled && (
          <span role="button" onClick={e => { e.stopPropagation(); onChange('') }}
            className="shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 cursor-pointer">
            <X size={10} />
          </span>
        )}
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180 text-primary' : ''}`} />
      </button>

      {/* Dropdown */}
      <div className="absolute left-0 right-0 z-50 mt-1.5"
        style={{ opacity: open ? 1 : 0, transform: open ? 'translateY(0)' : 'translateY(-8px)', pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.15s, transform 0.15s' }}>
        <div className="rounded-2xl overflow-hidden shadow-xl"
          style={{ background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', border: '1px solid rgba(99,102,241,0.15)' }}>

          {!creating ? (
            <>
              {/* Search */}
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input ref={searchRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
                    placeholder={`Search ${label.toLowerCase()}…`}
                    className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 text-slate-800 placeholder-slate-400 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all" />
                  {query && <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"><X size={10} /></button>}
                </div>
              </div>

              {/* Options */}
              <ul ref={listRef} role="listbox" aria-label={label} className="overflow-y-auto py-1.5" style={{ maxHeight: 220 }}>
                {filtered.length === 0 && !createFields && (
                  <li className="px-4 py-3 text-sm text-slate-400 text-center">No results</li>
                )}
                {filtered.length === 0 && createFields && (
                  <li className="px-4 py-3 text-sm text-slate-400 text-center">
                    No results{query ? ` for "${query}"` : ''} — create one below
                  </li>
                )}
                {filtered.map((opt, i) => (
                  <li key={opt.id} role="option" aria-selected={opt.id === value}
                    onMouseEnter={() => setHl(i)}
                    onClick={() => select(opt.id)}
                    className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors mx-1.5 rounded-xl
                      ${opt.id === value ? 'bg-primary-bg text-primary font-semibold' : i === highlighted ? 'bg-slate-50 text-slate-800' : 'text-slate-700 hover:bg-slate-50'}`}>
                    <span className="truncate">{opt.name}</span>
                    {opt.id === value && <Check size={13} className="shrink-0 text-primary ml-2" />}
                  </li>
                ))}
              </ul>

              {/* Create button */}
              {createFields && onCreateNew && (
                <div className="px-3 py-2 border-t border-slate-50">
                  <button type="button" onClick={openCreate}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-primary hover:bg-primary-bg transition-colors cursor-pointer">
                    <Plus size={14} />
                    {createTitle ? `New ${createTitle}` : 'Create new'}
                    {query.trim() ? ` "${query}"` : ''}
                  </button>
                </div>
              )}

              {filtered.length > 0 && (
                <div className="px-4 py-1.5 border-t border-slate-50 text-[10px] text-slate-400 text-right">
                  {filtered.length} of {options.length}
                </div>
              )}
            </>
          ) : (
            /* Create form */
            <form onSubmit={handleCreate} className="p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-slate-800">{createTitle ? `New ${createTitle}` : 'Create new'}</p>
                <button type="button" onClick={() => setCreating(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={14} /></button>
              </div>

              {createErr && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createErr}</p>}

              {createFields!.map(field => (
                <div key={field.key}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {field.label} {field.required && <span className="text-red-400">*</span>}
                  </label>
                  {field.type === 'color' ? (
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setCreateForm(f => ({ ...f, [field.key]: c }))}
                          className={`w-6 h-6 rounded-lg border-2 cursor-pointer transition-all ${createForm[field.key] === c ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                  ) : (
                    <input type={field.type ?? 'text'} required={field.required}
                      value={createForm[field.key] ?? ''}
                      onChange={e => setCreateForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder ?? ''}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
                  )}
                  {field.hint && <p className="text-[10px] text-slate-400 mt-1">{field.hint}</p>}
                </div>
              ))}

              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer">
                  {saving ? <><Loader2 size={12} className="animate-spin" /> Creating…</> : <><Plus size={12} /> Create</>}
                </button>
                <button type="button" onClick={() => setCreating(false)}
                  className="px-3 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
