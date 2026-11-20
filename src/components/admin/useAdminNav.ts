'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { getNavPrefs, getServerNavPrefs, subscribeNavPrefs } from '@/lib/admin-nav-prefs'
import { DEFAULT_PINS, groupsFor, isActivePath, type NavItem } from './admin-nav-items'

export const DEFAULT_OPEN_GROUPS = ['Sell']

// Everything the desktop sidebar, the mobile sheet and the command palette need to draw the menu.
export function useAdminNav() {
  const pathname = usePathname()
  // Until /api/auth/me answers, assume ADMIN so the menu does not flash empty; the middleware is
  // what actually enforces access.
  const [me, setMe] = useState({ role: 'ADMIN', name: '', email: '' })
  const prefs = useSyncExternalStore(subscribeNavPrefs, getNavPrefs, getServerNavPrefs)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setMe({
        role:  typeof d.role  === 'string' ? d.role  : 'ADMIN',
        name:  typeof d.name  === 'string' ? d.name  : '',
        email: typeof d.email === 'string' ? d.email : '',
      })
    }).catch(() => {})
  }, [])

  // Settings → Daraz can hide the Daraz page from the menu.
  const [showDaraz, setShowDaraz] = useState(true)
  useEffect(() => {
    fetch('/api/admin/daraz-menu').then(r => (r.ok ? r.json() : null)).then(d => { if (d && d.show === false) setShowDaraz(false) }).catch(() => {})
  }, [])

  const groups = useMemo(() => groupsFor(me.role)
    .map(g => (showDaraz ? g : { ...g, items: g.items.filter(i => i.href !== '/admin/daraz') }))
    .filter(g => g.items.length > 0), [me.role, showDaraz])
  const items  = useMemo(() => groups.flatMap(g => g.items), [groups])

  const pinnedHrefs = prefs.pins ?? DEFAULT_PINS
  const pinned = pinnedHrefs.map(h => items.find(i => i.href === h)).filter((i): i is NavItem => Boolean(i))
  const openGroups = prefs.open ?? DEFAULT_OPEN_GROUPS

  const isActive = (href: string) => isActivePath(pathname, href)
  // The group holding the current page is always unfolded, so you can see where you are.
  const isGroupOpen = (label: string) =>
    openGroups.includes(label) || Boolean(groups.find(g => g.label === label)?.items.some(i => isActive(i.href)))

  return { pathname, me, groups, items, pinned, pinnedHrefs, isActive, isGroupOpen }
}
