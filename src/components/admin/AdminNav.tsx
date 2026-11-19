'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, LogOut, Search, Star } from 'lucide-react'
import BrandText from '@/components/ui/BrandText'
import { toggleGroup, togglePin } from '@/lib/admin-nav-prefs'
import { DEFAULT_PINS, type NavItem } from './admin-nav-items'
import { DEFAULT_OPEN_GROUPS, useAdminNav } from './useAdminNav'
import AdminCommandPalette from './AdminCommandPalette'

// Re-exported for the mobile nav, which shares the same menu definition.
export { NAV_GROUPS } from './admin-nav-items'

interface AdminNavProps {
  siteName:   string
  logoUrl:    string
  brandSplit: { primary: string; accent: string }
}

export default function AdminNav({ siteName, logoUrl, brandSplit }: AdminNavProps) {
  const { me, groups, pinned, pinnedHrefs, isActive, isGroupOpen } = useAdminNav()
  const [pendingReturns, setPendingReturns] = useState(0)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const canSeeReturns = groups.some(g => g.items.some(i => i.href === '/admin/returns'))

  useEffect(() => {
    if (!canSeeReturns) return
    let cancelled = false
    function loadCount() {
      fetch('/api/admin/returns?status=REQUESTED', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (!cancelled && d) setPendingReturns(d.countByStatus?.REQUESTED ?? 0) })
        .catch(() => {})
    }
    loadCount()
    const i = setInterval(loadCount, 60_000)
    return () => { cancelled = true; clearInterval(i) }
  }, [canSeeReturns])

  // Ctrl+K / Cmd+K from anywhere in the admin opens the "go to page" palette.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o => !o) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Signed-in admin identity for the footer. Falls back to the email handle, then
  // a generic label, so the panel never shows a stale hardcoded name.
  const displayName = me.name.trim() || (me.email ? me.email.split('@')[0] : 'Admin')
  const initials = (
    me.name.trim()
      ? me.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('')
      : (me.email || 'A').charAt(0)
  ).toUpperCase()

  function row(item: NavItem) {
    const Icon = item.icon
    const active = isActive(item.href)
    const isPinned = pinnedHrefs.includes(item.href)
    const badge = item.href === '/admin/returns' && pendingReturns > 0 ? pendingReturns : null
    return (
      <div key={item.href} className={`group/row flex items-center rounded-xl transition-colors duration-150 ${
        active ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}>
        <Link href={item.href} aria-current={active ? 'page' : undefined}
          className="flex-1 min-w-0 flex items-center gap-3 pl-3.5 pr-1 py-2.5 text-sm font-semibold cursor-pointer">
          <Icon size={16} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{item.label}</span>
          {badge !== null && (
            <span className={`ml-auto px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${active ? 'bg-white/25 text-white' : 'bg-amber-500/90 text-white'}`}>
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </Link>
        <button type="button" onClick={() => togglePin(item.href, DEFAULT_PINS)}
          aria-label={isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`} aria-pressed={isPinned}
          className={`shrink-0 w-8 h-8 mr-1 flex items-center justify-center rounded-lg cursor-pointer transition-opacity focus-visible:opacity-100 ${
            isPinned ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'
          } ${active ? 'text-white/90 hover:bg-white/15' : 'text-slate-500 hover:text-amber-400 hover:bg-white/5'}`}>
          <Star size={13} fill={isPinned ? 'currentColor' : 'none'} className={isPinned && !active ? 'text-amber-400' : ''} aria-hidden="true" />
        </button>
      </div>
    )
  }

  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col h-screen sticky top-0"
      style={{ background: '#0F172A' }}>

      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <Image src={logoUrl} alt={siteName} width={36} height={36} className="rounded-xl" unoptimized />
        <div>
          <BrandText name={siteName} split={brandSplit} className="font-heading font-bold text-white text-sm leading-tight block" />
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Admin Panel</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <button type="button" onClick={() => setPaletteOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 text-slate-400 text-sm hover:bg-white/10 hover:text-slate-200 transition-colors cursor-pointer">
          <Search size={15} aria-hidden="true" />
          <span className="flex-1 text-left">Find a page</span>
          <kbd className="text-[10px] font-bold text-slate-500 border border-white/10 rounded-md px-1.5 py-0.5">Ctrl K</kbd>
        </button>
      </div>

      {/* Nav */}
      <nav aria-label="Admin" className="flex-1 px-3 py-3 space-y-3 overflow-y-auto">
        {pinned.length > 0 && (
          <div>
            <p className="px-3 mb-1 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Pinned</p>
            <div className="space-y-0.5">{pinned.map(row)}</div>
          </div>
        )}

        {groups.map(group => {
          // A pinned page lives under "Pinned" only, so nothing is listed twice.
          const rest = group.items.filter(i => !pinnedHrefs.includes(i.href))
          if (rest.length === 0) return null
          const open = isGroupOpen(group.label)
          const id = `admin-nav-${group.label.replace(/\W+/g, '-').toLowerCase()}`
          return (
            <div key={group.label}>
              <button type="button" onClick={() => toggleGroup(group.label, DEFAULT_OPEN_GROUPS)}
                aria-expanded={open} aria-controls={id}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-extrabold text-slate-500 uppercase tracking-widest hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer">
                <span>{group.label}</span>
                <span className="flex items-center gap-1.5">
                  {!open && <span className="font-bold normal-case tracking-normal text-slate-600">{rest.length}</span>}
                  <ChevronDown size={13} className={`transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden="true" />
                </span>
              </button>
              {open && <div id={id} className="mt-0.5 space-y-0.5">{rest.map(row)}</div>}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/5 space-y-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-slate-500 truncate capitalize">{me.role.toLowerCase()}</p>
          </div>
        </div>
        <Link href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer">
          <LogOut size={13} /> Back to Store
        </Link>
      </div>

      {paletteOpen && <AdminCommandPalette groups={groups} pinned={pinned} onClose={() => setPaletteOpen(false)} />}
    </aside>
  )
}
