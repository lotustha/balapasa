'use client'

import { useEffect } from 'react'
import { THEMES } from '@/lib/themes'

export { THEMES }

export function applyTheme(key: string) {
  const t = THEMES[key] ?? THEMES['emerald']
  const r = document.documentElement
  r.style.setProperty('--clr-primary',       t.primary)
  r.style.setProperty('--clr-primary-dark',   t.dark)
  r.style.setProperty('--clr-primary-light',  t.light)
  r.style.setProperty('--clr-primary-bg',     t.bg)
}

// No-op after SSR: the <style> tag in <head> already applied the right vars.
// This component only re-applies when the theme changes client-side (e.g. after
// the user picks a new theme in settings and saves).
export default function ThemeApplicator() {
  useEffect(() => {
    fetch('/api/store-config')
      .then(r => r.json())
      .then(d => { if (d.STORE_THEME) applyTheme(d.STORE_THEME) })
      .catch(() => {})
  }, [])
  return null
}
