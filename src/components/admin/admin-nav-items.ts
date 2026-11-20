import {
  LayoutDashboard, Package, ShoppingBag, Users,
  Tag, Settings, Palette, BarChart3, Truck, Ticket, Zap, MessageCircle, DollarSign, Monitor,
  ShieldCheck, Gift, Boxes, Factory, Repeat, FileText, Download, Mail, Library, Sparkles, RotateCcw,
  MessageCircleQuestion, Star, Wallet, Award, Share2, Bot, Search, RefreshCw,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { hasRole, pageMinRole, type AdminRole } from '@/lib/admin-access'

export interface NavItem  { href: string; icon: LucideIcon; label: string; minRole: AdminRole; keywords?: string }
export interface NavGroup { label: string; items: NavItem[] }

// Who may open a page is decided in one place (admin-access.ts, also used by the middleware), so the
// menu can never offer a link that bounces the user back to the dashboard.
const item = (href: string, icon: LucideIcon, label: string, keywords?: string): NavItem =>
  ({ href, icon, label, minRole: pageMinRole(href), keywords })

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Sell',
    items: [
      item('/admin',         LayoutDashboard, 'Dashboard', 'home overview sales today'),
      item('/admin/orders',  ShoppingBag,     'Orders',    'sales checkout delivery'),
      item('/admin/returns', RotateCcw,       'Returns',   'refund rma'),
      item('/admin/pos',     Monitor,         'POS',       'point of sale counter till'),
    ],
  },
  {
    label: 'Catalog',
    items: [
      item('/admin/products',   Package, 'Products',   'items catalogue price stock'),
      item('/admin/inventory',  Boxes,   'Inventory',  'stock levels adjust'),
      item('/admin/categories', Tag,     'Categories', 'groups collections'),
      item('/admin/media',      Library, 'Media',      'images photos videos gallery'),
      item('/admin/suppliers',  Factory, 'Suppliers',  'vendors purchase'),
      item('/admin/plans',      Repeat,  'Plans',      'subscription plans recurring'),
    ],
  },
  {
    label: 'Customers',
    items: [
      item('/admin/customers',     Users,                 'Customers',     'people accounts buyers'),
      item('/admin/subscriptions', Repeat,                'Subscriptions', 'recurring billing'),
      item('/admin/store-credit',  Wallet,                'Store Credit',  'wallet balance'),
      item('/admin/loyalty',       Award,                 'Loyalty',       'points rewards'),
      item('/admin/referrals',     Share2,                'Referrals',     'invite friends'),
      item('/admin/reviews',       Star,                  'Reviews',       'ratings feedback'),
      item('/admin/qa',            MessageCircleQuestion, 'Questions',     'q&a product questions answers'),
    ],
  },
  {
    label: 'Marketing',
    items: [
      item('/admin/promotions', Zap,      'Promotions',  'flash sale deals discount'),
      item('/admin/coupons',    Ticket,   'Coupons',     'promo codes discount'),
      item('/admin/gift-cards', Gift,     'Gift Cards',  'vouchers'),
      item('/admin/seo-tools',  Sparkles, 'SEO Content', 'search google descriptions ai'),
    ],
  },
  {
    label: 'Reports',
    items: [
      item('/admin/analytics', BarChart3,  'Analytics', 'traffic visitors charts'),
      item('/admin/finance',   DollarSign, 'Finance',   'money expenses cashbook profit'),
      item('/admin/invoices',  FileText,   'Invoices',  'bills receipts'),
      item('/admin/search-terms', Search,  'Searches',  'search terms keywords not found demand'),
    ],
  },
  {
    label: 'Channels & tools',
    items: [
      item('/admin/logistics',    Truck,         'Logistics',    'shipping delivery pathao couriers'),
      item('/admin/messaging',    MessageCircle, 'Messaging',    'chat inbox whatsapp messenger customers'),
      item('/admin/whatsapp-bot', Bot,           'WhatsApp Bot', 'alerts notifications commands link qr'),
      item('/admin/daraz',        RefreshCw,     'Daraz',        'sync orders prices held approve trendwave marketplace'),
      item('/admin/emails',       Mail,          'Emails',       'templates smtp resend'),
      item('/admin/import',       Download,      'Import',       'daraz bulk upload excel'),
    ],
  },
  {
    label: 'Administration',
    items: [
      item('/admin/team',     ShieldCheck, 'Team',     'staff users roles permissions'),
      item('/admin/appearance', Palette,   'Appearance', 'theme colours layout design look fonts homepage'),
      item('/admin/settings', Settings,    'Settings', 'store maintenance payments delivery notices configuration'),
    ],
  },
]

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap(g => g.items)
export const DEFAULT_PINS = ['/admin', '/admin/orders', '/admin/products']

export function groupsFor(role: string): NavGroup[] {
  return NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(i => hasRole(role, i.minRole)) }))
    .filter(g => g.items.length > 0)
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

// Every word typed must appear in the label, the group name or the keywords.
export function searchNav(groups: NavGroup[], query: string): NavItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const scored: { item: NavItem; score: number }[] = []
  for (const g of groups) {
    for (const i of g.items) {
      const label = i.label.toLowerCase()
      const hay = `${label} ${g.label.toLowerCase()} ${i.keywords ?? ''}`
      if (!words.every(w => hay.includes(w))) continue
      // Label matches rank above keyword-only matches; a label that starts with the query ranks first.
      scored.push({ item: i, score: label.startsWith(words[0]) ? 0 : words.every(w => label.includes(w)) ? 1 : 2 })
    }
  }
  return scored.sort((a, b) => a.score - b.score).map(s => s.item)
}
