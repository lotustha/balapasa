'use client'

import Link from 'next/link'
import { useTheme } from '@/components/theme/ThemeProvider'

const QUICK_LINKS = [
  ['/about', 'About'], ['/contact', 'Contact'], ['/faq', 'FAQ'], ['/track-order', 'Track order'],
  ['/shipping-policy', 'Shipping'], ['/refund-policy', 'Returns'], ['/privacy', 'Privacy'], ['/terms', 'Terms'],
] as const

/** The footer's outer shell. Its look (light, dark block, or one line) comes from the theme. */
export default function FooterFrame({ children }: { children: React.ReactNode }) {
  const variant = useTheme().layout.footer

  if (variant === 'dark') {
    return <footer data-footer="dark" className="relative overflow-hidden th-ink-scope">{children}</footer>
  }
  if (variant === 'minimal') {
    return (
      <footer data-footer="minimal" className="relative" style={{ borderTop:'1px solid rgba(var(--th-ink-rgb),0.12)' }}>
        <nav aria-label="Footer" className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {QUICK_LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">
              {label}
            </Link>
          ))}
        </nav>
        {children}
      </footer>
    )
  }
  return (
    <footer
      data-footer="classic"
      className="relative overflow-hidden"
      style={{ background:'linear-gradient(180deg, var(--th-wash-1) 0%, var(--th-wash-7) 100%)' }}
    >
      {children}
    </footer>
  )
}
