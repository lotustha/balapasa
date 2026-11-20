import { cleanHex } from './color'

// A theme is three independent choices: a 60-30-10 palette, a style (fonts, corners, decoration)
// and a layout (which variant of each storefront block is used). A preset is a named starting
// point for all three; the admin can change any part of it afterwards.

export interface ThemePalette {
  /** 60%: the page background. */
  dominant: string
  /** 30%: cards, panels, menus. */
  secondary: string
  /** 10%: buttons, prices, badges, links. */
  accent: string
}

export const FONT_OPTIONS = {
  modern:    { label: 'Modern',    hint: 'Plus Jakarta Sans + Inter', heading: 'var(--font-jakarta)',  body: 'var(--font-inter)' },
  editorial: { label: 'Editorial', hint: 'Playfair Display + Inter',  heading: 'var(--font-playfair)', body: 'var(--font-inter)' },
  clean:     { label: 'Clean',     hint: 'Inter throughout',          heading: 'var(--font-inter)',    body: 'var(--font-inter)' },
  tech:      { label: 'Tech',      hint: 'IBM Plex Sans throughout',  heading: 'var(--font-plex)',     body: 'var(--font-plex)' },
} as const

export const RADIUS_OPTIONS = {
  sharp: { label: 'Sharp',  scale: 0 },
  soft:  { label: 'Soft',   scale: 0.5 },
  round: { label: 'Round',  scale: 1 },
  pill:  { label: 'Extra round', scale: 1.4 },
} as const

export const DECOR_OPTIONS = {
  aurora: { label: 'Aurora glow', hint: 'Soft colour wash and blurred shapes behind the page' },
  none:   { label: 'Plain',       hint: 'Flat background, nothing behind the content' },
} as const

export const CHROME_OPTIONS = {
  surface: { label: 'Card colour' },
  dominant: { label: 'Background colour' },
  accent:  { label: 'Accent colour' },
  ink:     { label: 'Text colour (strong contrast)' },
} as const

export const LAYOUT_OPTIONS = {
  header: {
    label: 'Header',
    options: {
      floating: { label: 'Floating',  hint: 'Rounded bar that floats over the page' },
      bar:      { label: 'Full bar',  hint: 'Edge-to-edge bar with a wide search box' },
      minimal:  { label: 'Minimal',   hint: 'Thin line, centred name, quiet icons' },
    },
  },
  hero: {
    label: 'Homepage top',
    options: {
      showcase:  { label: 'Showcase',  hint: 'Big animated intro with trending products' },
      banner:    { label: 'Banner',    hint: 'Wide colour banner with one message' },
      editorial: { label: 'Editorial', hint: 'Large headline, lots of space' },
      compact:   { label: 'Compact',   hint: 'One slim strip, products start right away' },
    },
  },
  card: {
    label: 'Product card',
    options: {
      glass:   { label: 'Soft',    hint: 'Rounded card with a floating add button' },
      compact: { label: 'Compact', hint: 'Small and dense, more products per row' },
      minimal: { label: 'Minimal', hint: 'Image first, no box around the text' },
      bold:    { label: 'Bold',    hint: 'Thick outline and a full-width button' },
    },
  },
  grid: {
    label: 'Products per row',
    options: {
      spacious: { label: 'Few (3)',  hint: 'Large pictures' },
      cozy:     { label: 'Normal (4)', hint: 'Balanced' },
      dense:    { label: 'Many (6)', hint: 'Marketplace style' },
    },
  },
  categories: {
    label: 'Categories block',
    options: {
      tiles:   { label: 'Tiles',   hint: 'Cards with a product collage' },
      circles: { label: 'Circles', hint: 'Round pictures in one row' },
      strip:   { label: 'Chips',   hint: 'A simple row of names' },
    },
  },
  footer: {
    label: 'Footer',
    options: {
      classic: { label: 'Classic', hint: 'Light, four columns' },
      dark:    { label: 'Dark',    hint: 'Strong contrast block' },
      minimal: { label: 'Minimal', hint: 'One line of links' },
    },
  },
} as const

export type LayoutKey = keyof typeof LAYOUT_OPTIONS
export type ThemeLayout = { [K in LayoutKey]: keyof (typeof LAYOUT_OPTIONS)[K]['options'] }

export const HOME_SECTIONS = {
  hero:       'Top banner',
  dealOfDay:  'Deal of the day',
  categories: 'Categories',
  newArrivals: 'Newly added',
  featured:   'Featured products',
  deals:      'Flash deals',
  trust:      'Trust bar (delivery, returns, support)',
  newsletter: 'Newsletter sign-up',
} as const
export type HomeSection = keyof typeof HOME_SECTIONS
export const DEFAULT_HOME: HomeSection[] = ['hero', 'dealOfDay', 'categories', 'newArrivals', 'featured', 'deals', 'trust', 'newsletter']

export interface ThemeConfig {
  preset:  string
  palette: ThemePalette
  font:    keyof typeof FONT_OPTIONS
  radius:  keyof typeof RADIUS_OPTIONS
  decor:   keyof typeof DECOR_OPTIONS
  /** Colour of the header and footer when their layout is a solid block. */
  chrome:  keyof typeof CHROME_OPTIONS
  layout:  ThemeLayout
  /** Homepage sections in display order. A section left out is hidden. */
  home:    HomeSection[]
}

export interface ThemePreset extends ThemeConfig {
  name:    string
  tagline: string
}

const AURORA_LAYOUT: ThemeLayout = { header: 'floating', hero: 'showcase', card: 'glass', grid: 'cozy', categories: 'tiles', footer: 'classic' }

export const PRESETS: Record<string, ThemePreset> = {
  aurora: {
    preset: 'aurora', name: 'Aurora', tagline: 'Soft glass over a pastel glow. The original look.',
    palette: { dominant: '#F4F6FF', secondary: '#FFFFFF', accent: '#16A34A' },
    font: 'modern', radius: 'round', decor: 'aurora', chrome: 'surface',
    layout: AURORA_LAYOUT, home: DEFAULT_HOME,
  },
  bazaar: {
    preset: 'bazaar', name: 'Bazaar', tagline: 'Busy marketplace: big search, dense shelves, loud deals.',
    palette: { dominant: '#F1F3F6', secondary: '#FFFFFF', accent: '#F85606' },
    font: 'clean', radius: 'soft', decor: 'none', chrome: 'accent',
    layout: { header: 'bar', hero: 'banner', card: 'compact', grid: 'dense', categories: 'circles', footer: 'classic' },
    home: ['hero', 'categories', 'deals', 'dealOfDay', 'featured', 'newArrivals', 'trust', 'newsletter'],
  },
  atelier: {
    preset: 'atelier', name: 'Atelier', tagline: 'Quiet and editorial: serif headlines, big pictures, room to breathe.',
    palette: { dominant: '#F7F4EF', secondary: '#EDE8E0', accent: '#1C1917' },
    font: 'editorial', radius: 'sharp', decor: 'none', chrome: 'dominant',
    layout: { header: 'minimal', hero: 'editorial', card: 'minimal', grid: 'spacious', categories: 'strip', footer: 'minimal' },
    home: ['hero', 'featured', 'categories', 'newArrivals', 'deals', 'trust', 'newsletter'],
  },
  midnight: {
    preset: 'midnight', name: 'Midnight', tagline: 'Dark and electric, made for gadgets.',
    palette: { dominant: '#0B0F14', secondary: '#151B23', accent: '#B6F23C' },
    font: 'tech', radius: 'soft', decor: 'none', chrome: 'surface',
    layout: { header: 'bar', hero: 'banner', card: 'glass', grid: 'cozy', categories: 'tiles', footer: 'dark' },
    home: DEFAULT_HOME,
  },
  bloom: {
    preset: 'bloom', name: 'Bloom', tagline: 'Soft and warm, made for beauty and gifts.',
    palette: { dominant: '#FFF4F1', secondary: '#FFFBF7', accent: '#BE185D' },
    font: 'editorial', radius: 'pill', decor: 'none', chrome: 'surface',
    layout: { header: 'floating', hero: 'editorial', card: 'glass', grid: 'cozy', categories: 'circles', footer: 'classic' },
    home: ['hero', 'categories', 'featured', 'dealOfDay', 'newArrivals', 'deals', 'trust', 'newsletter'],
  },
  bolt: {
    preset: 'bolt', name: 'Bolt', tagline: 'Loud and blunt: black, white and one shout of yellow.',
    palette: { dominant: '#FAFAF7', secondary: '#FFFFFF', accent: '#FFD60A' },
    font: 'modern', radius: 'sharp', decor: 'none', chrome: 'ink',
    layout: { header: 'bar', hero: 'banner', card: 'bold', grid: 'cozy', categories: 'strip', footer: 'dark' },
    home: ['hero', 'deals', 'categories', 'featured', 'newArrivals', 'dealOfDay', 'trust', 'newsletter'],
  },
}

export const DEFAULT_PRESET = 'aurora'

// The old "Theme Color" setting: eight accent colours for the Aurora look.
export const LEGACY_ACCENTS: Record<string, string> = {
  emerald: '#16A34A', blue: '#2563EB', purple: '#7C3AED', rose: '#E11D48',
  orange: '#EA580C', teal: '#0D9488', indigo: '#4F46E5', slate: '#475569',
}

const pick = <T extends string>(value: unknown, allowed: Record<string, unknown>, fallback: T): T =>
  typeof value === 'string' && value in allowed ? (value as T) : fallback

/** Turns anything (saved JSON, a draft from the admin page, garbage) into a complete, valid theme. */
export function normalizeTheme(input: unknown, legacyAccent?: string): ThemeConfig {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const base = PRESETS[pick(raw.preset, PRESETS, DEFAULT_PRESET)]
  const palette = (raw.palette && typeof raw.palette === 'object' ? raw.palette : {}) as Record<string, unknown>
  const layout = (raw.layout && typeof raw.layout === 'object' ? raw.layout : {}) as Record<string, unknown>
  const accentFallback = !input && legacyAccent && LEGACY_ACCENTS[legacyAccent] ? LEGACY_ACCENTS[legacyAccent] : base.palette.accent

  const home = Array.isArray(raw.home)
    ? [...new Set(raw.home.filter((s): s is HomeSection => typeof s === 'string' && s in HOME_SECTIONS))]
    : base.home

  return {
    preset: base.preset,
    palette: {
      dominant:  cleanHex(palette.dominant, base.palette.dominant),
      secondary: cleanHex(palette.secondary, base.palette.secondary),
      accent:    cleanHex(palette.accent, accentFallback),
    },
    font:   pick(raw.font, FONT_OPTIONS, base.font),
    radius: pick(raw.radius, RADIUS_OPTIONS, base.radius),
    decor:  pick(raw.decor, DECOR_OPTIONS, base.decor),
    chrome: pick(raw.chrome, CHROME_OPTIONS, base.chrome),
    layout: Object.fromEntries(
      (Object.keys(LAYOUT_OPTIONS) as LayoutKey[]).map(k => [k, pick(layout[k], LAYOUT_OPTIONS[k].options, base.layout[k])]),
    ) as ThemeLayout,
    home,
  }
}

export const THEME_SETTING_KEY = 'THEME_JSON'

export interface ThemeSetting {
  published: ThemeConfig
  /** What the admin is working on. Only they see it, in the preview. */
  draft: ThemeConfig | null
}

export function parseThemeSetting(rawJson: string | null | undefined, legacyAccent?: string): ThemeSetting {
  let saved: { published?: unknown; draft?: unknown } = {}
  try { if (rawJson) saved = JSON.parse(rawJson) ?? {} } catch { /* fall back to the default theme */ }
  return {
    published: normalizeTheme(saved.published ?? null, legacyAccent),
    draft:     saved.draft ? normalizeTheme(saved.draft) : null,
  }
}
