'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingBag, Users,
  Tag, Settings, BarChart3, Truck, LogOut, Ticket, Zap, MessageCircle, DollarSign, Monitor,
  ShieldCheck, Gift, Boxes, Factory, Repeat, FileText, Download, Mail, Library, Sparkles, RotateCcw,
  MessageCircleQuestion, Star, Wallet, Award,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import BrandText from '@/components/ui/BrandText'

type Role = 'STAFF' | 'MANAGER' | 'ADMIN'
const ROLE_RANK: Record<Role, number> = { STAFF: 1, MANAGER: 2, ADMIN: 3 }

interface NavItem  { href: string; icon: LucideIcon; label: string; minRole: Role }
interface NavGroup { label: string; items: NavItem[] }

// Grouped IA — 7 sections, each ≤ 4 items.
// Items are role-filtered at render. Empty groups (after filtering) are hidden.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { href: '/admin',         icon: LayoutDashboard, label: 'Dashboard', minRole: 'STAFF' },
      { href: '/admin/orders',  icon: ShoppingBag,     label: 'Orders',    minRole: 'STAFF' },
      { href: '/admin/returns', icon: RotateCcw,       label: 'Returns',   minRole: 'STAFF' },
      { href: '/admin/pos',     icon: Monitor,         label: 'POS',       minRole: 'STAFF' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/admin/products',   icon: Package, label: 'Products',   minRole: 'MANAGER' },
      { href: '/admin/inventory',  icon: Boxes,   label: 'Inventory',  minRole: 'MANAGER' },
      { href: '/admin/categories', icon: Tag,     label: 'Categories', minRole: 'MANAGER' },
      { href: '/admin/media',      icon: Library, label: 'Media',      minRole: 'MANAGER' },
      { href: '/admin/suppliers',  icon: Factory, label: 'Suppliers',  minRole: 'MANAGER' },
      { href: '/admin/plans',      icon: Repeat,  label: 'Plans',      minRole: 'MANAGER' },
    ],
  },
  {
    label: 'Customers',
    items: [
      { href: '/admin/customers',     icon: Users,  label: 'Customers',     minRole: 'MANAGER' },
      { href: '/admin/subscriptions', icon: Repeat, label: 'Subscriptions', minRole: 'MANAGER' },
      { href: '/admin/store-credit',  icon: Wallet, label: 'Store Credit',  minRole: 'MANAGER' },
    ],
  },
  {
    label: 'Community',
    items: [
      { href: '/admin/qa',      icon: MessageCircleQuestion, label: 'Questions', minRole: 'MANAGER' },
      { href: '/admin/reviews', icon: Star,                  label: 'Reviews',   minRole: 'MANAGER' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/promotions', icon: Zap,    label: 'Promotions', minRole: 'MANAGER' },
      { href: '/admin/coupons',    icon: Ticket, label: 'Coupons',    minRole: 'MANAGER' },
      { href: '/admin/gift-cards', icon: Gift,   label: 'Gift Cards', minRole: 'MANAGER' },
      { href: '/admin/loyalty',    icon: Award,  label: 'Loyalty',    minRole: 'MANAGER' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/admin/analytics',  icon: BarChart3,  label: 'Analytics',  minRole: 'MANAGER' },
      { href: '/admin/finance',    icon: DollarSign, label: 'Finance',    minRole: 'MANAGER' },
      { href: '/admin/invoices',   icon: FileText,   label: 'Invoices',   minRole: 'MANAGER' },
      { href: '/admin/seo-tools',  icon: Sparkles,   label: 'SEO Content', minRole: 'MANAGER' },
    ],
  },
  {
    label: 'Channels',
    items: [
      { href: '/admin/logistics', icon: Truck,         label: 'Logistics', minRole: 'ADMIN' },
      { href: '/admin/messaging', icon: MessageCircle, label: 'Messaging', minRole: 'STAFF' },
      { href: '/admin/emails',    icon: Mail,          label: 'Emails',    minRole: 'ADMIN' },
      { href: '/admin/import',    icon: Download,      label: 'Import',    minRole: 'MANAGER' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/admin/team',     icon: ShieldCheck, label: 'Team',     minRole: 'ADMIN' },
      { href: '/admin/settings', icon: Settings,    label: 'Settings', minRole: 'ADMIN' },
    ],
  },
]

function canAccess(userRole: Role, minRole: Role) {
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole]
}

interface AdminNavProps {
  siteName:   string
  logoUrl:    string
  brandSplit: { primary: string; accent: string }
}

export default function AdminNav({ siteName, logoUrl, brandSplit }: AdminNavProps) {
  const pathname  = usePathname()
  const [role, setRole] = useState<Role>('ADMIN')
  const [pendingReturns, setPendingReturns] = useState(0)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.role) setRole(d.role) }).catch(() => {})
  }, [])

  useEffect(() => {
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
  }, [])

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const visibleGroups = NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(item => canAccess(role, item.minRole)) }))
    .filter(g => g.items.length > 0)

  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col min-h-screen"
      style={{ background: '#0F172A' }}>

      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <Image src={logoUrl} alt={siteName} width={36} height={36} className="rounded-xl" unoptimized />
        <div>
          <BrandText name={siteName} split={brandSplit} className="font-heading font-bold text-white text-sm leading-tight block" />
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {visibleGroups.map(group => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ href, icon: Icon, label }) => {
                const active = isActive(href)
                const badge  = href === '/admin/returns' && pendingReturns > 0 ? pendingReturns : null
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                      active
                        ? 'bg-primary text-white shadow-lg shadow-primary/25'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={16} className={active ? 'text-white' : ''} />
                    {label}
                    {badge !== null && (
                      <span className={`ml-auto px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${active ? 'bg-white/25 text-white' : 'bg-amber-500/90 text-white'}`}>
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                    {badge === null && active && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full opacity-70" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/5 space-y-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
            KS
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">Kamal Shrestha</p>
            <p className="text-[10px] text-slate-500 truncate capitalize">{role.toLowerCase()}</p>
          </div>
        </div>
        <Link href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer">
          <LogOut size={13} /> Back to Store
        </Link>
      </div>
    </aside>
  )
}
