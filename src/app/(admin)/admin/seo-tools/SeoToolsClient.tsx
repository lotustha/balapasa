'use client'

import { useEffect, useState } from 'react'
import {
  Sparkles, FileText, HelpCircle, Tag, Loader2, CheckCircle2, AlertCircle, Play, RefreshCw,
} from 'lucide-react'

type JobType = 'product-description' | 'product-faq' | 'category-intro'

interface JobMeta {
  type:      JobType
  title:     string
  desc:      string
  icon:      typeof FileText
  accent:    string  // hex
}

const JOBS: JobMeta[] = [
  {
    type:   'product-description',
    title:  'Unique product descriptions',
    desc:   'Rewrites manufacturer copy to a unique, SEO-friendly paragraph. Replaces Product.description on save.',
    icon:   FileText,
    accent: '#16A34A',
  },
  {
    type:   'product-faq',
    title:  'Product FAQs (rich snippet eligible)',
    desc:   'Generates 4 Q&A pairs per product. Emitted as FAQPage JSON-LD on the detail page for Google rich results.',
    icon:   HelpCircle,
    accent: '#6366F1',
  },
  {
    type:   'category-intro',
    title:  'Category SEO intros',
    desc:   '60–110 word intro paragraph shown above the product grid when filtering by category.',
    icon:   Tag,
    accent: '#EC4899',
  },
]

interface BulkResult { id: string; name: string; ok: boolean; error?: string }

interface JobState {
  pending:  number
  total:    number
  done:     number
  results:  BulkResult[]
  running:  boolean
  error:    string | null
}

const EMPTY_STATE: JobState = { pending: 0, total: 0, done: 0, results: [], running: false, error: null }

export default function SeoToolsClient() {
  const [batchSize, setBatchSize] = useState(5)
  const [state, setState] = useState<Record<JobType, JobState>>({
    'product-description': EMPTY_STATE,
    'product-faq':         EMPTY_STATE,
    'category-intro':      EMPTY_STATE,
  })

  async function loadCounts(type: JobType) {
    try {
      const res  = await fetch(`/api/admin/ai/bulk?type=${type}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setState(prev => ({ ...prev, [type]: { ...prev[type], pending: data.pending, total: data.total, done: data.done } }))
    } catch (e) {
      setState(prev => ({ ...prev, [type]: { ...prev[type], error: e instanceof Error ? e.message : String(e) } }))
    }
  }

  useEffect(() => {
    JOBS.forEach(j => loadCounts(j.type))
  }, [])

  async function runBatch(type: JobType) {
    setState(prev => ({ ...prev, [type]: { ...prev[type], running: true, error: null } }))
    try {
      const res  = await fetch('/api/admin/ai/bulk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type, limit: batchSize }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setState(prev => ({
        ...prev,
        [type]: { ...prev[type], running: false, results: [...prev[type].results, ...(data.results ?? [])] },
      }))
      await loadCounts(type)
    } catch (e) {
      setState(prev => ({ ...prev, [type]: { ...prev[type], running: false, error: e instanceof Error ? e.message : String(e) } }))
    }
  }

  function clearResults(type: JobType) {
    setState(prev => ({ ...prev, [type]: { ...prev[type], results: [] } }))
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
      <header className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg,#16A34A,#0EA5E9)' }}>
          <Sparkles size={22} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-slate-900">SEO Content AI</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gemini rewrites manufacturer copy to unique content. Helps Google rank you without duplicate-content penalties.
          </p>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 flex-wrap">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Batch size</label>
        <input
          type="number" min={1} max={20}
          value={batchSize}
          onChange={e => setBatchSize(Math.min(20, Math.max(1, Number(e.target.value) || 5)))}
          className="w-20 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="text-xs text-slate-500">
          Each batch processes N items sequentially. Small batches avoid Gemini rate limits. 5 is a safe default.
        </p>
      </div>

      <div className="space-y-4">
        {JOBS.map(job => {
          const Icon = job.icon
          const s = state[job.type]
          const progress = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0
          return (
            <div key={job.type} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="h-1.5" style={{ background: job.accent }} />
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: job.accent + '15', color: job.accent }}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-slate-900 text-base">{job.title}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{job.desc}</p>
                  </div>
                  <button
                    onClick={() => loadCounts(job.type)}
                    aria-label="Refresh count"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                      <span>{s.done} of {s.total} done</span>
                      <span>{s.pending} pending</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%`, background: job.accent }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => runBatch(job.type)}
                    disabled={s.running || s.pending === 0}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
                  >
                    {s.running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    {s.running ? 'Running…' : `Run batch of ${Math.min(batchSize, s.pending)}`}
                  </button>
                </div>

                {s.error && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold p-3 ring-1 ring-rose-200">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    {s.error}
                  </div>
                )}

                {s.results.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recent runs</p>
                      <button
                        onClick={() => clearResults(job.type)}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto rounded-xl bg-slate-50 ring-1 ring-slate-200 divide-y divide-slate-200">
                      {[...s.results].reverse().map((r, idx) => (
                        <div key={idx} className="flex items-start gap-2 px-3 py-2 text-xs">
                          {r.ok
                            ? <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />
                            : <AlertCircle  size={14} className="text-rose-600  shrink-0 mt-0.5" />}
                          <span className="flex-1 min-w-0 truncate font-semibold text-slate-700">{r.name}</span>
                          {!r.ok && r.error && <span className="text-rose-600 text-[11px]">{r.error.slice(0, 60)}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
