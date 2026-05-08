'use client'

import { useEffect } from 'react'

export const THEMES: Record<string, { primary: string; dark: string; light: string; bg: string; name: string }> = {
  emerald: { name: 'Emerald',  primary: '#16A34A', dark: '#15803D', light: '#DCFCE7', bg: '#F0FDF4' },
  blue:    { name: 'Blue',     primary: '#2563EB', dark: '#1D4ED8', light: '#DBEAFE', bg: '#EFF6FF' },
  purple:  { name: 'Purple',   primary: '#7C3AED', dark: '#6D28D9', light: '#EDE9FE', bg: '#F5F3FF' },
  rose:    { name: 'Rose',     primary: '#E11D48', dark: '#BE123C', light: '#FFE4E6', bg: '#FFF1F2' },
  orange:  { name: 'Orange',   primary: '#EA580C', dark: '#C2410C', light: '#FFEDD5', bg: '#FFF7ED' },
  teal:    { name: 'Teal',     primary: '#0D9488', dark: '#0F766E', light: '#CCFBF1', bg: '#F0FDFA' },
  indigo:  { name: 'Indigo',   primary: '#4F46E5', dark: '#4338CA', light: '#E0E7FF', bg: '#EEF2FF' },
  slate:   { name: 'Slate',    primary: '#475569', dark: '#334155', light: '#E2E8F0', bg: '#F8FAFC' },
}

export function applyTheme(key: string) {
  const t = THEMES[key] ?? THEMES['emerald']
  const r = document.documentElement
  r.style.setProperty('--clr-primary',       t.primary)
  r.style.setProperty('--clr-primary-dark',   t.dark)
  r.style.setProperty('--clr-primary-light',  t.light)
  r.style.setProperty('--clr-primary-bg',     t.bg)
}

export default function ThemeApplicator() {
  useEffect(() => {
    fetch('/api/store-config')
      .then(r => r.json())
      .then(d => { if (d.STORE_THEME) applyTheme(d.STORE_THEME) })
      .catch(() => {})
  }, [])
  return null
}
