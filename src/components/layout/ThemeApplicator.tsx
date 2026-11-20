'use client'

import { THEMES } from '@/lib/themes'

export { THEMES }

/** Live preview of the legacy "Theme Color" swatches in admin settings. */
export function applyTheme(key: string) {
  const t = THEMES[key] ?? THEMES['emerald']
  let tag = document.getElementById('legacy-theme-preview') as HTMLStyleElement | null
  if (!tag) {
    tag = document.createElement('style')
    tag.id = 'legacy-theme-preview'
    document.head.appendChild(tag)
  }
  tag.textContent = `:root{--clr-primary:${t.primary};--clr-primary-dark:${t.dark};--clr-primary-light:${t.light};--clr-primary-bg:${t.bg}}`
}
