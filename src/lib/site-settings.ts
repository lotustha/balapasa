import 'server-only'
import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import {
  HERO_DEFAULTS, SITE_DEFAULTS, SEO_DEFAULTS,
  LEGAL_DEFAULTS, ABOUT_DEFAULTS, CONTACT_DEFAULTS,
  HERO_SETTING_KEYS, SITE_SETTING_KEYS,
  parseBadges, parseFaq, splitBrandName, cleanBrandName,
  type SiteSettings,
} from '@/lib/site-settings-shared'

// Re-export so existing server callers (HERO_DEFAULTS, HERO_SETTING_KEYS, types)
// keep working without import churn.
export { HERO_DEFAULTS, SITE_DEFAULTS, SEO_DEFAULTS, HERO_SETTING_KEYS }
export type { HeroSettings, HeroBadge, SeoSettings, SiteSettings, ContentSettings, FaqItem } from '@/lib/site-settings-shared'

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM app_settings
      WHERE key = ANY(${[...HERO_SETTING_KEYS, ...SITE_SETTING_KEYS]}::text[])
    `
    const map: Record<string, string> = {}
    for (const r of rows) map[r.key] = r.value

    const rawName = map.STORE_NAME || `${SITE_DEFAULTS.brandSplit.primary}|${SITE_DEFAULTS.brandSplit.accent}`

    // Guard against a localhost store URL leaking into emails / JSON-LD. The DB
    // row may be unset (→ SITE_DEFAULTS) or accidentally saved as an internal
    // origin; either way, a localhost canonical URL is never correct in prod.
    const rawStoreUrl = map.STORE_URL || SITE_DEFAULTS.storeUrl
    const storeUrl = /localhost|127\.0\.0\.1|\[::1\]/i.test(rawStoreUrl)
      ? (process.env.STORE_URL || 'https://balapasa.com.np')
      : rawStoreUrl

    return {
      siteName:   cleanBrandName(rawName),
      brandSplit: splitBrandName(rawName),
      storeUrl,
      storeEmail:     map.STORE_EMAIL       ?? SITE_DEFAULTS.storeEmail,
      storePhone:     map.STORE_PHONE       ?? SITE_DEFAULTS.storePhone,
      storeAddress:   map.STORE_ADDRESS     ?? SITE_DEFAULTS.storeAddress,
      whatsappNumber: map.WHATSAPP_NUMBER   ?? SITE_DEFAULTS.whatsappNumber,
      facebookPageId: map.FACEBOOK_PAGE_ID  ?? SITE_DEFAULTS.facebookPageId,
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
      seo: {
        title:       map.SEO_TITLE       || SEO_DEFAULTS.title,
        description: map.SEO_DESCRIPTION || SEO_DEFAULTS.description,
        keywords:    map.SEO_KEYWORDS    || SEO_DEFAULTS.keywords,
      },
      content: {
        legal: {
          privacy:      map.LEGAL_PRIVACY_BODY      || LEGAL_DEFAULTS.privacy,
          terms:        map.LEGAL_TERMS_BODY        || LEGAL_DEFAULTS.terms,
          refund:       map.LEGAL_REFUND_BODY       || LEGAL_DEFAULTS.refund,
          shipping:     map.LEGAL_SHIPPING_BODY     || LEGAL_DEFAULTS.shipping,
          cancellation: map.LEGAL_CANCELLATION_BODY || LEGAL_DEFAULTS.cancellation,
        },
        about: {
          title: map.ABOUT_TITLE || ABOUT_DEFAULTS.title,
          body:  map.ABOUT_BODY  || ABOUT_DEFAULTS.body,
        },
        contact: {
          instagram: map.CONTACT_INSTAGRAM ?? CONTACT_DEFAULTS.instagram,
          x:         map.CONTACT_X         ?? CONTACT_DEFAULTS.x,
          youtube:   map.CONTACT_YOUTUBE   ?? CONTACT_DEFAULTS.youtube,
          hours:     map.CONTACT_HOURS     || CONTACT_DEFAULTS.hours,
          mapEmbed:  map.CONTACT_MAP_EMBED ?? CONTACT_DEFAULTS.mapEmbed,
        },
        faq: parseFaq(map.FAQ_JSON),
      },
    }
  } catch {
    return SITE_DEFAULTS
  }
})
