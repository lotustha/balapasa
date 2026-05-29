'use client'

import { useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'

/**
 * Minimal docs theme toggle. DARK is the default/primary experience.
 * This is intentionally standalone — it does NOT touch the shop's
 * STORE_THEME engine (that system is light-themed). It toggles a
 * `docs-light` class on documentElement; both instances (top bar +
 * sidebar) read that same external source via useSyncExternalStore so
 * they stay in sync without effect-driven setState.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

function getSnapshot() {
  return document.documentElement.classList.contains('docs-light')
}

export default function ThemeToggle() {
  // Read the DOM class directly; server snapshot is always dark (false),
  // matching the initial render so there's no hydration mismatch.
  const isLight = useSyncExternalStore(subscribe, getSnapshot, () => false)

  const toggle = () => {
    document.documentElement.classList.toggle('docs-light', !isLight)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-slate-400 ring-1 ring-inset ring-slate-700/60 transition-colors duration-200 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  )
}
