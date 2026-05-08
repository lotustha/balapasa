'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingBag, Users,
  Tag, Settings, BarChart3, Truck, LogOut, Upload, Ticket, Zap,
} from 'lucide-react'
import { STORE_NAME } from '@/lib/config'

// minRole: the minimum role required to see this nav item
// STAFF < MANAGER < ADMIN
const NAV = [
  { href: '/admin',            icon: LayoutDashboard, label: 'Dashboard',  minRole: 'STAFF'   },
  { href: '/admin/orders',     icon: ShoppingBag,     label: 'Orders',     minRole: 'STAFF'   },
  { href: '/admin/products',   icon: Package,         label: 'Products',   minRole: 'MANAGER' },
  { href: '/admin/customers',  icon: Users,           label: 'Customers',  minRole: 'MANAGER' },
  { href: '/admin/categories', icon: Tag,             label: 'Categories', minRole: 'MANAGER' },
  { href: '/admin/coupons',     icon: Ticket,          label: 'Coupons',     minRole: 'MANAGER' },
  { href: '/admin/promotions',  icon: Zap,             label: 'Promotions',  minRole: 'MANAGER' },
  { href: '/admin/analytics',  icon: BarChart3,       label: 'Analytics',  minRole: 'MANAGER' },
  { href: '/admin/logistics',  icon: Truck,           label: 'Logistics',  minRole: 'ADMIN'   },
  { href: '/admin/settings',   icon: Settings,        label: 'Settings',   minRole: 'ADMIN'   },
]

const ROLE_RANK: Record<string, number> = { STAFF: 1, MANAGER: 2, ADMIN: 3 }
function canAccess(userRole: string, minRole: string) {
  return (ROLE_RANK[userRole] ?? 0) >= (ROLE_RANK[minRole] ?? 99)
}

export default function AdminNav() {
  const pathname  = usePathname()
  const [role, setRole] = useState<string>('ADMIN')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.role) setRole(d.role) }).catch(() => {})
  }, [])

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const visibleNav = NAV.filter(item => canAccess(role, item.minRole))

  return (
    <aside className="w-64 shrink-0 flex flex-col min-h-screen"
      style={{ background: '#0F172A' }}>

      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <Image src="/logo.png" alt={STORE_NAME} width={36} height={36} className="rounded-xl" />
        <div>
          <p className="font-heading font-bold text-white text-sm leading-tight">{STORE_NAME}</p>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
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
              {active && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full opacity-70" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/5 space-y-2">
        {/* Admin info */}
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
