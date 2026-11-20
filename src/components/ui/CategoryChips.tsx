import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

export interface ChipCategory { slug: string; name: string; count: number }

// Categories with this many products or fewer fold into the "More" menu.
const SMALL_CATEGORY_MAX = 7

const chipBase =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 min-h-[40px] text-sm font-semibold transition-all duration-200 cursor-pointer'
const chipIdle   = 'bg-surface/75 text-slate-600 ring-1 ring-white/90 shadow-sm hover:bg-surface hover:text-primary'
const chipActive = 'bg-primary text-white shadow-lg shadow-primary/25'

function Count({ n, active }: { n: number; active: boolean }) {
  return <span className={`text-[11px] font-bold ${active ? 'text-white/80' : 'text-slate-400'}`}>{n}</span>
}

export default function CategoryChips({
  categories, activeSlug, totalCount, hrefFor,
}: {
  categories: ChipCategory[]
  activeSlug: string
  totalCount: number
  hrefFor: (slug: string) => string
}) {
  if (categories.length === 0) return null

  const sorted  = [...categories].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const primary = sorted.filter(c => c.count > SMALL_CATEGORY_MAX || c.slug === activeSlug)
  const more    = sorted.filter(c => !primary.includes(c))

  return (
    <nav aria-label="Product categories" className="flex items-center gap-2 mb-5">
      <div className="chip-scroller flex-1 min-w-0 flex items-center gap-2 overflow-x-auto py-1 -my-1 px-0.5">
        <Link href={hrefFor('')} scroll={false} aria-current={activeSlug === '' ? 'page' : undefined}
          className={`${chipBase} ${activeSlug === '' ? chipActive : chipIdle}`}>
          All <Count n={totalCount} active={activeSlug === ''} />
        </Link>
        {primary.map(c => (
          <Link key={c.slug} href={hrefFor(c.slug)} scroll={false} aria-current={activeSlug === c.slug ? 'page' : undefined}
            className={`${chipBase} ${activeSlug === c.slug ? chipActive : chipIdle}`}>
            {c.name} <Count n={c.count} active={activeSlug === c.slug} />
          </Link>
        ))}
      </div>

      {more.length > 0 && (
        <details className="relative shrink-0 group">
          <summary className={`${chipBase} ${chipIdle} list-none [&::-webkit-details-marker]:hidden select-none`}>
            More <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="absolute right-0 top-full mt-2 z-30 w-64 max-h-80 overflow-y-auto rounded-2xl bg-surface p-2 shadow-xl ring-1 ring-slate-100">
            {more.map(c => (
              <Link key={c.slug} href={hrefFor(c.slug)} scroll={false}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                <span className="truncate">{c.name}</span>
                <span className="text-[11px] font-bold text-slate-400">{c.count}</span>
              </Link>
            ))}
          </div>
        </details>
      )}
    </nav>
  )
}
