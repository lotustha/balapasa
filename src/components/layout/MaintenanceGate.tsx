'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wrench, Clock } from 'lucide-react'

// Staff sign in here to get past the gate, so it must stay reachable while the store is closed.
const OPEN_PATHS = ['/login']

function backByLabel(backBy: string): string | null {
  if (!backBy) return null
  const d = new Date(backBy)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function MaintenanceGate({
  title, message, backBy, siteName, logoUrl, children,
}: {
  title: string; message: string; backBy: string; siteName: string; logoUrl: string; children: React.ReactNode
}) {
  const pathname = usePathname()
  if (OPEN_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))) return <>{children}</>

  const until = backByLabel(backBy)
  return (
    <main data-maintenance="closed"
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #FAF5FF 45%, #F0FDF4 100%)' }}>
      <div className="w-full max-w-md text-center bg-white/80 backdrop-blur-sm rounded-3xl ring-1 ring-white shadow-xl px-6 py-10 sm:px-10">
        <Image src={logoUrl} alt={siteName} width={64} height={64} className="mx-auto rounded-2xl" unoptimized />
        <p className="mt-3 font-heading font-bold text-slate-900">{siteName}</p>

        <div className="mx-auto mt-7 w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
          <Wrench size={22} aria-hidden="true" />
        </div>
        <h1 className="mt-4 font-heading font-extrabold text-2xl text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-line">{message}</p>

        {until && (
          <p className="mt-5 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold" suppressHydrationWarning>
            <Clock size={13} aria-hidden="true" /> Back by {until}
          </p>
        )}

        <p className="mt-8 text-[11px] text-slate-400">
          Store staff? <Link href="/login?redirect=/admin" className="font-semibold text-slate-500 underline underline-offset-2 hover:text-primary">Sign in</Link>
        </p>
      </div>
    </main>
  )
}
