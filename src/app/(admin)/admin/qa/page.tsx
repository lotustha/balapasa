'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  MessageCircleQuestion, Loader2, Trash2, Eye, EyeOff, Send,
  CheckCircle2, ExternalLink, Search,
} from 'lucide-react'
import { useConfirm } from '@/components/ui/useConfirm'

interface Answer {
  id: string
  authorName: string
  body: string
  isOfficial: boolean
  createdAt: string
}
interface Question {
  id: string
  productId: string
  authorName: string
  body: string
  isApproved: boolean
  createdAt: string
  answers: Answer[]
  product: { id: string; name: string; slug: string; images: string[] } | null
}
type Filter = 'unanswered' | 'all' | 'hidden'
interface Counts { all: number; unanswered: number; hidden: number }

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'unanswered', label: 'Needs answer' },
  { key: 'all', label: 'All' },
  { key: 'hidden', label: 'Hidden' },
]

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function QaModerationPage() {
  const { confirm, dialog } = useConfirm()
  const [questions, setQuestions] = useState<Question[]>([])
  const [counts, setCounts]       = useState<Counts>({ all: 0, unanswered: 0, hidden: 0 })
  const [filter, setFilter]       = useState<Filter>('unanswered')
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [drafts, setDrafts]       = useState<Record<string, string>>({})
  const [busy, setBusy]           = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ filter })
    if (search.trim()) qs.set('search', search.trim())
    const res = await fetch(`/api/admin/questions?${qs}`, { cache: 'no-store' })
    if (res.ok) {
      const d = await res.json()
      setQuestions(d.questions ?? [])
      setCounts(d.counts ?? { all: 0, unanswered: 0, hidden: 0 })
    }
    setLoading(false)
  }, [filter, search])

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  async function postAnswer(q: Question) {
    const body = (drafts[q.id] ?? '').trim()
    if (body.length < 2) return
    setBusy(q.id)
    const res = await fetch(`/api/questions/${q.id}/answers`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    if (res.ok) {
      const { answer } = await res.json()
      setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, answers: [...x.answers, answer] } : x))
      setDrafts(d => ({ ...d, [q.id]: '' }))
      // An answered question leaves the "Needs answer" view.
      if (filter === 'unanswered') setQuestions(prev => prev.filter(x => x.id !== q.id))
      setCounts(c => ({ ...c, unanswered: Math.max(0, c.unanswered - (q.answers.length === 0 ? 1 : 0)) }))
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error ?? 'Failed to post answer')
    }
    setBusy(null)
  }

  async function toggleHide(q: Question) {
    setBusy(q.id)
    const res = await fetch(`/api/admin/questions/${q.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isApproved: !q.isApproved }),
    })
    if (res.ok) {
      setQuestions(prev =>
        filter !== 'all'
          ? prev.filter(x => x.id !== q.id)            // leaves current filtered view
          : prev.map(x => x.id === q.id ? { ...x, isApproved: !q.isApproved } : x))
      setCounts(c => ({ ...c, hidden: c.hidden + (q.isApproved ? 1 : -1) }))
    }
    setBusy(null)
  }

  async function deleteAnswer(q: Question, a: Answer) {
    const ok = await confirm({
      title: 'Delete answer?',
      message: 'This answer will be removed from the public Q&A. This can’t be undone.',
      confirmLabel: 'Delete answer',
      tone: 'danger',
    })
    if (!ok) return
    const res = await fetch(`/api/admin/answers/${a.id}`, { method: 'DELETE' })
    if (res.ok) setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, answers: x.answers.filter(y => y.id !== a.id) } : x))
  }

  async function deleteQuestion(q: Question) {
    const ok = await confirm({
      title: 'Delete question?',
      message: 'The question and all its answers will be permanently removed. This can’t be undone.',
      confirmLabel: 'Delete question',
      tone: 'danger',
    })
    if (!ok) return
    setBusy(q.id)
    const res = await fetch(`/api/admin/questions/${q.id}`, { method: 'DELETE' })
    if (res.ok) {
      setQuestions(prev => prev.filter(x => x.id !== q.id))
      setCounts(c => ({
        all: Math.max(0, c.all - 1),
        unanswered: Math.max(0, c.unanswered - (q.answers.length === 0 ? 1 : 0)),
        hidden: Math.max(0, c.hidden - (q.isApproved ? 0 : 1)),
      }))
    }
    setBusy(null)
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading font-extrabold text-2xl text-slate-900 flex items-center gap-2">
          <MessageCircleQuestion size={20} className="text-primary" /> Questions &amp; Answers
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Answer customer questions and moderate the public Q&amp;A.</p>
      </div>

      {/* Filter tabs + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1 w-fit">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${filter === f.key ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {f.label}
              <span className={`ml-1.5 ${filter === f.key ? 'text-primary/70' : 'text-slate-400'}`}>{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-300 bg-white rounded-2xl border border-slate-100">
          <MessageCircleQuestion size={36} className="mb-3" />
          <p className="text-sm font-medium text-slate-400">
            {filter === 'unanswered' ? 'No questions waiting for an answer. ' : filter === 'hidden' ? 'No hidden questions.' : 'No questions yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map(q => (
            <div key={q.id} className={`bg-white rounded-2xl border p-4 md:p-5 ${q.isApproved ? 'border-slate-100' : 'border-amber-200 bg-amber-50/40'}`}>
              {/* Product + actions row */}
              <div className="flex items-start gap-3">
                {q.product && (
                  <Link href={`/products/${q.product.slug}`} target="_blank"
                    className="shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative group">
                    <Image src={q.product.images?.[0] ?? '/placeholder.jpg'} alt={q.product.name} fill className="object-cover" sizes="48px" />
                  </Link>
                )}
                <div className="flex-1 min-w-0">
                  {q.product
                    ? <Link href={`/products/${q.product.slug}`} target="_blank" className="text-xs font-bold text-slate-500 hover:text-primary inline-flex items-center gap-1">
                        {q.product.name} <ExternalLink size={11} />
                      </Link>
                    : <span className="text-xs font-bold text-slate-400">Product removed</span>}
                  <p className="text-slate-800 font-semibold text-sm mt-1 break-words">{q.body}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {q.authorName} · {fmtDate(q.createdAt)}
                    {!q.isApproved && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">Hidden</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleHide(q)} disabled={busy === q.id} title={q.isApproved ? 'Hide from store' : 'Restore to store'}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50">
                    {q.isApproved ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button onClick={() => deleteQuestion(q)} disabled={busy === q.id} title="Delete question"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Answers */}
              {q.answers.length > 0 && (
                <div className="mt-3 ml-0 sm:ml-15 space-y-2 border-l-2 border-slate-100 pl-3">
                  {q.answers.map(a => (
                    <div key={a.id} className="flex items-start gap-2 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 break-words">{a.body}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          {a.authorName}
                          {a.isOfficial && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary-bg text-primary font-bold"><CheckCircle2 size={9} /> Official</span>}
                          · {fmtDate(a.createdAt)}
                        </p>
                      </div>
                      <button onClick={() => deleteAnswer(q, a)} title="Delete answer"
                        className="p-1 rounded text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Answer composer */}
              <div className="mt-3 flex items-end gap-2">
                <textarea
                  value={drafts[q.id] ?? ''}
                  onChange={e => setDrafts(d => ({ ...d, [q.id]: e.target.value }))}
                  placeholder="Write an official answer…"
                  rows={1}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-y min-h-[40px]"
                />
                <button onClick={() => postAnswer(q)} disabled={busy === q.id || (drafts[q.id] ?? '').trim().length < 2}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                  {busy === q.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Answer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {dialog}
    </div>
  )
}
