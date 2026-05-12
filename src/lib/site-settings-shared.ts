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

export interface SiteSettings {
  siteName:   string
  logoUrl:    string
  faviconUrl: string
  hero:       HeroSettings
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

export const SITE_DEFAULTS: SiteSettings = {
  siteName:   process.env.NEXT_PUBLIC_STORE_NAME ?? 'Balapasa',
  logoUrl:    '/logo.png',
  faviconUrl: '/favicon.ico',
  hero:       HERO_DEFAULTS,
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

export const SITE_SETTING_KEYS = ['STORE_NAME', 'STORE_LOGO_URL', 'STORE_FAVICON_URL'] as const

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
