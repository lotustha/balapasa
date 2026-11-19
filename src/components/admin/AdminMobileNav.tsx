'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingBag, Monitor,
  LogOut, Bell, ChevronLeft, ChevronDown, MoreHorizontal, Search, Star, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { hasRole, pageMinRole } from '@/lib/admin-access'
import { toggleGroup, togglePin } from '@/lib/admin-nav-prefs'
import { ALL_NAV_ITEMS, DEFAULT_PINS, isActivePath, searchNav, type NavItem } from './admin-nav-items'
import { DEFAULT_OPEN_GROUPS, useAdminNav } from './useAdminNav'

interface BottomTab { href: string; icon: LucideIcon; label: string }

// Bottom-tab "primary" routes — kept as the daily-driver shortcuts even after
// the More sheet was switched to the grouped IA. Order matters (POS gets the
// raised FAB treatment when present).
const BOTTOM_TABS: BottomTab[] = [
  { href: '/admin',          icon: LayoutDashboard, label: 'Home'     },
  { href: '/admin/orders',   icon: ShoppingBag,     label: 'Orders'   },
  { href: '/admin/pos',      icon: Monitor,         label: 'POS'      },
  { href: '/admin/products', icon: Package,         label: 'Products' },
]

interface AdminMobileNavProps {
  logoUrl:  string
  siteName: string
}

export default function AdminMobileNav({ logoUrl, siteName }: AdminMobileNavProps) {
  const pathname = usePathname()
  const { me, groups, pinned, pinnedHrefs, isGroupOpen } = useAdminNav()
  const role = me.role
  const [moreOpen, setMoreOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!moreOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [moreOpen])

  const closeSheet = () => { setMoreOpen(false); setQuery('') }
  const activeHref = (href: string) => isActivePath(pathname, href)
  const primaryItems = BOTTOM_TABS.filter(t => hasRole(role, pageMinRole(t.href)))
  const found = useMemo(() => searchNav(groups, query), [groups, query])

  // Title for top bar: the deepest nav entry that matches the current path.
  const matched = [...ALL_NAV_ITEMS].sort((a, b) => b.href.length - a.href.length).find(n => activeHref(n.href))
  const title = matched?.label ?? 'Admin'
  const isDetailPage = pathname.split('/').filter(Boolean).length > 2

  function tile(item: NavItem) {
    const Icon = item.icon
    const active = activeHref(item.href)
    const isPinned = pinnedHrefs.includes(item.href)
    return (
      <div key={item.href}
        className={`flex items-center rounded-2xl border transition-colors ${active ? 'bg-primary-bg border-primary/20' : 'bg-white border-slate-100'}`}>
        <Link href={item.href} onClick={closeSheet} aria-current={active ? 'page' : undefined}
          className="flex-1 min-w-0 flex items-center gap-3 p-3 cursor-pointer">
          <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
            <Icon size={17} aria-hidden="true" />
          </span>
          <span className={`text-sm font-bold truncate ${active ? 'text-primary' : 'text-slate-800'}`}>{item.label}</span>
        </Link>
        <button type="button" onClick={() => togglePin(item.href, DEFAULT_PINS)}
          aria-label={isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`} aria-pressed={isPinned}
          className="shrink-0 w-11 h-11 flex items-center justify-center cursor-pointer">
          <Star size={15} fill={isPinned ? 'currentColor' : 'none'} className={isPinned ? 'text-amber-400' : 'text-slate-300'} aria-hidden="true" />
        </button>
      </div>
    )
  }

  return (
    <>
      {/* ── Top app bar ────────────────────────────────────────────── */}
      <header
        className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center px-4 gap-3 text-white"
        style={{
          background: '#0F172A',
          boxShadow: '0 1px 0 rgba(255,255,255,0.05), 0 4px 16px rgba(0,0,0,0.18)',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        {isDetailPage ? (
          <button
            onClick={() => history.back()}
            aria-label="Back"
            className="w-9 h-9 -ml-1 flex items-center justify-center rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
        ) : (
          <Link href="/admin" aria-label="Dashboard" className="shrink-0">
            <Image src={logoUrl} alt={siteName} width={28} height={28} className="rounded-lg" unoptimized />
          </Link>
        )}

        <h1 className="font-heading font-bold text-base truncate flex-1">{title}</h1>

        <button
          aria-label="Notifications"
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer"
        >
          <Bell size={18} className="text-slate-300" />
        </button>

        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-extrabold shrink-0"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
          aria-label={`${role.toLowerCase()} user`}
        >
          KS
        </div>
      </header>

      {/* ── Bottom tab bar ─────────────────────────────────────────── */}
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 text-white"
        style={{
          background: '#0F172A',
          boxShadow: '0 -1px 0 rgba(255,255,255,0.05), 0 -4px 20px rgba(0,0,0,0.20)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-stretch h-16 px-1">
          {primaryItems.map(item => {
            const Icon = item.icon
            const active = activeHref(item.href)
            const isPos = item.href === '/admin/pos'
            if (isPos) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex-1 flex flex-col items-center justify-end pb-2 cursor-pointer"
                >
                  <span
                    className={`-mt-5 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                      active
                        ? 'shadow-lg shadow-primary/40'
                        : 'shadow-md shadow-black/30'
                    }`}
                    style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
                  >
                    <Icon size={20} className="text-white" />
                  </span>
                  <span className={`text-[10px] mt-1 font-bold ${active ? 'text-white' : 'text-slate-400'}`}>{item.label}</span>
                </Link>
              )
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 relative cursor-pointer"
              >
                {active && (
                  <span className="absolute top-0 w-8 h-0.5 rounded-full bg-primary" aria-hidden="true" />
                )}
                <Icon size={20} className={active ? 'text-white' : 'text-slate-500'} />
                <span className={`text-[10px] font-semibold ${active ? 'text-white' : 'text-slate-500'}`}>{item.label}</span>
              </Link>
            )
          })}

          <button
            onClick={() => setMoreOpen(true)}
            aria-label="More navigation"
            aria-expanded={moreOpen}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer"
          >
            <MoreHorizontal size={20} className={moreOpen ? 'text-white' : 'text-slate-500'} />
            <span className={`text-[10px] font-semibold ${moreOpen ? 'text-white' : 'text-slate-500'}`}>More</span>
          </button>
        </div>
      </nav>

      {/* ── More sheet ─────────────────────────────────────────────── */}
      {moreOpen && (
        <>
          <button
            aria-label="Close menu"
            onClick={closeSheet}
            className="md:hidden fixed inset-0 z-50 bg-black/50 animate-fade-in cursor-pointer"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            className="md:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white shadow-2xl animate-slide-up"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <span className="w-10 h-1.5 rounded-full bg-slate-300" />
            </div>

            <div className="flex items-center justify-between px-5 pb-2">
              <div>
                <p className="font-heading font-extrabold text-slate-900 text-lg leading-tight">All sections</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Search, or tap a section to open it</p>
              </div>
              <button
                onClick={closeSheet}
                aria-label="Close"
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} className="text-slate-600" />
              </button>
            </div>

            <div className="px-4 pb-2">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a page" aria-label="Find a page"
                  className="w-full pl-10 pr-3 py-3 rounded-2xl text-sm border border-slate-200 bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
              </div>
            </div>

            <div className="px-3 pt-1 pb-3 space-y-3 max-h-[58vh] overflow-y-auto">
              {query.trim() ? (
                found.length > 0
                  ? <div className="grid grid-cols-1 gap-2">{found.map(tile)}</div>
                  : <p className="px-2 py-8 text-center text-sm text-slate-400">No page matches &ldquo;{query}&rdquo;</p>
              ) : (
                <>
                  {pinned.length > 0 && (
                    <div>
                      <p className="px-2 mb-1.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Pinned</p>
                      <div className="grid grid-cols-1 gap-2">{pinned.map(tile)}</div>
                    </div>
                  )}
                  {groups.map(group => {
                    const rest = group.items.filter(i => !pinnedHrefs.includes(i.href))
                    if (rest.length === 0) return null
                    const open = isGroupOpen(group.label)
                    return (
                      <div key={group.label}>
                        <button type="button" onClick={() => toggleGroup(group.label, DEFAULT_OPEN_GROUPS)} aria-expanded={open}
                          className="w-full flex items-center justify-between px-2 py-2.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest cursor-pointer">
                          <span>{group.label}</span>
                          <span className="flex items-center gap-1.5">
                            {!open && <span className="font-bold normal-case tracking-normal text-slate-400">{rest.length}</span>}
                            <ChevronDown size={15} className={`transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden="true" />
                          </span>
                        </button>
                        {open && <div className="grid grid-cols-1 gap-2">{rest.map(tile)}</div>}
                      </div>
                    )
                  })}
                </>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
                >
                  KS
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">Kamal Shrestha</p>
                  <p className="text-[10px] text-slate-500 truncate capitalize">{role.toLowerCase()}</p>
                </div>
              </div>
              <Link
                href="/"
                onClick={closeSheet}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <LogOut size={13} /> Store
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  )
}
