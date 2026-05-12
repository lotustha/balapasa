import 'server-only'
import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import {
  HERO_DEFAULTS, SITE_DEFAULTS, HERO_SETTING_KEYS, SITE_SETTING_KEYS,
  parseBadges,
  type SiteSettings,
} from '@/lib/site-settings-shared'

// Re-export so existing server callers (HERO_DEFAULTS, HERO_SETTING_KEYS, types)
// keep working without import churn.
export { HERO_DEFAULTS, SITE_DEFAULTS, HERO_SETTING_KEYS }
export type { HeroSettings, HeroBadge, SiteSettings } from '@/lib/site-settings-shared'

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM app_settings
      WHERE key = ANY(${[...HERO_SETTING_KEYS, ...SITE_SETTING_KEYS]}::text[])
    `
    const map: Record<string, string> = {}
    for (const r of rows) map[r.key] = r.value

    return {
      siteName:   map.STORE_NAME        || SITE_DEFAULTS.siteName,
      logoUrl:    map.STORE_LOGO_URL    || SITE_DEFAULTS.logoUrl,
      faviconUrl: map.STORE_FAVICON_URL || SITE_DEFAULTS.faviconUrl,
      hero: {
        badgeText:         map.HERO_BADGE_TEXT          || HERO_DEFAULTS.badgeText,
        headline1:         map.HERO_HEADLINE_1          || HERO_DEFAULTS.headline1,
        headline2:         map.HERO_HEADLINE_2          || HERO_DEFAULTS.headline2,
        accentWord:        map.HERO_ACCENT_WORD         || HERO_DEFAULTS.accentWord,
        tagline:           map.HERO_TAGLINE             || HERO_DEFAULTS.tagline,
        subhead:           map.HERO_SUBHEAD             || HERO_DEFAULTS.subhead,
        ctaPrimaryLabel:   map.HERO_CTA_PRIMARY_LABEL   || HERO_DEFAULTS.ctaPrimaryLabel,
        ctaPrimaryUrl:     map.HERO_CTA_PRIMARY_URL     || HERO_DEFAULTS.ctaPrimaryUrl,
        ctaSecondaryLabel: map.HERO_CTA_SECONDARY_LABEL || HERO_DEFAULTS.ctaSecondaryLabel,
        ctaSecondaryUrl:   map.HERO_CTA_SECONDARY_URL   || HERO_DEFAULTS.ctaSecondaryUrl,
        badges:            parseBadges(map.HERO_BADGES_JSON),
      },
    }
  } catch {
    return SITE_DEFAULTS
  }
})
