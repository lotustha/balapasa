// Who may open which part of the admin area. One table for the pages (used by the middleware and
// the admin menu) and one for the API (used by the middleware). No imports: this file also runs in
// the middleware runtime.

export type AdminRole = 'STAFF' | 'MANAGER' | 'ADMIN'

const RANK: Record<string, number> = { CUSTOMER: 0, STAFF: 1, MANAGER: 2, ADMIN: 3 }

export function hasRole(role: string | undefined | null, min: AdminRole): boolean {
  return (RANK[role ?? ''] ?? -1) >= RANK[min]
}

const under = (pathname: string, base: string, area: string) =>
  pathname === `${base}/${area}` || pathname.startsWith(`${base}/${area}/`)

// ── Pages ───────────────────────────────────────────────────────────────────
// STAFF work the dashboard and orders; ADMIN alone reaches configuration; MANAGER gets the rest.
const STAFF_PAGES = ['orders']
const ADMIN_PAGES = ['settings', 'logistics', 'whatsapp-bot']

export function pageMinRole(pathname: string): AdminRole {
  if (pathname === '/admin' || STAFF_PAGES.some(a => under(pathname, '/admin', a))) return 'STAFF'
  if (ADMIN_PAGES.some(a => under(pathname, '/admin', a))) return 'ADMIN'
  return 'MANAGER'
}

// ── API ─────────────────────────────────────────────────────────────────────
// Every /api/admin route needs at least STAFF. The lists below raise that floor; a route's own
// requireRole() check can be stricter still.
const MANAGER_API = [
  'settings', 'finance', 'import', 'suppliers', 'coupons', 'discount-rules', 'inventory', 'ai', 'brands',
  'category-mappings', 'products/bulk-delete', 'products/import', 'products/export', 'daraz', 'search-terms',
]
const ADMIN_API = ['team', 'danger', 'logistics', 'whatsapp-bot', 'emails']

export function apiMinRole(pathname: string): AdminRole {
  if (ADMIN_API.some(a => under(pathname, '/api/admin', a))) return 'ADMIN'
  if (MANAGER_API.some(a => under(pathname, '/api/admin', a))) return 'MANAGER'
  return 'STAFF'
}
