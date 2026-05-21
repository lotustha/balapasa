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

export interface FaqItem {
  question: string
  answer:   string
}

export interface ContentSettings {
  legal: {
    privacy:      string  // Markdown
    terms:        string  // Markdown
    refund:       string  // Markdown
    shipping:     string  // Markdown
    cancellation: string  // Markdown — order/customer cancellation rules
  }
  about: {
    title: string
    body:  string     // Markdown
  }
  contact: {
    instagram: string  // Full URL
    x:         string  // Full URL (Twitter/X)
    youtube:   string  // Full URL
    hours:     string  // Free text (e.g. "Sun–Fri 10:00 – 18:00")
    mapEmbed:  string  // Google Maps embed URL (src= value)
  }
  faq: FaqItem[]
}

export interface SiteSettings {
  siteName:   string  // Clean brand name (no | marker). Use everywhere except the
                      //  footer/logo wordmark where a gradient-accent half is wanted.
  brandSplit: { primary: string; accent: string }  // Split halves for the wordmark.
  storeUrl:   string  // Public canonical URL (e.g. https://balapasa.com). Used in
                      //  emails, JSON-LD, openGraph, payment redirects.
  storeEmail:      string
  storePhone:      string
  storeAddress:    string
  whatsappNumber:  string
  facebookPageId:  string  // Just the ID/handle, link built as https://facebook.com/{id}
  logoUrl:    string
  faviconUrl: string
  hero:       HeroSettings
  seo:        SeoSettings
  content:    ContentSettings
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

// ── Content defaults (legal, about, contact, FAQ) ─────────────────────────
// Plain, generic, Nepal-ecommerce-friendly placeholders. Admin should replace
// these with their own copy via /admin/settings → Content.

// The page-shell renders an H1 for each legal page (e.g. "Privacy Policy").
// Defaults below must NOT repeat that title as the first markdown heading —
// open with an introductory paragraph or an H3 subsection instead.

export const LEGAL_DEFAULTS = {
  privacy: `We collect only what we need to fulfil your order — name, phone, email, and
delivery address. We never sell your data to third parties.

### What we collect
- Account info (name, email, phone) when you register
- Delivery details on each order
- Cookies for cart persistence and analytics

### How to reach us
For questions about your data, contact us via the **Contact** page. You can
request deletion of your account at any time.`,

  terms: `By using this store you agree to these terms. We may update them; the latest
version always lives on this page.

### Orders & payment
- Cash on Delivery (COD) is accepted across Nepal.
- Online payments via eSewa and Khalti are processed by their respective
  payment providers.
- Prices and stock are subject to change without notice; we will honour the
  price shown at the time you placed your order.

### Delivery
See our **Shipping Policy** for delivery times and zones.

### Returns
See our **Refund Policy** for the return window and process.`,

  refund: `We want you to love what you buy. If something isn't right, here's how to fix it.

### Return window
You have **7 days from delivery** to request a return. Some categories
(electronics, opened beauty products) may have shorter windows — see the
product page.

### How to return
1. Sign in and open the order from **My Orders**.
2. Tap **Request Return** and choose a reason.
3. We'll arrange a pickup or share a drop-off point.
4. Once we receive and inspect the item, your refund is processed.

### Refund timeline
- COD orders: refunded via bank transfer or wallet within 3–5 business days.
- eSewa / Khalti: refunded to your wallet within 3–5 business days.`,

  shipping: `### Coverage
- **Inside Ring Road, Kathmandu:** same-day delivery via Pathao.
- **Kathmandu Valley:** 1–2 business days.
- **Outside the Valley:** 3–7 business days via Pick & Drop logistics partners.

### Delivery charge
Shown at checkout based on your address. Orders above the free-delivery
threshold (configurable per zone) ship free.

### Tracking
You'll receive an SMS/email with a tracking link once your order is dispatched.
You can also track from **My Orders** at any time.`,

  cancellation: `You can cancel an order before it ships. After dispatch, treat it as a
return — see our **Refund Policy**.

### When self-serve cancellation is available
- Order status is **Pending**, **Confirmed**, or **Processing**.
- The parcel has not yet been handed to the courier.

### How to cancel
1. Sign in and open the order from **My Orders**.
2. Tap **Cancel Order** and confirm.
3. If you paid via eSewa/Khalti, the refund is queued and issued within
   3–5 business days. COD orders simply close out — nothing to refund.

### After dispatch
Once the courier has the parcel we can't recall it from the app. WhatsApp
or call us right away — if the rider hasn't reached the doorstep we'll do
our best to intercept. Otherwise, refuse delivery and the order returns
under our 7-day return window.

### Store-initiated cancellation
We may cancel an order if a product is out of stock, fails a quality check,
or if delivery to your address is not feasible. You'll be notified by
SMS/email and any prepaid amount is refunded in full.`,
}

export const ABOUT_DEFAULTS = {
  title: 'About us',
  body: `We're a Kathmandu-based online store bringing curated electronics,
gadgets, and beauty products to every corner of Nepal.

### Why shop with us
- **100% authentic** — sourced from authorised distributors only.
- **Fast delivery** — same-day in Kathmandu, 1–7 days nationwide.
- **Easy returns** — 7-day no-questions return window.
- **Local support** — chat, call, or WhatsApp our team during business hours.

We started this store because shopping for quality electronics and beauty
products in Nepal should not require a trip across town or a long-distance
import. Everything we list, we'd buy ourselves.`,
}

export const CONTACT_DEFAULTS = {
  instagram: '',
  x:         '',
  youtube:   '',
  hours:     'Sun – Fri, 10:00 – 18:00 (closed Saturdays & public holidays)',
  mapEmbed:  '',
}

export const FAQ_DEFAULTS: FaqItem[] = [
  { question: 'How long does delivery take?',
    answer:   'Same-day inside Kathmandu Ring Road, 1–2 days in the Valley, and 3–7 days for the rest of Nepal.' },
  { question: 'Do you accept Cash on Delivery?',
    answer:   'Yes — COD is available everywhere in Nepal. We also accept eSewa and Khalti at checkout.' },
  { question: 'Can I return an item?',
    answer:   'Yes. You have 7 days from delivery to request a return from the My Orders page.' },
  { question: 'Are your products genuine?',
    answer:   'All our products are sourced from authorised distributors. We do not sell counterfeit or grey-market goods.' },
  { question: 'How do I track my order?',
    answer:   'After dispatch you receive an SMS/email with a tracking link. You can also track from the My Orders page or the Track Order page.' },
]

const DEFAULT_BRAND_RAW = process.env.NEXT_PUBLIC_STORE_NAME ?? 'Bala|pasa'

export const SITE_DEFAULTS: SiteSettings = {
  siteName:   DEFAULT_BRAND_RAW.replace(/\|/g, ''),
  brandSplit: splitDefault(DEFAULT_BRAND_RAW),
  storeUrl:   process.env.NEXT_PUBLIC_APP_URL    ?? 'https://balapasa.com',
  storeEmail:     '',
  storePhone:     '',
  storeAddress:   '',
  whatsappNumber: '',
  facebookPageId: '',
  logoUrl:    '/logo.png',
  faviconUrl: '/favicon.ico',
  hero:       HERO_DEFAULTS,
  seo:        SEO_DEFAULTS,
  content: {
    legal:   LEGAL_DEFAULTS,
    about:   ABOUT_DEFAULTS,
    contact: CONTACT_DEFAULTS,
    faq:     FAQ_DEFAULTS,
  },
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
  'STORE_EMAIL', 'STORE_PHONE', 'STORE_ADDRESS', 'WHATSAPP_NUMBER', 'FACEBOOK_PAGE_ID',
  'SEO_TITLE', 'SEO_DESCRIPTION', 'SEO_KEYWORDS',
  'LEGAL_PRIVACY_BODY', 'LEGAL_TERMS_BODY', 'LEGAL_REFUND_BODY', 'LEGAL_SHIPPING_BODY', 'LEGAL_CANCELLATION_BODY',
  'ABOUT_TITLE', 'ABOUT_BODY',
  'CONTACT_INSTAGRAM', 'CONTACT_X', 'CONTACT_YOUTUBE', 'CONTACT_HOURS', 'CONTACT_MAP_EMBED',
  'FAQ_JSON',
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

export function parseFaq(raw: string | undefined): FaqItem[] {
  if (!raw) return FAQ_DEFAULTS
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return FAQ_DEFAULTS
    const valid = parsed
      .filter((f): f is FaqItem =>
        typeof f === 'object' && f !== null
        && typeof (f as FaqItem).question === 'string'
        && typeof (f as FaqItem).answer === 'string'
        && (f as FaqItem).question.trim().length > 0
        && (f as FaqItem).answer.trim().length > 0,
      )
      .slice(0, 20)
    return valid.length > 0 ? valid : FAQ_DEFAULTS
  } catch {
    return FAQ_DEFAULTS
  }
}
