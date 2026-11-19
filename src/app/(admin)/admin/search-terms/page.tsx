'use client'

import { useEffect, useState } from 'react'
import { Loader2, Search, SearchX } from 'lucide-react'

interface Term { query: string; searches: number; results: number; last: string }
interface Report { range: string; total: number; top: Term[]; noResults: Term[] }

const RANGES = [['7d', '7 days'], ['30d', '30 days'], ['90d', '90 days']] as const

function TermTable({ terms, empty }: { terms: Term[]; empty: string }) {
  if (terms.length === 0) return <p className="px-5 py-10 text-center text-sm text-slate-400">{empty}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <th scope="col" className="px-5 py-3">Search</th>
            <th scope="col" className="px-3 py-3 text-right">Times</th>
            <th scope="col" className="px-3 py-3 text-right">Products found</th>
            <th scope="col" className="px-5 py-3 text-right whitespace-nowrap">Last searched</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {terms.map(t => (
            <tr key={t.query}>
              <td className="px-5 py-3 font-semibold text-slate-800 break-all">{t.query}</td>
              <td className="px-3 py-3 text-right tabular-nums text-slate-600">{t.searches}</td>
              <td className={`px-3 py-3 text-right tabular-nums font-semibold ${t.results === 0 ? 'text-red-500' : 'text-slate-600'}`}>{t.results}</td>
              <td className="px-5 py-3 text-right text-slate-400 whitespace-nowrap">{new Date(t.last).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function SearchTermsPage() {
  const [range, setRange] = useState<string>('30d')
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/admin/search-terms?range=${range}`)
      .then(async r => (r.ok ? r.json() : Promise.reject(new Error((await r.json().catch(() => ({}))).error ?? `Request failed (${r.status})`))))
      .then((data: Report) => { if (alive) { setReport(data); setError(null) } })
      .catch((e: Error) => { if (alive) setError(e.message) })
    return () => { alive = false }
  }, [range])

  const loading = !error && report?.range !== range

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 flex items-center gap-2"><Search size={22} className="text-primary" /> Searches</h1>
          <p className="text-slate-500 text-sm mt-0.5">What shoppers type into the store search, and what they could not find.</p>
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Period">
          {RANGES.map(([id, label]) => (
            <button key={id} onClick={() => setRange(id)} aria-pressed={range === id}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${range === id ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">{error}</p>}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : report && (
        <div className="space-y-5">
          <section className="bg-white rounded-2xl border border-slate-100" aria-labelledby="no-results">
            <h2 id="no-results" className="px-5 pt-5 pb-1 font-heading font-bold text-slate-900 flex items-center gap-2"><SearchX size={17} className="text-red-400" /> Found nothing</h2>
            <p className="px-5 pb-3 text-sm text-slate-500">Things people looked for that the store does not have, or names under different words.</p>
            <TermTable terms={report.noResults} empty="Every search in this period found at least one product." />
          </section>

          <section className="bg-white rounded-2xl border border-slate-100" aria-labelledby="top-searches">
            <h2 id="top-searches" className="px-5 pt-5 pb-1 font-heading font-bold text-slate-900">Most searched</h2>
            <p className="px-5 pb-3 text-sm text-slate-500">{report.total} search{report.total === 1 ? '' : 'es'} in this period.</p>
            <TermTable terms={report.top} empty="No searches recorded in this period yet." />
          </section>
        </div>
      )}
    </div>
  )
}
