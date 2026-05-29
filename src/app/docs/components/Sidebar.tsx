'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Search, X } from 'lucide-react'
import { nav } from '../_nav'
import ThemeToggle from './ThemeToggle'

function isActive(pathname: string, href: string): boolean {
  // Ignore any #hash fragment when matching.
  const base = href.split('#')[0]
  if (base === '/docs') return pathname === '/docs'
  return pathname.startsWith(base)
}

export default function Sidebar() {
  const pathname = usePathname()
  const [filter, setFilter] = useState('')
  const [open, setOpen] = useState(false)

  const items = nav.filter((item) =>
    item.label.toLowerCase().includes(filter.toLowerCase())
  )

  const navList = (
    <nav className="flex flex-col gap-0.5" aria-label="Documentation">
      {items.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-[44px] items-center rounded-md px-3 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              active
                ? 'bg-emerald-500/10 font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
      {items.length === 0 && (
        <p className="px-3 py-2 text-sm text-slate-500">No matches.</p>
      )}
    </nav>
  )

  const filterInput = (
    <div className="relative mb-4">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter…"
        aria-label="Filter navigation"
        className="w-full rounded-md border-0 bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-200 ring-1 ring-inset ring-slate-700/60 placeholder:text-slate-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      />
    </div>
  )

  return (
    <>
      {/* Mobile hamburger — fixed in the top bar; visible only below lg */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="fixed left-4 top-2.5 z-50 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-slate-900 text-slate-300 ring-1 ring-inset ring-slate-700/60 transition-colors duration-200 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop static sidebar */}
      <aside className="hidden lg:sticky lg:top-14 lg:flex lg:h-[calc(100vh-3.5rem)] lg:w-64 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-r lg:border-slate-800 lg:bg-slate-900 lg:px-4 lg:py-6">
        {filterInput}
        {navList}
        <div className="mt-auto flex items-center justify-between border-t border-slate-800 pt-4">
          <span className="text-xs text-slate-500">Theme</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/70"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[80vw] flex-col border-r border-slate-800 bg-slate-900 px-4 py-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-slate-100">
                Balapasa API
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-slate-400 ring-1 ring-inset ring-slate-700/60 transition-colors duration-200 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {filterInput}
            {navList}
            <div className="mt-auto flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-xs text-slate-500">Theme</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
