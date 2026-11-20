'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ArrowRight, ShieldCheck, Sparkles, Star, Truck, Zap } from 'lucide-react'
import Hero from '@/components/home/Hero'
import { useTheme } from '@/components/theme/ThemeProvider'
import { formatPrice } from '@/lib/utils'
import type { HeroSettings } from '@/lib/site-settings-shared'

const ICONS = { ShieldCheck, Truck, Star, Zap, Sparkles } as const

interface Pick { id: string; name: string; slug: string; price: number; salePrice?: number | null; images: string[] }

/** A few popular products to put a face on the banner. Empty until loaded, and that is fine. */
function usePicks(count: number): Pick[] {
  const [picks, setPicks] = useState<Pick[]>([])
  useEffect(() => {
    let alive = true
    fetch(`/api/products/trending?limit=${count}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && Array.isArray(d?.products)) setPicks(d.products.slice(0, count)) })
      .catch(() => {})
    return () => { alive = false }
  }, [count])
  return picks
}

function Badges({ hero, className }: { hero: HeroSettings; className: string }) {
  if (!hero.badges.length) return null
  return (
    <ul className={`flex flex-wrap gap-x-5 gap-y-2 ${className}`}>
      {hero.badges.map(b => {
        const Icon = ICONS[b.icon as keyof typeof ICONS] ?? ShieldCheck
        return (
          <li key={b.text} className="flex items-center gap-1.5 text-xs font-semibold">
            <Icon size={14} aria-hidden /> {b.text}
          </li>
        )
      })}
    </ul>
  )
}

/** Wide accent-coloured banner: one message, one button, three popular products. */
function BannerHero({ hero }: { hero: HeroSettings }) {
  const picks = usePicks(3)
  return (
    <section className="px-4 sm:px-6 pt-4 pb-2" data-hero="banner">
      <div
        className="max-w-7xl mx-auto rounded-3xl overflow-hidden grid lg:grid-cols-[1.15fr_1fr] items-center"
        style={{ background:'var(--clr-primary)', color: 'var(--th-on-accent)' }}
      >
        <div className="p-7 sm:p-12">
          {hero.badgeText && (
            <p className="inline-block text-[11px] font-bold uppercase tracking-[0.18em] px-3 py-1 rounded-full mb-5"
              style={{ background:'var(--th-on-accent)', color: 'var(--clr-primary)' }}>
              {hero.badgeText}
            </p>
          )}
          <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
            {hero.headline1} {hero.headline2} {hero.accentWord}
          </h1>
          <p className="mt-4 text-sm sm:text-base max-w-md opacity-85">{hero.subhead}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={hero.ctaPrimaryUrl}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold transition-transform hover:-translate-y-0.5"
              style={{ background:'var(--th-on-accent)', color: 'var(--clr-primary)' }}>
              {hero.ctaPrimaryLabel} <ArrowRight size={15} />
            </Link>
            {hero.ctaSecondaryLabel && (
              <Link href={hero.ctaSecondaryUrl}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-bold border-2 border-current/40 hover:border-current transition-colors">
                {hero.ctaSecondaryLabel}
              </Link>
            )}
          </div>
          <Badges hero={hero} className="mt-7 opacity-90" />
        </div>
        <div className="hidden lg:grid grid-cols-3 gap-3 p-8 pl-0">
          {picks.map((p, i) => (
            <Link key={p.id} href={`/products/${p.slug}`}
              className={`th-neutral group rounded-2xl overflow-hidden bg-surface shadow-xl transition-transform hover:-translate-y-1 ${i === 1 ? 'translate-y-5' : ''}`}>
              <div className="relative aspect-square">
                {p.images[0] && <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="180px" />}
              </div>
              <div className="p-2.5">
                <p className="text-[11px] font-medium text-slate-600 line-clamp-1">{p.name}</p>
                <p className="text-sm font-bold text-primary">{formatPrice(p.salePrice ?? p.price)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Big quiet headline with a single tall picture. */
function EditorialHero({ hero }: { hero: HeroSettings }) {
  const picks = usePicks(2)
  return (
    <section className="px-4 sm:px-6 pt-10 sm:pt-16 pb-10" data-hero="editorial">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-end">
        <div>
          {hero.badgeText && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 mb-6">{hero.badgeText}</p>
          )}
          <h1 className="font-heading font-medium text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight text-slate-900">
            {hero.headline1}<br />
            {hero.headline2} <em className="text-primary">{hero.accentWord}</em>
          </h1>
          <p className="mt-6 text-base text-slate-600 max-w-md leading-relaxed">{hero.subhead}</p>
          <div className="mt-9 flex flex-wrap items-center gap-6">
            <Link href={hero.ctaPrimaryUrl}
              className="inline-flex items-center gap-2 px-7 py-4 bg-primary text-white text-sm font-semibold uppercase tracking-widest rounded-xl hover:bg-primary-dark transition-colors">
              {hero.ctaPrimaryLabel} <ArrowRight size={15} />
            </Link>
            {hero.ctaSecondaryLabel && (
              <Link href={hero.ctaSecondaryUrl}
                className="text-sm font-semibold text-slate-800 underline underline-offset-8 decoration-1 hover:text-primary transition-colors">
                {hero.ctaSecondaryLabel}
              </Link>
            )}
          </div>
          <Badges hero={hero} className="mt-10 text-slate-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {picks.map((p, i) => (
            <Link key={p.id} href={`/products/${p.slug}`} className={`group block ${i === 1 ? 'mt-10' : ''}`}>
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100">
                {p.images[0] && (
                  <Image src={p.images[0]} alt={p.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width:1024px) 50vw, 300px" />
                )}
              </div>
              <p className="mt-3 text-sm text-slate-800 line-clamp-1">{p.name}</p>
              <p className="text-sm font-semibold text-slate-900">{formatPrice(p.salePrice ?? p.price)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/** One slim strip so the products start almost at the top of the page. */
function CompactHero({ hero }: { hero: HeroSettings }) {
  return (
    <section className="px-4 sm:px-6 pt-4" data-hero="compact">
      <div className="max-w-7xl mx-auto rounded-2xl bg-surface px-5 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center gap-4"
        style={{ border:'1px solid rgba(var(--th-ink-rgb),0.08)' }}>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-bold text-xl sm:text-2xl text-slate-900">
            {hero.headline1} {hero.headline2} <span className="text-primary">{hero.accentWord}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1 line-clamp-1">{hero.subhead}</p>
        </div>
        <Link href={hero.ctaPrimaryUrl}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition-colors">
          {hero.ctaPrimaryLabel} <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  )
}

export default function HomeHero({ hero }: { hero: HeroSettings }) {
  const variant = useTheme().layout.hero
  if (variant === 'banner') return <BannerHero hero={hero} />
  if (variant === 'editorial') return <EditorialHero hero={hero} />
  if (variant === 'compact') return <CompactHero hero={hero} />
  return <Hero hero={hero} />
}
