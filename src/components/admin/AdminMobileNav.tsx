'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingBag, Users,
  Tag, Settings, BarChart3, Truck, LogOut, Ticket, Zap,
  MessageCircle, DollarSign, Monitor, Bell, ChevronLeft,
  MoreHorizontal, X, ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Role = 'STAFF' | 'MANAGER' | 'ADMIN'
const ROLE_RANK: Record<Role, number> = { STAFF: 1, MANAGER: 2, ADMIN: 3 }

interface NavItem { href: string; icon: LucideIcon; label: string; minRole: Role }

// Same 13 items as desktop nav
const ALL_NAV: NavItem[] = [
  { href: '/admin',            icon: LayoutDashboard, label: 'Home',       minRole: 'STAFF'   },
  { href: '/admin/orders',     icon: ShoppingBag,     label: 'Orders',     minRole: 'STAFF'   },
  { href: '/admin/products',   icon: Package,         label: 'Products',   minRole: 'MANAGER' },
  { href: '/admin/customers',  icon: Users,           label: 'Customers',  minRole: 'MANAGER' },
  { href: '/admin/team',       icon: ShieldCheck,     label: 'Team',       minRole: 'ADMIN'   },
  { href: '/admin/categories', icon: Tag,             label: 'Categories', minRole: 'MANAGER' },
  { href: '/admin/coupons',    icon: Ticket,          label: 'Coupons',    minRole: 'MANAGER' },
  { href: '/admin/promotions', icon: Zap,             label: 'Promotions', minRole: 'MANAGER' },
  { href: '/admin/analytics',  icon: BarChart3,       label: 'Analytics',  minRole: 'MANAGER' },
  { href: '/admin/finance',    icon: DollarSign,      label: 'Finance',    minRole: 'MANAGER' },
  { href: '/admin/pos',        icon: Monitor,         label: 'POS',        minRole: 'STAFF'   },
  { href: '/admin/logistics',  icon: Truck,           label: 'Logistics',  minRole: 'ADMIN'   },
  { href: '/admin/messaging',  icon: MessageCircle,   label: 'Messaging',  minRole: 'STAFF'   },
  { href: '/admin/settings',   icon: Settings,        label: 'Settings',   minRole: 'ADMIN'   },
]

// 4 fixed bottom-tab slots + More
const PRIMARY_HREFS = ['/admin', '/admin/orders', '/admin/pos', '/admin/products']

function canAccess(role: Role, minRole: Role) {
  return ROLE_RANK[role] >= ROLE_RANK[minRole]
}

function activeHref(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin'
  return pathname.startsWith(href)
}

export default function AdminMobileNav() {
  const pathname = usePathname()
  const [role, setRole] = useState<Role>('ADMIN')
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.role) setRole(d.role) }).catch(() => {})
  }, [])

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (!moreOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [moreOpen])

  // Build the 5 bottom tabs: 4 primary + More
  const primaryItems = PRIMARY_HREFS
    .map(href => ALL_NAV.find(n => n.href === href))
    .filter((n): n is NavItem => !!n && canAccess(role, n.minRole))

  // "More" contents = everything not already on the bottom bar (still role-filtered)
  const overflowItems = ALL_NAV.filter(
    n => !PRIMARY_HREFS.includes(n.href) && canAccess(role, n.minRole),
  )

  // Title for top bar — match the deepest nav entry
  const matchedNav = [...ALL_NAV].sort((a, b) => b.href.length - a.href.length).find(n => activeHref(pathname, n.href))
  const title = matchedNav?.label ?? 'Admin'
  const isDetailPage = pathname.split('/').filter(Boolean).length > 2 // /admin/orders/[id] etc.

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
            <Image src="/logo.png" alt="" width={28} height={28} className="rounded-lg" />
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
            const active = activeHref(pathname, item.href)
            const isPos = item.href === '/admin/pos'
            // POS gets FAB-style elevated treatment
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
          {/* Backdrop */}
          <button
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="md:hidden fixed inset-0 z-50 bg-black/50 animate-fade-in cursor-pointer"
          />
          {/* Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            className="md:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white shadow-2xl animate-slide-up"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <span className="w-10 h-1.5 rounded-full bg-slate-300" />
            </div>

            <div className="flex items-center justify-between px-5 pb-2">
              <div>
                <p className="font-heading font-extrabold text-slate-900 text-lg leading-tight">All sections</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Tap to navigate</p>
              </div>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} className="text-slate-600" />
              </button>
            </div>

            <div className="px-3 pt-2 pb-3 grid grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto">
              {overflowItems.map(item => {
                const Icon = item.icon
                const active = activeHref(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors cursor-pointer ${
                      active
                        ? 'bg-primary-bg border-primary/20'
                        : 'bg-white border-slate-100 hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Icon size={17} />
                    </span>
                    <span className={`text-sm font-bold ${active ? 'text-primary' : 'text-slate-800'}`}>{item.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Footer: profile + back to store */}
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
                onClick={() => setMoreOpen(false)}
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
