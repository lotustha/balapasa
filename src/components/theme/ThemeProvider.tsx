'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { buildThemeCss } from '@/lib/theme/css'
import { normalizeTheme, PRESETS, type ThemeConfig } from '@/lib/theme/presets'

const ThemeContext = createContext<ThemeConfig>(PRESETS.aurora)

/** The theme in force: its layout choices, palette and homepage order. */
export const useTheme = () => useContext(ThemeContext)

const GRID_COLUMNS = { spacious: 3, cozy: 4, dense: 6 } as const
export const gridColumns = (theme: ThemeConfig) => GRID_COLUMNS[theme.layout.grid]

/**
 * Applies the theme to the storefront. The server sends the published theme; when the page is
 * shown inside the admin's Appearance preview, the admin page posts the draft here and the page
 * re-skins itself live, without anything being saved.
 */
export default function ThemeProvider({ theme, children }: { theme: ThemeConfig; children: React.ReactNode }) {
  const [preview, setPreview] = useState<ThemeConfig | null>(null)

  useEffect(() => {
    if (window.parent === window) return
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.data?.type !== 'theme-preview') return
      setPreview(normalizeTheme(e.data.theme))
    }
    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: 'theme-preview-ready' }, window.location.origin)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const active = preview ?? theme
  const css = useMemo(() => buildThemeCss(active), [active])

  return (
    <ThemeContext.Provider value={active}>
      {/* The attribute is what scopes the theme to the storefront: see src/lib/theme/css.ts */}
      <style data-shop-theme={active.preset} dangerouslySetInnerHTML={{ __html: css }} />
      <div
        className="contents"
        data-theme={active.preset}
        data-grid={active.layout.grid}
        data-card={active.layout.card}
        data-header={active.layout.header}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  )
}
