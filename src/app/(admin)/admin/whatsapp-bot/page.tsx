'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Bot, CheckCircle2, Loader2, Plus, Send, Smartphone, Trash2, Unplug, AlertTriangle, Terminal,
} from 'lucide-react'

interface Status {
  connected: boolean
  me: string | null
  pairing: { number: string; code: string; requestedAt: string } | null
  commanders: string[]
}

const COMMANDS: [string, string][] = [
  ['status', 'Is the site up, and what the last syncs did'],
  ['sync', 'Run the website and Daraz shop sync now'],
  ['held', 'Price changes waiting for approval'],
  ['approve', 'Apply the held price changes'],
  ['help', 'List the commands'],
]

const POLL_MS = 3000

function prettyNumber(n: string) {
  return n.startsWith('977') && n.length === 13 ? `+977 ${n.slice(3)}` : `+${n}`
}

function prettyCode(code: string) {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code
}

async function call<T>(path: string, init?: RequestInit): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(`/api/admin/whatsapp-bot${path}`, { ...init, headers: { 'Content-Type': 'application/json' } })
    const body = await res.json().catch(() => ({}))
    return res.ok ? { data: body as T } : { error: body.error ?? `Request failed (${res.status})` }
  } catch {
    return { error: 'Could not reach the server.' }
  }
}

const card = 'bg-white rounded-2xl border border-slate-100 p-5 sm:p-6'
const input = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all'
const primaryBtn = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

export default function WhatsAppBotPage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [number, setNumber] = useState('')
  const [newCommander, setNewCommander] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const apply = useCallback((result: { data?: Status; error?: string }) => {
    if (result.data) { setStatus(result.data); setLoadError(null) } else setLoadError(result.error ?? 'Unknown error')
  }, [])

  const refresh = useCallback(async () => apply(await call<Status>('')), [apply])

  // Poll so the page notices on its own when the phone finishes linking.
  useEffect(() => {
    let alive = true
    const tick = () => { call<Status>('').then(result => { if (alive) apply(result) }) }
    tick()
    const id = setInterval(tick, POLL_MS)
    return () => { alive = false; clearInterval(id) }
  }, [apply])

  async function act<T>(name: string, path: string, init: RequestInit, onOk: (data: T) => void) {
    setBusy(name); setNotice(null)
    const { data, error } = await call<T>(path, init)
    setBusy(null)
    if (error) setNotice({ kind: 'error', text: error })
    else if (data) onOk(data)
  }

  const pair = () => act<{ code: string; number: string }>('pair', '/pair', { method: 'POST', body: JSON.stringify({ number }) }, () => refresh())
  const logout = () => {
    if (!confirm('Disconnect this WhatsApp account? Alerts and commands stop until an account is connected again.')) return
    act<Status>('logout', '/logout', { method: 'POST' }, data => { setStatus(data); setNotice({ kind: 'ok', text: 'Account disconnected.' }) })
  }
  const saveCommanders = (numbers: string[], done: string) =>
    act<Status>('commanders', '/commanders', { method: 'PUT', body: JSON.stringify({ numbers }) }, data => { setStatus(data); setNewCommander(''); setNotice({ kind: 'ok', text: done }) })
  const sendTest = () => act<{ sent: number }>('test', '/test', { method: 'POST' }, data => setNotice({ kind: 'ok', text: `Test message sent to ${data.sent} number${data.sent === 1 ? '' : 's'}.` }))

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="font-heading font-extrabold text-2xl text-slate-900 flex items-center gap-2"><Bot size={24} className="text-primary" /> WhatsApp Bot</h1>
        <p className="text-slate-500 text-sm mt-0.5">Sends sync alerts over WhatsApp and answers commands from the numbers you trust.</p>
      </div>

      {notice && (
        <div role="status" className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${notice.kind === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {notice.text}
        </div>
      )}

      {!status && !loadError && (
        <div className={`${card} flex items-center justify-center py-16`}><Loader2 size={24} className="animate-spin text-primary" /></div>
      )}

      {!status && loadError && (
        <div className={`${card} flex items-start gap-3`}>
          <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-800 text-sm">The bot is not available</p>
            <p className="text-slate-500 text-sm mt-0.5">{loadError}</p>
          </div>
        </div>
      )}

      {status && (
        <div className="space-y-5">
          {/* Account */}
          <section className={card} aria-labelledby="wa-account">
            <h2 id="wa-account" className="font-heading font-bold text-slate-900 mb-4 flex items-center gap-2"><Smartphone size={17} className="text-slate-400" /> WhatsApp account</h2>

            {status.connected ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={22} className="text-green-500 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Connected</p>
                    <p className="text-slate-500 text-sm">{status.me ? prettyNumber(status.me) : 'Linked device'}</p>
                  </div>
                </div>
                <button onClick={logout} disabled={busy !== null}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-red-500 border border-red-100 rounded-xl hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 self-start">
                  {busy === 'logout' ? <Loader2 size={15} className="animate-spin" /> : <Unplug size={15} />} Disconnect
                </button>
              </div>
            ) : status.pairing ? (
              <div>
                <p className="text-sm text-slate-600">Enter this code on the phone that has <span className="font-bold">{prettyNumber(status.pairing.number)}</span>:</p>
                <p className="my-4 text-center font-mono font-extrabold text-3xl sm:text-4xl tracking-[0.2em] text-slate-900 bg-slate-50 rounded-2xl py-5 select-all">{prettyCode(status.pairing.code)}</p>
                <ol className="text-sm text-slate-600 space-y-1.5 list-decimal pl-5">
                  <li>Open WhatsApp on that phone.</li>
                  <li>Go to <span className="font-semibold">Settings → Linked devices → Link a device</span>.</li>
                  <li>Tap <span className="font-semibold">Link with phone number instead</span> and type the code.</li>
                </ol>
                <p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><Loader2 size={13} className="animate-spin" /> Waiting for the phone. The code works for about 2 minutes; this page updates on its own.</p>
                <button onClick={pair} disabled={busy !== null} className="mt-3 text-xs font-bold text-primary hover:underline cursor-pointer disabled:opacity-50">
                  Code expired? Get a new one
                </button>
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); pair() }}>
                <label htmlFor="wa-number" className="block text-sm font-semibold text-slate-700 mb-1.5">Number the bot will send from</label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input id="wa-number" inputMode="tel" autoComplete="off" value={number} onChange={e => setNumber(e.target.value)}
                    placeholder="98XXXXXXXX" className={input} />
                  <button type="submit" disabled={busy !== null || number.replace(/\D/g, '').length < 8} className={`${primaryBtn} shrink-0`}>
                    {busy === 'pair' ? <Loader2 size={15} className="animate-spin" /> : <Smartphone size={15} />} Get pairing code
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">A Nepali number can be typed without the country code. Use a spare number: automated accounts can be banned by WhatsApp.</p>
              </form>
            )}
          </section>

          {/* Commanding numbers */}
          <section className={card} aria-labelledby="wa-commanders">
            <h2 id="wa-commanders" className="font-heading font-bold text-slate-900 flex items-center gap-2"><Send size={16} className="text-slate-400" /> Commanding numbers</h2>
            <p className="text-slate-500 text-sm mt-1 mb-4">These numbers receive every alert and are the only ones the bot takes commands from.</p>

            {status.commanders.length === 0 ? (
              <p className="text-sm text-slate-400 bg-slate-50 rounded-xl px-4 py-3 mb-4">No numbers yet. Alerts have nowhere to go until you add one.</p>
            ) : (
              <ul className="divide-y divide-slate-50 mb-4">
                {status.commanders.map(n => (
                  <li key={n} className="flex items-center justify-between py-2.5">
                    <span className="font-semibold text-slate-800 text-sm">{prettyNumber(n)}</span>
                    <button onClick={() => saveCommanders(status.commanders.filter(c => c !== n), 'Number removed.')} disabled={busy !== null}
                      aria-label={`Remove ${prettyNumber(n)}`}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50">
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={e => { e.preventDefault(); saveCommanders([...status.commanders, newCommander], 'Number added.') }} className="flex flex-col sm:flex-row gap-2.5">
              <label htmlFor="wa-commander" className="sr-only">Number to add</label>
              <input id="wa-commander" inputMode="tel" autoComplete="off" value={newCommander} onChange={e => setNewCommander(e.target.value)}
                placeholder="98XXXXXXXX" className={input} />
              <button type="submit" disabled={busy !== null || newCommander.replace(/\D/g, '').length < 8} className={`${primaryBtn} shrink-0`}>
                {busy === 'commanders' ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add number
              </button>
            </form>

            <button onClick={sendTest} disabled={busy !== null || !status.connected || status.commanders.length === 0}
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline cursor-pointer disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed">
              {busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send a test message
            </button>
          </section>

          {/* Commands */}
          <section className={card} aria-labelledby="wa-commands">
            <h2 id="wa-commands" className="font-heading font-bold text-slate-900 flex items-center gap-2 mb-1"><Terminal size={16} className="text-slate-400" /> Commands</h2>
            <p className="text-slate-500 text-sm mb-3">A commanding number sends one of these words to the bot&apos;s WhatsApp number.</p>
            <dl className="divide-y divide-slate-50">
              {COMMANDS.map(([name, what]) => (
                <div key={name} className="flex gap-4 py-2.5">
                  <dt className="w-20 shrink-0 font-mono font-bold text-sm text-slate-800">{name}</dt>
                  <dd className="text-sm text-slate-600">{what}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      )}
    </div>
  )
}
