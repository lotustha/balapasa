import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Bike,
  Rocket,
  ShoppingBag,
  Store,
  Bell,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Balapasa Platform API',
  description:
    'Developer documentation for the Balapasa platform API — customer, rider, and store apps, mobile SDKs, and push notifications.',
}

const apps = [
  {
    title: 'Customer App',
    href: '/docs/customer-app',
    icon: ShoppingBag,
    desc: 'Browse products, place orders, track deliveries, and manage payments.',
  },
  {
    title: 'Rider App',
    href: '/docs/rider-app',
    icon: Bike,
    desc: 'Accept assignments, update delivery status, and report proof of delivery.',
  },
  {
    title: 'Store App',
    href: '/docs/store-app',
    icon: Store,
    desc: 'Manage catalog, fulfil orders, and configure delivery carriers.',
  },
]

export default function OverviewPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section>
        <p className="mb-3 font-[family-name:var(--font-jetbrains)] text-sm font-medium uppercase tracking-wide text-emerald-400">
          Documentation
        </p>
        <h1 className="font-[family-name:var(--font-jetbrains)] text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          Balapasa Platform API
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          A single REST surface powering the Balapasa commerce and delivery
          platform across three client apps. Authenticate once, then drive the
          customer, rider, and store experiences — including catalog, orders,
          live delivery tracking, payments, and push notifications — from one
          consistent API.
        </p>
      </section>

      {/* App cards */}
      <section>
        <h2 className="mb-4 font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-slate-100">
          Explore by app
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => {
            const Icon = app.icon
            return (
              <Link
                key={app.href}
                href={app.href}
                className="group flex flex-col rounded-lg bg-slate-800/40 p-5 ring-1 ring-slate-700/60 transition-colors duration-200 hover:bg-slate-800 hover:ring-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <Icon className="h-6 w-6 text-emerald-400" />
                <h3 className="mt-3 font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
                  {app.title}
                </h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-400">
                  {app.desc}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-400">
                  Read docs
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Base URL & environments */}
      <section className="rounded-lg bg-slate-800/40 p-5 ring-1 ring-slate-700/60">
        <h2 className="mb-2 font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-slate-100">
          Base URL &amp; environments
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          All API requests are made over HTTPS to an environment-specific base
          URL. Use the sandbox while integrating; switch to production once your
          credentials are approved.
        </p>
        <dl className="space-y-2 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
            <dt className="w-28 shrink-0 text-slate-500">Production</dt>
            <dd className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              https://api.balapasa.com/v1
            </dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
            <dt className="w-28 shrink-0 text-slate-500">Sandbox</dt>
            <dd className="font-[family-name:var(--font-jetbrains)] text-sky-400">
              https://sandbox.balapasa.com/v1
            </dd>
          </div>
        </dl>
      </section>

      {/* Quick links */}
      <section>
        <h2 className="mb-4 font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-slate-100">
          Quick links
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/docs/getting-started"
            className="group flex items-center gap-3 rounded-lg bg-slate-800/40 p-4 ring-1 ring-slate-700/60 transition-colors duration-200 hover:bg-slate-800 hover:ring-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Rocket className="h-5 w-5 text-emerald-400" />
            <span className="flex-1">
              <span className="block font-medium text-slate-100">
                Getting Started
              </span>
              <span className="block text-sm text-slate-400">
                Get your keys and make a first request.
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-slate-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-emerald-400" />
          </Link>
          <Link
            href="/docs/notifications"
            className="group flex items-center gap-3 rounded-lg bg-slate-800/40 p-4 ring-1 ring-slate-700/60 transition-colors duration-200 hover:bg-slate-800 hover:ring-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Bell className="h-5 w-5 text-emerald-400" />
            <span className="flex-1">
              <span className="block font-medium text-slate-100">
                Push Notifications (FCM)
              </span>
              <span className="block text-sm text-slate-400">
                Deliver real-time order and delivery updates.
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-slate-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-emerald-400" />
          </Link>
        </div>
      </section>
    </div>
  )
}
