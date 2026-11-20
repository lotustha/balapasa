'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  RefreshCw, Loader2, CheckCircle2, AlertTriangle, PauseCircle, Play, Check, X, Search, ExternalLink, Settings,
  ChevronLeft, ChevronRight, ChevronDown,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

type JobId = 'website' | 'mirror' | 'orders'
interface Job { job: JobId; label: string; schedule: string; enabled: boolean; running: boolean; lastAt: string | null; lastStatus: string | null; lastChanges: number }
interface Run { id: string; job: JobId; status: string; trigger: string; changes: number; summary: string; startedAt: string }
interface Held { id: string; sku: string; name: string; oldPrice: number; newPrice: number; oldSalePrice: number | null; newSalePrice: number | null; changePercent: number; createdAt: string }
interface PriceRow extends Held { status: string; source: string }
interface Overview { canAct: boolean; jobs: Job[]; runs: Run[]; held: Held[]; prices: PriceRow[]; orderStats: { shop: string; total: number; open: number; today: number }[] }
interface OrderItem { id: string; name: string; variation: string; image: string | null; paidPrice: number; status: string; trackingCode: string; cancelReason: string; productUrl: string | null }
interface Order { id: string; shop: string; externalId: string; status: string; total: number; shippingFee: number; paymentMethod: string; customerName: string; phone: string; city: string; address: string; placedAt: string; items: OrderItem[] }
interface OrderPage { orders: Order[]; total: number; page: number; totalPages: number; shops: string[] }

const TABS = [['overview', 'Overview'], ['prices', 'Prices'], ['orders', 'Orders']] as const
type Tab = typeof TABS[number][0]
const SHOP_LABEL: Record<string, string> = { balapasa: 'Bala Pasa', trendwave: 'TrendWave' }
const JOB_LABEL: Record<JobId, string> = { website: 'Website sync', mirror: 'Daraz shop sync', orders: 'Daraz orders' }
const POLL_MS = 4000

const when = (iso: string | null) => iso
  ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : 'Never'
const price = (p: number, sale: number | null) => (sale != null ? `${formatPrice(sale)} (was ${formatPrice(p)})` : formatPrice(p))

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  const cls = /cancel|fail|lost|damaged|reject/.test(s) ? 'bg-red-50 text-red-600'
    : /deliver|^ok$|applied/.test(s) ? 'bg-green-50 text-green-700'
    : /return|shipped_back|skipped|held/.test(s) ? 'bg-amber-50 text-amber-700'
    : 'bg-blue-50 text-blue-700'
  return <span className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap ${cls}`}>{status.replace(/_/g, ' ')}</span>
}

const card = 'bg-white rounded-2xl border border-slate-100'
const th = 'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400'

export default function DarazPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [openRun, setOpenRun] = useState<string | null>(null)

  // Bumping `tick` reloads the page data.
  const [tick, setTick] = useState(0)
  const load = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let alive = true
    fetch('/api/admin/daraz')
      .then(async r => (r.ok ? r.json() : Promise.reject(new Error((await r.json().catch(() => ({}))).error ?? `Request failed (${r.status})`))))
      .then((d: Overview) => { if (alive) { setData(d); setError(null) } })
      .catch((e: Error) => { if (alive) setError(e.message) })
    return () => { alive = false }
  }, [tick])
  // While a job is running, keep refreshing so its result appears without a reload.
  const anyRunning = data?.jobs.some(j => j.running) ?? false
  useEffect(() => {
    if (!anyRunning) return
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [anyRunning, load])

  async function act(key: string, url: string, body: unknown, done: string) {
    setBusy(key); setNotice(null); setError(null)
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? `Request failed (${r.status})`)
      setNotice(done)
      load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed') }
    finally { setBusy(null) }
  }

  const heldCount = data?.held.length ?? 0

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 flex items-center gap-2"><RefreshCw size={22} className="text-primary" /> Daraz</h1>
          <p className="text-slate-500 text-sm mt-0.5">What the Daraz jobs did, prices waiting for you, and orders placed on Daraz.</p>
        </div>
        <Link href="/admin/settings?tab=daraz" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
          <Settings size={14} /> Switches
        </Link>
      </div>

      <div className="flex gap-1.5 mb-5" role="tablist" aria-label="Daraz sections">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${tab === id ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {label}{id === 'prices' && heldCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-amber-400 text-white text-[10px]">{heldCount}</span>}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">{error}</p>}
      {notice && <p role="status" className="mb-4 px-4 py-3 rounded-xl bg-green-50 text-green-700 text-sm font-medium">{notice}</p>}

      {!data && !error && <div className={`${card} flex items-center justify-center py-16`}><Loader2 size={24} className="animate-spin text-primary" /></div>}

      {data && tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {data.jobs.map(j => (
              <section key={j.job} className={`${card} p-5`} aria-label={j.label}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-heading font-bold text-slate-900 text-sm">{j.label}</h2>
                  {!j.enabled ? <PauseCircle size={18} className="text-slate-400" aria-label="Switched off" />
                    : j.lastStatus === 'FAILED' ? <AlertTriangle size={18} className="text-red-500" aria-label="Last run failed" />
                    : <CheckCircle2 size={18} className="text-green-500" aria-label="Working" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{j.enabled ? j.schedule : 'Switched off in settings'}</p>
                <p className="text-sm text-slate-700 mt-3">Last run: <span className="font-semibold">{when(j.lastAt)}</span></p>
                <p className="text-[11px] text-slate-400">{j.lastStatus === 'FAILED' ? 'It failed. See the run below.' : j.lastAt ? `${j.lastChanges} change${j.lastChanges === 1 ? '' : 's'} in the last run that changed something` : 'No run recorded yet'}</p>
                {data.canAct && (
                  <button onClick={() => act(`run-${j.job}`, '/api/admin/daraz/run', { job: j.job }, `${j.label} started. This page updates when it finishes.`)}
                    disabled={j.running || busy === `run-${j.job}`}
                    className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                    {j.running || busy === `run-${j.job}` ? <><Loader2 size={13} className="animate-spin" /> Running</> : <><Play size={13} /> Run now</>}
                  </button>
                )}
              </section>
            ))}
          </div>

          {data.orderStats.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {data.orderStats.map(s => (
                <button key={s.shop} onClick={() => setTab('orders')} className={`${card} p-5 text-left hover:border-primary/40 cursor-pointer`}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{SHOP_LABEL[s.shop] ?? s.shop} orders</p>
                  <p className="mt-1 text-sm text-slate-700"><span className="font-heading font-extrabold text-2xl text-slate-900">{s.open}</span> open · {s.today} in the last 24 hours · {s.total} stored</p>
                </button>
              ))}
            </div>
          )}

          <section className={card} aria-labelledby="runs-h">
            <h2 id="runs-h" className="px-5 pt-5 pb-3 font-heading font-bold text-slate-900">Recent runs</h2>
            {data.runs.length === 0 ? <p className="px-5 pb-8 text-sm text-slate-400">No runs recorded yet. They appear after the next scheduled run.</p> : (
              <ul className="divide-y divide-slate-50">
                {data.runs.map(r => (
                  <li key={r.id}>
                    <button onClick={() => setOpenRun(openRun === r.id ? null : r.id)} aria-expanded={openRun === r.id}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 cursor-pointer">
                      <StatusBadge status={r.status} />
                      <span className="text-sm font-semibold text-slate-800 flex-1 min-w-0 truncate">{JOB_LABEL[r.job] ?? r.job}{r.trigger === 'manual' && <span className="ml-2 text-[11px] font-normal text-slate-400">started by hand</span>}</span>
                      <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">{r.changes} change{r.changes === 1 ? '' : 's'}</span>
                      <span className="text-xs text-slate-400 whitespace-nowrap hidden sm:inline">{when(r.startedAt)}</span>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${openRun === r.id ? 'rotate-180' : ''}`} />
                    </button>
                    {openRun === r.id && <pre className="mx-5 mb-4 p-3 rounded-xl bg-slate-50 text-[11px] leading-relaxed text-slate-600 whitespace-pre-wrap break-words">{r.summary || 'No details.'}</pre>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {data && tab === 'prices' && (
        <div className="space-y-5">
          <section className={card} aria-labelledby="held-h">
            <div className="px-5 pt-5 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 id="held-h" className="font-heading font-bold text-slate-900">Waiting for you</h2>
                <p className="text-sm text-slate-500">Price moves bigger than your hold limit. The website keeps the old price until you decide.</p>
              </div>
              {data.canAct && heldCount > 1 && (
                <button onClick={() => act('apply-all', '/api/admin/daraz/run', { job: 'website', applyHeld: true }, 'Sync started with all held prices released.')}
                  disabled={busy === 'apply-all' || data.jobs.find(j => j.job === 'website')?.running}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-white disabled:opacity-50 cursor-pointer whitespace-nowrap">
                  <Check size={13} /> Approve all {heldCount}
                </button>
              )}
            </div>
            {heldCount === 0 ? <p className="px-5 pb-8 text-sm text-slate-400">Nothing is waiting. Every Daraz price is applied.</p> : (
              <ul className="divide-y divide-slate-50">
                {data.held.map(h => (
                  <li key={h.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{h.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{price(h.oldPrice, h.oldSalePrice)} <span aria-hidden="true">→</span> <span className="font-bold text-slate-800">{price(h.newPrice, h.newSalePrice)}</span>
                        <span className={`ml-2 font-bold ${h.changePercent > 0 ? 'text-red-500' : 'text-green-600'}`}>{h.changePercent > 0 ? '+' : ''}{h.changePercent}%</span></p>
                    </div>
                    {data.canAct ? (
                      <div className="flex gap-2">
                        <button onClick={() => act(`a-${h.id}`, '/api/admin/daraz/held', { id: h.id, action: 'approve' }, `New price applied to ${h.name.slice(0, 50)}.`)} disabled={busy !== null}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-primary text-white disabled:opacity-50 cursor-pointer"><Check size={13} /> Approve</button>
                        <button onClick={() => act(`r-${h.id}`, '/api/admin/daraz/held', { id: h.id, action: 'reject' }, `Kept the old price for ${h.name.slice(0, 50)}.`)} disabled={busy !== null}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"><X size={13} /> Reject</button>
                      </div>
                    ) : <span className="text-[11px] text-slate-400">Only an admin can decide</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={card} aria-labelledby="applied-h">
            <h2 id="applied-h" className="px-5 pt-5 pb-3 font-heading font-bold text-slate-900">Recently applied</h2>
            {data.prices.length === 0 ? <p className="px-5 pb-8 text-sm text-slate-400">No price has changed since the import.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100"><th scope="col" className={th}>Product</th><th scope="col" className={th}>Was</th><th scope="col" className={th}>Now</th><th scope="col" className={`${th} text-right`}>Move</th><th scope="col" className={`${th} text-right`}>When</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.prices.map(p => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-semibold text-slate-800 max-w-[16rem] truncate">{p.name}{p.source === 'approved' && <span className="ml-2 text-[10px] font-bold text-primary">approved by hand</span>}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{price(p.oldPrice, p.oldSalePrice)}</td>
                        <td className="px-4 py-3 text-slate-800 whitespace-nowrap">{price(p.newPrice, p.newSalePrice)}</td>
                        <td className={`px-4 py-3 text-right font-bold tabular-nums ${p.changePercent > 0 ? 'text-red-500' : 'text-green-600'}`}>{p.changePercent > 0 ? '+' : ''}{p.changePercent}%</td>
                        <td className="px-4 py-3 text-right text-slate-400 whitespace-nowrap">{when(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {data && tab === 'orders' && <OrdersTab />}
    </div>
  )
}

function OrdersTab() {
  const [shop, setShop] = useState('')
  const [state, setState] = useState('')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<OrderPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const params = new URLSearchParams({ page: String(page) })
    if (shop) params.set('shop', shop)
    if (state) params.set('state', state)
    if (query) params.set('q', query)
    fetch(`/api/admin/daraz/orders?${params}`)
      .then(async r => (r.ok ? r.json() : Promise.reject(new Error((await r.json().catch(() => ({}))).error ?? `Request failed (${r.status})`))))
      .then((d: OrderPage) => { if (alive) { setData(d); setError(null) } })
      .catch((e: Error) => { if (alive) setError(e.message) })
    return () => { alive = false }
  }, [shop, state, query, page])

  const chip = (active: boolean) => `px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${active ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`
  const pick = (fn: () => void) => { fn(); setPage(1) }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Shop">
          <button onClick={() => pick(() => setShop(''))} aria-pressed={shop === ''} className={chip(shop === '')}>All shops</button>
          {(data?.shops ?? []).map(s => <button key={s} onClick={() => pick(() => setShop(s))} aria-pressed={shop === s} className={chip(shop === s)}>{SHOP_LABEL[s] ?? s}</button>)}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Order state">
          {[['', 'Any state'], ['open', 'Open'], ['closed', 'Closed']].map(([id, label]) => (
            <button key={id} onClick={() => pick(() => setState(id))} aria-pressed={state === id} className={chip(state === id)}>{label}</button>
          ))}
        </div>
        <form onSubmit={e => { e.preventDefault(); pick(() => setQuery(q.trim())) }} className="lg:ml-auto relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Order no, name, phone, product" aria-label="Search Daraz orders"
            className="w-full lg:w-64 pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary" />
        </form>
      </div>

      {error && <p role="alert" className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">{error}</p>}
      {!data && !error && <div className={`${card} flex items-center justify-center py-16`}><Loader2 size={24} className="animate-spin text-primary" /></div>}

      {data && (
        <section className={card} aria-label="Daraz orders">
          {data.shops.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-400">Daraz orders are switched off for both shops in Settings → Daraz.</p>
            : data.orders.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-400">No Daraz orders match.</p> : (
              <ul className="divide-y divide-slate-50">
                {data.orders.map(o => (
                  <li key={o.id}>
                    <button onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id}
                      className="w-full grid grid-cols-[1fr_auto] sm:grid-cols-[9rem_1fr_auto_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 text-left hover:bg-slate-50 cursor-pointer">
                      <span className="text-xs text-slate-500"><span className="block font-bold text-slate-700">{SHOP_LABEL[o.shop] ?? o.shop}</span>{when(o.placedAt)}</span>
                      <span className="min-w-0 order-3 sm:order-none col-span-2 sm:col-span-1">
                        <span className="block text-sm font-semibold text-slate-800 truncate">{o.items[0]?.name ?? `Order ${o.externalId}`}{o.items.length > 1 && <span className="text-slate-400 font-normal"> +{o.items.length - 1} more</span>}</span>
                        <span className="block text-[11px] text-slate-400 truncate">#{o.externalId} · {o.customerName || 'No name'}{o.city && ` · ${o.city}`}</span>
                      </span>
                      <span className="text-sm font-bold text-slate-800 tabular-nums whitespace-nowrap hidden sm:block">{formatPrice(o.total)}</span>
                      <StatusBadge status={o.status} />
                    </button>
                    {open === o.id && (
                      <div className="px-5 pb-5 grid gap-4 sm:grid-cols-[1fr_15rem]">
                        <ul className="space-y-2">
                          {o.items.map(i => (
                            <li key={i.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
                              {/* eslint-disable-next-line @next/next/no-img-element -- Daraz-hosted thumbnail, not worth optimising */}
                              {i.image && <img src={i.image} alt="" width={44} height={44} className="w-11 h-11 rounded-lg object-cover bg-white" loading="lazy" />}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-slate-800 truncate">{i.name}</p>
                                <p className="text-[11px] text-slate-500 truncate">{[i.variation, formatPrice(i.paidPrice), i.trackingCode && `Tracking ${i.trackingCode}`, i.cancelReason].filter(Boolean).join(' · ')}</p>
                              </div>
                              <StatusBadge status={i.status || 'unknown'} />
                              {i.productUrl && <a href={i.productUrl} target="_blank" rel="noreferrer" aria-label="Open on Daraz" className="text-slate-400 hover:text-primary"><ExternalLink size={14} /></a>}
                            </li>
                          ))}
                        </ul>
                        <dl className="text-xs text-slate-600 space-y-1.5">
                          <div><dt className="inline text-slate-400">Customer: </dt><dd className="inline font-semibold">{o.customerName || 'Not given'}</dd></div>
                          <div><dt className="inline text-slate-400">Phone: </dt><dd className="inline">{o.phone || 'Not given'}</dd></div>
                          <div><dt className="inline text-slate-400">Address: </dt><dd className="inline">{o.address || 'Not given'}</dd></div>
                          <div><dt className="inline text-slate-400">Payment: </dt><dd className="inline">{o.paymentMethod || 'Not given'}</dd></div>
                          <div><dt className="inline text-slate-400">Total: </dt><dd className="inline font-semibold">{formatPrice(o.total)}</dd> <span className="text-slate-400">+ {formatPrice(o.shippingFee)} shipping</span></div>
                        </dl>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
              <span>{data.total} orders · page {data.page} of {data.totalPages}</span>
              <span className="flex gap-1.5">
                <button onClick={() => setPage(p => p - 1)} disabled={data.page <= 1} aria-label="Previous page" className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer"><ChevronLeft size={14} /></button>
                <button onClick={() => setPage(p => p + 1)} disabled={data.page >= data.totalPages} aria-label="Next page" className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer"><ChevronRight size={14} /></button>
              </span>
            </div>
          )}
        </section>
      )}
      <p className="text-[11px] text-slate-400">Daraz orders are shown here to read. Accepting, packing and shipping them is still done in Daraz Seller Center.</p>
    </div>
  )
}
