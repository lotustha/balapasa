import { contrast, ensureContrast, isDark, mix, onColor, rgbTriplet } from './color'
import { FONT_OPTIONS, PRESETS, RADIUS_OPTIONS, type ThemeConfig } from './presets'

// Turns a theme into CSS. The storefront reads everything through custom properties, so one
// generated block re-skins every page. The block is scoped with `:has([data-shop-theme])`, an
// element only the storefront layout renders: the admin panel keeps its own fixed look.

const SCOPE = ':root:has([data-shop-theme])'

// The old "Theme Color" presets, kept exact so a store that never opens the new page looks
// pixel-identical to before.
const LEGACY_SHADES: Record<string, { dark: string; light: string; bg: string }> = {
  '#16A34A': { dark: '#15803D', light: '#DCFCE7', bg: '#F0FDF4' },
  '#2563EB': { dark: '#1D4ED8', light: '#DBEAFE', bg: '#EFF6FF' },
  '#7C3AED': { dark: '#6D28D9', light: '#EDE9FE', bg: '#F5F3FF' },
  '#E11D48': { dark: '#BE123C', light: '#FFE4E6', bg: '#FFF1F2' },
  '#EA580C': { dark: '#C2410C', light: '#FFEDD5', bg: '#FFF7ED' },
  '#0D9488': { dark: '#0F766E', light: '#CCFBF1', bg: '#F0FDFA' },
  '#4F46E5': { dark: '#4338CA', light: '#E0E7FF', bg: '#EEF2FF' },
  '#475569': { dark: '#334155', light: '#E2E8F0', bg: '#F8FAFC' },
}

// How far each neutral step sits between the page background (0) and the text colour (1).
// Light themes get the familiar grey ramp; dark themes get the same ramp mirrored for free.
const NEUTRAL_STEPS: [number, number][] = [
  [50, 0.035], [100, 0.07], [200, 0.13], [300, 0.22], [400, 0.42], [500, 0.56],
  [600, 0.68], [700, 0.78], [800, 0.88], [900, 0.96], [950, 1],
]

const TAILWIND_RADII: [string, number][] = [
  ['xs', 0.125], ['sm', 0.25], ['md', 0.375], ['lg', 0.5], ['xl', 0.75], ['2xl', 1], ['3xl', 1.5], ['4xl', 2],
]

export interface ThemeColors {
  bg: string; surface: string; ink: string
  accent: string; accentDark: string; accentLight: string; accentBg: string
  onAccent: string; accentText: string
  chromeBg: string; chromeFg: string
  dark: boolean
}

/** True when the theme is the untouched original look, which needs no neutral remapping. */
function isClassicAurora(t: ThemeConfig): boolean {
  const a = PRESETS.aurora
  return t.preset === 'aurora' && t.palette.dominant === a.palette.dominant && t.palette.secondary === a.palette.secondary
}

export function themeColors(t: ThemeConfig): ThemeColors {
  const { dominant: bg, secondary: surface, accent } = t.palette
  const dark = isDark(bg)
  // Text colour: near-black or near-white, pulled slightly towards the background's own hue.
  const ink = dark ? mix('#FFFFFF', bg, 0.06) : mix('#0F172A', bg, isClassicAurora(t) ? 0 : 0.04)
  const legacy = !dark ? LEGACY_SHADES[accent] : undefined
  const accentDark  = legacy?.dark  ?? mix(accent, dark ? '#FFFFFF' : '#000000', 0.16)
  const accentLight = legacy?.light ?? mix(surface, accent, dark ? 0.24 : 0.16)
  const accentBg    = legacy?.bg    ?? mix(bg, accent, dark ? 0.12 : 0.07)
  const chromeBg = t.chrome === 'accent' ? accent : t.chrome === 'ink' ? ink : t.chrome === 'dominant' ? bg : surface
  return {
    bg, surface, ink, accent, accentDark, accentLight, accentBg,
    onAccent:   onColor(accent),
    // The accent as text (prices, links) has to be readable on cards and on the page.
    accentText: ensureContrast(ensureContrast(accent, surface, 3.6, ink), bg, 3.6, ink),
    chromeBg,
    chromeFg:   onColor(chromeBg, '#FFFFFF', '#111827'),
    dark,
  }
}

/** Problems worth telling the admin about before they publish. */
export function themeWarnings(t: ThemeConfig): string[] {
  const c = themeColors(t)
  const out: string[] = []
  if (contrast(c.bg, c.surface) < 1.03 && t.decor === 'none' && t.palette.dominant !== t.palette.secondary) {
    out.push('Background and card colours are almost the same, so cards will not stand out.')
  }
  if (contrast(c.accent, c.surface) < 1.6) out.push('The accent colour is very close to the card colour: buttons will be hard to see.')
  if (c.accentText !== c.accent) out.push('The accent is too light or too dark to read as text here, so prices and links use an adjusted shade.')
  return out
}

export function buildThemeCss(t: ThemeConfig): string {
  const c = themeColors(t)
  const classic = isClassicAurora(t)
  const font = FONT_OPTIONS[t.font]
  const radius = RADIUS_OPTIONS[t.radius].scale
  const v: string[] = []
  const set = (name: string, value: string) => v.push(`${name}:${value}`)

  set('--th-bg', c.bg)
  set('--th-surface', c.surface)
  set('--th-surface-rgb', rgbTriplet(c.surface))
  set('--th-ink', c.ink)
  set('--th-ink-rgb', rgbTriplet(c.ink))
  set('--clr-primary', c.accent)
  set('--clr-primary-dark', c.accentDark)
  set('--clr-primary-light', c.accentLight)
  set('--clr-primary-bg', c.accentBg)
  set('--th-on-accent', c.onAccent)
  set('--th-accent-text', c.accentText)
  set('--th-chrome-bg', c.chromeBg)
  set('--th-chrome-fg', c.chromeFg)
  set('--th-chrome-rgb', rgbTriplet(c.chromeFg))
  set('--th-font-heading', font.heading)
  set('--th-font-body', font.body)
  set('color-scheme', c.dark ? 'dark' : 'light')

  if (!classic) {
    for (const [step, weight] of NEUTRAL_STEPS) {
      const shade = mix(c.bg, c.ink, weight)
      set(`--color-slate-${step}`, shade)
      set(`--color-gray-${step}`, shade)
    }
    // Translucent panels: more opaque than on the aurora, because nothing colourful sits behind.
    set('--glass-bg', `rgba(${rgbTriplet(c.surface)},0.9)`)
    set('--glass-bg-md', `rgba(${rgbTriplet(c.surface)},0.96)`)
    set('--glass-border', `rgba(${rgbTriplet(c.ink)},0.09)`)
    set('--glass-shadow', c.dark ? '0 4px 24px rgba(0,0,0,0.45)' : '0 4px 20px rgba(0,0,0,0.06)')
    set('--th-hairline', `rgba(${rgbTriplet(c.ink)},0.1)`)
  }

  if (c.dark) {
    // Status colours (green "in stock" chips, amber notices, red errors) are written as a pale
    // tint with dark text. On a dark page the tints become deep and the text becomes light.
    for (const [family, base] of STATUS_FAMILIES) {
      set(`--color-${family}-50`, mix(c.surface, base, 0.14))
      set(`--color-${family}-100`, mix(c.surface, base, 0.22))
      set(`--color-${family}-200`, mix(c.surface, base, 0.34))
      set(`--color-${family}-600`, mix(base, '#FFFFFF', 0.2))
      set(`--color-${family}-700`, mix(base, '#FFFFFF', 0.38))
      set(`--color-${family}-800`, mix(base, '#FFFFFF', 0.55))
      set(`--color-${family}-900`, mix(base, '#FFFFFF', 0.7))
    }
  }

  if (t.decor === 'none') {
    // The pastel wash colours used behind pages all collapse to the plain background.
    for (let i = 1; i <= 15; i++) set(`--th-wash-${i}`, c.bg)
    set('--th-iridescent', `linear-gradient(90deg, ${c.accentText}, ${c.accentText})`)
    set('--th-warm-gradient', `linear-gradient(135deg, ${c.accentText}, ${c.accentText})`)
    set('--th-decor-vis', 'hidden')
    set('--th-brand-gradient', `linear-gradient(135deg, ${c.accentText}, ${c.accentText})`)
  }

  if (radius !== 1) {
    for (const [name, rem] of TAILWIND_RADII) {
      set(`--radius-${name}`, radius === 0 ? '2px' : `${+(rem * radius).toFixed(3)}rem`)
    }
  }

  // Scopes. A solid block (header bar, dark footer) re-points the same custom properties at its
  // own colours, so every utility class inside it follows without a second set of classes.
  // `.th-neutral` undoes that for things that sit inside a block but are ordinary panels again
  // (a search dropdown under a coloured header).
  const neutral = classic
    ? CLASSIC_SLATE.map(([step, hex]) => `--color-slate-${step}:${hex}`)
    : NEUTRAL_STEPS.map(([step, w]) => `--color-slate-${step}:${mix(c.bg, c.ink, w)}`)
  neutral.push(
    `--th-surface:${c.surface}`, `--th-surface-rgb:${rgbTriplet(c.surface)}`, `--th-accent-text:${c.accentText}`,
    `--clr-primary:${c.accent}`, `--clr-primary-dark:${c.accentDark}`, `--clr-primary-bg:${c.accentBg}`,
    `--th-on-accent:${c.onAccent}`, `color:${c.ink}`,
  )

  return [
    `${SCOPE}{${v.join(';')}}`,
    `${SCOPE} .th-chrome-scope{${blockScope(c.chromeBg, c.chromeFg, c, t.chrome === 'accent')}}`,
    `${SCOPE} .th-ink-scope{${blockScope(c.dark ? mix(c.bg, '#000000', 0.35) : c.ink, c.dark ? c.ink : '#FFFFFF', c, false)}}`,
    `${SCOPE} .th-neutral{${neutral.join(';')}}`,
    // White hairlines belong to the glass look; elsewhere they follow the text colour.
    classic ? '' : `${SCOPE} [class*="border-white"]{border-color:var(--th-hairline)}`,
  ].join('')
}

const STATUS_FAMILIES: [string, string][] = [
  ['red', '#EF4444'], ['orange', '#F97316'], ['amber', '#F59E0B'], ['yellow', '#EAB308'], ['lime', '#84CC16'],
  ['green', '#22C55E'], ['emerald', '#10B981'], ['teal', '#14B8A6'], ['cyan', '#06B6D4'], ['sky', '#0EA5E9'],
  ['blue', '#3B82F6'], ['indigo', '#6366F1'], ['violet', '#8B5CF6'], ['purple', '#A855F7'], ['fuchsia', '#D946EF'],
  ['pink', '#EC4899'], ['rose', '#F43F5E'],
]

const CLASSIC_SLATE: [number, string][] = [
  [50, '#f8fafc'], [100, '#f1f5f9'], [200, '#e2e8f0'], [300, '#cbd5e1'], [400, '#94a3b8'], [500, '#64748b'],
  [600, '#475569'], [700, '#334155'], [800, '#1e293b'], [900, '#0f172a'], [950, '#020617'],
]

/** Custom properties for a solid block with background `bg` and text `fg`. */
function blockScope(bg: string, fg: string, c: ThemeColors, onAccent: boolean): string {
  const out = NEUTRAL_STEPS.map(([step, w]) => `--color-slate-${step}:${mix(bg, fg, Math.min(1, w + 0.12))}`)
  const lifted = mix(bg, fg, 0.1)
  // On an accent-coloured block the accent itself is invisible, so highlights use the text colour.
  const accentText = onAccent ? fg : ensureContrast(c.accent, bg, 3.6, fg)
  out.push(
    `background:${bg}`, `color:${fg}`,
    `--th-surface:${lifted}`, `--th-surface-rgb:${rgbTriplet(lifted)}`,
    `--th-accent-text:${accentText}`,
    `--clr-primary-bg:${mix(bg, fg, 0.14)}`,
    `--th-iridescent:linear-gradient(90deg, ${accentText}, ${accentText})`, `--th-brand-gradient:linear-gradient(90deg, ${accentText}, ${accentText})`,
    `--glass-bg:${mix(bg, fg, 0.12)}`, `--glass-border:${mix(bg, fg, 0.2)}`, `--th-hairline:${mix(bg, fg, 0.2)}`,
  )
  if (onAccent) out.push(`--clr-primary:${fg}`, `--clr-primary-dark:${mix(fg, bg, 0.15)}`, `--th-on-accent:${bg}`)
  return out.join(';')
}
