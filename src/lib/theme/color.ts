// Colour maths for the theme system. No imports, so it runs in the browser, on the server and
// under `node --test` alike.

export type Rgb = [number, number, number]

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

export function isHex(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value.trim())
}

export function toRgb(hex: string): Rgb {
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function toHex([r, g, b]: Rgb): string {
  const part = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase()
}

/** Normalises any accepted hex spelling to `#RRGGBB`, or returns the fallback. */
export function cleanHex(value: unknown, fallback: string): string {
  return isHex(value) ? toHex(toRgb(value)) : fallback
}

/** `weight` 0 gives `a`, 1 gives `b`. */
export function mix(a: string, b: string, weight: number): string {
  const [ar, ag, ab] = toRgb(a)
  const [br, bg, bb] = toRgb(b)
  const w = Math.max(0, Math.min(1, weight))
  return toHex([ar + (br - ar) * w, ag + (bg - ag) * w, ab + (bb - ab) * w])
}

export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio, 1 (none) to 21 (black on white). */
export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export const isDark = (hex: string) => luminance(hex) < 0.18

/**
 * Text colour to put on top of `bg`. White is kept wherever it is legible for bold button labels
 * (3:1), because white on a saturated brand colour is what people expect; only light fills such
 * as yellow or lime switch to near-black.
 */
export function onColor(bg: string, light = '#FFFFFF', dark = '#111827'): string {
  if (contrast(bg, light) >= 3) return light
  return contrast(bg, light) >= contrast(bg, dark) ? light : dark
}

/**
 * Moves `color` towards `towards` in small steps until it reaches `ratio` against `bg`.
 * Used so an accent picked for buttons can also be used for text (prices, links).
 */
export function ensureContrast(color: string, bg: string, ratio: number, towards?: string): string {
  if (contrast(color, bg) >= ratio) return cleanHex(color, color)
  const target = towards ?? onColor(bg)
  for (let step = 1; step <= 20; step++) {
    const next = mix(color, target, step / 20)
    if (contrast(next, bg) >= ratio) return next
  }
  return target
}

export const rgbTriplet = (hex: string) => toRgb(hex).join(',')
