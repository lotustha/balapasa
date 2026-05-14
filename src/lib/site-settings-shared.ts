// Client-safe site settings types & defaults — no Prisma imports.
// Pulled out of site-settings.ts so client components can import constants
// and types without dragging the DB layer into the browser bundle.

export interface HeroBadge {
  text: string
  icon: string  // lucide icon name (ShieldCheck, Truck, Star, Zap, Sparkles)
}

export interface HeroSettings {
  badgeText:        string
  headline1:        string
  headline2:        string
  accentWord:       string
  tagline:          string
  subhead:          string
  ctaPrimaryLabel:  string
  ctaPrimaryUrl:    string
  ctaSecondaryLabel: string
  ctaSecondaryUrl:  string
  badges:           HeroBadge[]
}

export interface SeoSettings {
  title:       string  // Full Google title (e.g. "Balapasa — Tech & Beauty Hub Nepal")
  description: string  // Gray text shown under the title in Google search results
  keywords:    string  // Comma-separated meta keywords
}

export interface SiteSettings {
  siteName:   string  // Clean brand name (no | marker). Use everywhere except the
                      //  footer/logo wordmark where a gradient-accent half is wanted.
  brandSplit: { primary: string; accent: string }  // Split halves for the wordmark.
  storeUrl:   string  // Public canonical URL (e.g. https://balapasa.com). Used in
                      //  emails, JSON-LD, openGraph, payment redirects.
  logoUrl:    string
  faviconUrl: string
  hero:       HeroSettings
  seo:        SeoSettings
}

export const HERO_DEFAULTS: HeroSettings = {
  badgeText:        'New arrivals every week',
  headline1:        'Where Tech',
  headline2:        'Meets',
  accentWord:       'Beauty',
  tagline:          'All in one place.',
  subhead:          'Premium electronics, cutting-edge gadgets, and luxe beauty — curated for you, delivered fast across Nepal.',
  ctaPrimaryLabel:  'Shop Now',
  ctaPrimaryUrl:    '/products',
  ctaSecondaryLabel: 'Featured Picks',
  ctaSecondaryUrl:  '/products?featured=true',
  badges: [
    { text: 'Authentic Products', icon: 'ShieldCheck' },
    { text: 'Same-day Delivery',  icon: 'Truck' },
    { text: '4.9/5 Rated',        icon: 'Star' },
  ],
}

export const SEO_DEFAULTS: SeoSettings = {
  title:       'Balapasa — Tech & Beauty Hub Nepal',
  description: 'Shop electronics, gadgets, skincare & beauty at the best prices in Nepal. Fast same-day delivery in Kathmandu via Pathao. 100% authentic products.',
  keywords:    'online shopping Nepal, electronics Nepal, gadgets, beauty products, buy online Nepal, fast delivery Kathmandu, Balapasa',
}

const DEFAULT_BRAND_RAW = process.env.NEXT_PUBLIC_STORE_NAME ?? 'Bala|pasa'

export const SITE_DEFAULTS: SiteSettings = {
  siteName:   DEFAULT_BRAND_RAW.replace(/\|/g, ''),
  brandSplit: splitDefault(DEFAULT_BRAND_RAW),
  storeUrl:   process.env.NEXT_PUBLIC_APP_URL    ?? 'https://balapasa.com',
  logoUrl:    '/logo.png',
  faviconUrl: '/favicon.ico',
  hero:       HERO_DEFAULTS,
  seo:        SEO_DEFAULTS,
}

function splitDefault(name: string): { primary: string; accent: string } {
  if (name.includes('|')) {
    const idx = name.indexOf('|')
    return { primary: name.slice(0, idx), accent: name.slice(idx + 1) }
  }
  if (name.length <= 1) return { primary: name, accent: '' }
  const mid = Math.ceil(name.length / 2)
  return { primary: name.slice(0, mid), accent: name.slice(mid) }
}

export const HERO_SETTING_KEYS = [
  'HERO_BADGE_TEXT',
  'HERO_HEADLINE_1',
  'HERO_HEADLINE_2',
  'HERO_ACCENT_WORD',
  'HERO_TAGLINE',
  'HERO_SUBHEAD',
  'HERO_CTA_PRIMARY_LABEL',
  'HERO_CTA_PRIMARY_URL',
  'HERO_CTA_SECONDARY_LABEL',
  'HERO_CTA_SECONDARY_URL',
  'HERO_BADGES_JSON',
] as const

export const SITE_SETTING_KEYS = [
  'STORE_NAME', 'STORE_URL', 'STORE_LOGO_URL', 'STORE_FAVICON_URL',
  'SEO_TITLE', 'SEO_DESCRIPTION', 'SEO_KEYWORDS',
] as const

/**
 * Split a brand/site name into two halves for the gradient-accent wordmark
 * used in the header, footer, admin sidebar, and auth pages.
 *
 * The split point is fully driven by the admin's STORE_NAME setting:
 *   - `"Bala|pasa"`  → primary "Bala", accent "pasa"  (iridescent half)
 *   - `"Acme Shop"`  → primary "Acme Shop", accent "" (no accent half)
 *
 * No magic: tenants without a `|` simply render the whole name as plain text.
 * Multi-tenant SaaS-friendly — every brand controls its own split.
 *
 * Everywhere else (page titles, metadata, JSON-LD, openGraph, emails) should
 * use `cleanBrandName()` to strip the marker.
 */
export function splitBrandName(name: string): { primary: string; accent: string } {
  const idx = name.indexOf('|')
  if (idx === -1) return { primary: name, accent: '' }
  return { primary: name.slice(0, idx), accent: name.slice(idx + 1) }
}

export function cleanBrandName(name: string): string {
  return name.replace(/\|/g, '')
}

export function parseBadges(raw: string | undefined): HeroBadge[] {
  if (!raw) return HERO_DEFAULTS.badges
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return HERO_DEFAULTS.badges
    return parsed
      .filter((b): b is HeroBadge =>
        typeof b === 'object' && b !== null
        && typeof (b as HeroBadge).text === 'string'
        && typeof (b as HeroBadge).icon === 'string'
        && (b as HeroBadge).text.trim().length > 0,
      )
      .slice(0, 3)
  } catch {
    return HERO_DEFAULTS.badges
  }
}
