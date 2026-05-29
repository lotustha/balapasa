import type { ReactNode } from 'react'
import Link from 'next/link'
import { JetBrains_Mono, IBM_Plex_Sans } from 'next/font/google'
import Sidebar from './components/Sidebar'
import ThemeToggle from './components/ThemeToggle'

// JetBrains Mono is a variable font — no explicit weight array needed.
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

// IBM Plex Sans is NOT a variable font — explicit weights are required or
// next/font throws at build time.
const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-plex',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    // The root layout paints a light gradient on <body>; this wrapper must
    // explicitly override it for the dark dev-docs theme. Fonts are applied
    // here (not on <html>/<body>, which the root layout owns).
    <div
      className={`${jetbrains.variable} ${plex.variable} min-h-screen bg-slate-900 text-slate-300 font-[family-name:var(--font-plex)]`}
    >
      <div className="flex min-h-screen flex-col">
        {/* Top bar — Sidebar owns the mobile hamburger + drawer; it renders the
            hamburger here (it is lg:hidden) and the static sidebar in the row below. */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-slate-800 bg-slate-900/95 px-4 backdrop-blur sm:px-6">
          <Link
            href="/docs"
            className="flex items-center gap-2 pl-12 font-[family-name:var(--font-jetbrains)] text-sm font-semibold tracking-tight text-slate-100 transition-colors duration-200 hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded lg:pl-0"
          >
            <span className="text-emerald-500">●</span>
            Balapasa API
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <div className="mx-auto max-w-3xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
