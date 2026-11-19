'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CornerDownLeft, Search } from 'lucide-react'
import { searchNav, type NavGroup, type NavItem } from './admin-nav-items'

// "Go to page" dialog, opened with Ctrl+K / Cmd+K or from the sidebar's search field.
export default function AdminCommandPalette({
  groups, pinned, onClose,
}: {
  groups: NavGroup[]; pinned: NavItem[]; onClose: () => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  // With nothing typed, offer the pinned pages first and then everything else.
  const results = useMemo(() => {
    if (query.trim()) return searchNav(groups, query)
    const rest = groups.flatMap(g => g.items).filter(i => !pinned.includes(i))
    return [...pinned, ...rest]
  }, [groups, pinned, query])

  const active = Math.min(cursor, Math.max(0, results.length - 1))

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function go(item: NavItem | undefined) {
    if (!item) return
    onClose()
    router.push(item.href)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(Math.min(active + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(Math.max(active - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Go to page">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] cursor-default" />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-slate-100">
          <Search size={17} className="text-slate-400 shrink-0" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0) }}
            onKeyDown={onKeyDown}
            placeholder="Go to a page..."
            aria-label="Search pages"
            aria-controls="admin-palette-results"
            className="flex-1 py-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
          />
          <kbd className="hidden sm:block text-[10px] font-bold text-slate-400 border border-slate-200 rounded-md px-1.5 py-0.5">Esc</kbd>
        </div>

        <ul id="admin-palette-results" ref={listRef} role="listbox" aria-label="Pages" className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-slate-400">No page matches &ldquo;{query}&rdquo;</li>
          )}
          {results.map((item, i) => {
            const Icon = item.icon
            const selected = i === active
            return (
              <li key={item.href} role="option" aria-selected={selected}
                onMouseMove={() => setCursor(i)} onClick={() => go(item)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer ${selected ? 'bg-primary text-white' : 'text-slate-700'}`}>
                <Icon size={16} className={selected ? 'text-white' : 'text-slate-400'} aria-hidden="true" />
                <span className="font-semibold flex-1">{item.label}</span>
                {selected && <CornerDownLeft size={14} className="text-white/80" aria-hidden="true" />}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
