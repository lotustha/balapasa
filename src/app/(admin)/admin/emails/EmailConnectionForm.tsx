'use client'

import { useState } from 'react'
import { Key, Send, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'

interface InitialState {
  apiKeyConfigured: boolean
  apiKeyMasked:     string
  from:             string
  replyTo:          string
}

interface EventOption {
  id:    string
  label: string
}

export default function EmailConnectionForm({
  initial,
  events,
}: {
  initial: InitialState
  events:  EventOption[]
}) {
  // Empty string when nothing has been typed yet AND a key exists in DB; the
  // server-side POST filter rejects '••' values so leaving as-is preserves the
  // saved key. Typing replaces it.
  const [apiKey,  setApiKey]  = useState('')
  const [from,    setFrom]    = useState(initial.from)
  const [replyTo, setReplyTo] = useState(initial.replyTo)
  const [savingFlag, setSaving]  = useState(false)
  const [saveOk,  setSaveOk]  = useState<null | { ok: boolean; msg: string }>(null)

  const [testTo,    setTestTo]    = useState('')
  const [testEvent, setTestEvent] = useState('')
  const [testing,   setTesting]   = useState(false)
  const [testRes,   setTestRes]   = useState<null | { ok: boolean; msg: string }>(null)

  async function save() {
    setSaving(true)
    setSaveOk(null)
    try {
      const payload: Record<string, string> = {
        RESEND_FROM:     from,
        RESEND_REPLY_TO: replyTo,
      }
      if (apiKey.trim()) payload.RESEND_API_KEY = apiKey.trim()

      const res  = await fetch('/api/admin/settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSaveOk({ ok: true, msg: 'Saved. New emails will use these settings.' })
      setApiKey('')
    } catch (e) {
      setSaveOk({ ok: false, msg: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }

  async function sendTest() {
    setTesting(true)
    setTestRes(null)
    try {
      const body: Record<string, string> = { to: testTo }
      if (testEvent) body.event = testEvent

      const res  = await fetch('/api/admin/emails/test', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Test send failed')
      setTestRes({ ok: true, msg: `Sent. Resend id: ${data.id ?? '(none)'}.` })
    } catch (e) {
      setTestRes({ ok: false, msg: e instanceof Error ? e.message : String(e) })
    } finally {
      setTesting(false)
    }
  }

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Connection (2/3 width) */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Key size={16} className="text-slate-700" />
          <h2 className="font-heading font-bold text-slate-900">Connection</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Resend API key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={initial.apiKeyConfigured ? initial.apiKeyMasked + ' (leave blank to keep)' : 're_xxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <p className="mt-1.5 text-[11px] text-slate-500">
              Get one at{' '}
              <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">
                resend.com/api-keys <ExternalLink size={10} />
              </a>
              {initial.apiKeyConfigured && (
                <span className="ml-2 inline-flex items-center gap-1 text-green-700 font-semibold">
                  <CheckCircle2 size={12} /> A key is currently saved
                </span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                From address
              </label>
              <input
                type="text"
                value={from}
                onChange={e => setFrom(e.target.value)}
                placeholder="Balapasa <noreply@balapasa.com>"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                The domain must be verified in Resend.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Reply-to (optional)
              </label>
              <input
                type="email"
                value={replyTo}
                onChange={e => setReplyTo(e.target.value)}
                placeholder="support@balapasa.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                Customer replies go here instead of the From address.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <p className={`text-xs font-semibold min-h-[16px] ${saveOk ? (saveOk.ok ? 'text-green-700' : 'text-rose-700') : 'text-slate-400'}`}>
              {saveOk?.msg ?? ''}
            </p>
            <button
              onClick={save}
              disabled={savingFlag}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition cursor-pointer"
            >
              {savingFlag ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {savingFlag ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Test send (1/3 width) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Send size={16} className="text-slate-700" />
          <h2 className="font-heading font-bold text-slate-900">Send test</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Send to
            </label>
            <input
              type="email"
              value={testTo}
              onChange={e => setTestTo(e.target.value)}
              placeholder="you@balapasa.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Template (optional)
            </label>
            <select
              value={testEvent}
              onChange={e => setTestEvent(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
            >
              <option value="">Generic test</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={sendTest}
            disabled={testing || !testTo}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition cursor-pointer"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {testing ? 'Sending…' : 'Send test'}
          </button>

          {testRes && (
            <div className={`text-xs font-semibold rounded-lg p-2.5 flex items-start gap-2 ${
              testRes.ok ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {testRes.ok ? <CheckCircle2 size={14} className="shrink-0 mt-px" /> : <AlertCircle size={14} className="shrink-0 mt-px" />}
              <span className="leading-snug">{testRes.msg}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
