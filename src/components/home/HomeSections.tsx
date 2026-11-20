'use client'

import { Fragment } from 'react'
import { useTheme } from '@/components/theme/ThemeProvider'
import type { HomeSection } from '@/lib/theme/presets'

/**
 * Lays the homepage sections out in the order the theme asks for. Every section arrives already
 * rendered by the server; a section the theme leaves out is simply not placed.
 */
export default function HomeSections({ sections }: { sections: Record<HomeSection, React.ReactNode> }) {
  const { home } = useTheme()
  return <>{home.map(id => <Fragment key={id}>{sections[id]}</Fragment>)}</>
}
