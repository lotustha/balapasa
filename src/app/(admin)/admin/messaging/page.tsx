'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  MessageCircle, Search, Loader2, RefreshCw,
  ChevronRight, Phone, Users, CheckCircle2, AlertCircle, Zap,
} from 'lucide-react'

interface Conversation {
  id: string; platform: string; customerId: string
  customerName: string | null; customerPhone: string | null
  status: string; lastMessageAt: string | null
  messages: { content: string; direction: string; createdAt: string }[]
}

function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.374 0 0 5.373 0 12c0 2.117.554 4.147 1.602 5.927L0 24l6.273-1.641A11.947 11.947 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.003-1.366l-.356-.213-3.726.976.994-3.62-.232-.372A9.785 9.785 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
    </svg>
  )
}

function PlatformChip({ platform }: { platform: string }) {
  if (platform === 'WHATSAPP') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
      <WaIcon /> WA
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
      <MessageCircle size={9} /> MSG
    </span>
  )
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return new Date(iso).toLocaleDateString('en-NP', { day: 'numeric', month: 'short' })
}

export default function MessagingPage() {
  const [convs,    setConvs]    = useState<Conversation[]>([])
  const [loading,  setLoading]  = useState(true)
  const [platform, setPlatform] = useState('')
  const [status,   setStatus]   = useState('')
  const [search,   setSearch]   = useState('')

  const load = useCallback(async () => {
    const p = new URLSearchParams()
    if (platform) p.set('platform', platform)
    if (status)   p.set('status', status)
    const res = await fetch(`/api/admin/messaging?${p}`)
    if (res.ok) setConvs((await res.json()).conversations ?? [])
    setLoading(false)
  }, [platform, status])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [load])

  const filtered = convs.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (c.customerName ?? '').toLowerCase().includes(q) ||
      (c.customerPhone ?? '').includes(q) || c.customerId.includes(q)
  })

  const waCount  = convs.filter(c => c.platform === 'WHATSAPP').length
  const msgCount = convs.filter(c => c.platform === 'MESSENGER').length
  const openCount = convs.filter(c => c.status === 'OPEN').length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary-bg flex items-center justify-center">
              <MessageCircle size={18} className="text-primary" />
            </div>
            Messaging
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 ml-11">WhatsApp + Messenger unified inbox</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-sm font-semibold text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total conversations', value: convs.length, icon: Users, color: 'text-slate-600', bg: 'bg-slate-100' },
            { label: 'WhatsApp',  value: waCount,  icon: WaIcon,  color: 'text-green-600', bg: 'bg-green-100' },
            { label: 'Open',      value: openCount, icon: MessageCircle, color: 'text-primary', bg: 'bg-primary-bg' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <p className={`font-extrabold text-xl leading-none ${color}`}>{value}</p>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
        </div>
        <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1">
          {[['', 'All'], ['WHATSAPP', 'WhatsApp'], ['MESSENGER', 'Messenger']].map(([v, l]) => (
            <button key={v} onClick={() => setPlatform(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${platform === v ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1">
          {[['', 'All'], ['OPEN', 'Open'], ['CLOSED', 'Closed']].map(([v, l]) => (
            <button key={v} onClick={() => setStatus(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${status === v ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations list */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="px-8 py-10 max-w-xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <MessageCircle size={24} className="text-slate-300" />
              </div>
              <p className="font-bold text-slate-600 text-lg">No conversations yet</p>
              <p className="text-sm text-slate-400 mt-1">Complete the setup below to start receiving messages</p>
            </div>

            {/* Setup checklist */}
            <div className="space-y-3 mb-6">
              <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Webhook Setup Checklist</p>
              {[
                { step: '1', label: 'Save credentials in Settings → Messaging tab', detail: 'Phone Number ID, Access Token, Webhook Verify Token', done: false },
                { step: '2', label: 'Register your webhook URL with Meta', detail: window?.location?.origin ? `${window.location.origin}/api/webhooks/whatsapp` : 'https://yourdomain.com/api/webhooks/whatsapp', done: false },
                { step: '3', label: 'Set Verify Token in Meta dashboard', detail: 'Use the same token you saved in Settings → Messaging → Webhook Verify Token', done: false },
                { step: '4', label: 'Subscribe to "messages" webhook field', detail: 'In Meta App Dashboard → WhatsApp → Configuration → Webhooks', done: false },
              ].map(({ step, label, detail }) => (
                <div key={step} className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-primary-bg text-primary flex items-center justify-center text-[11px] font-extrabold shrink-0 mt-0.5">{step}</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono break-all">{detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Test button */}
            <div className="border-t border-slate-100 pt-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Test without webhook</p>
              <button onClick={async () => {
                await fetch('/api/admin/messaging/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform: 'WHATSAPP', phone: '+977 9800000000', name: 'Test Customer', text: 'Hello! Is this product available?' }) })
                load()
              }} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark cursor-pointer transition-colors shadow-md shadow-primary/15">
                <Zap size={14} /> Simulate incoming WhatsApp message
              </button>
              <p className="text-[11px] text-slate-400 mt-2">Creates a fake conversation so you can test the inbox UI before going live.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(c => {
              const lastMsg = c.messages[0]
              const initials = (c.customerName ?? c.customerId)[0]?.toUpperCase() ?? '?'
              const isOpen = c.status === 'OPEN'
              return (
                <Link key={c.id} href={`/admin/messaging/${c.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors cursor-pointer group">
                  {/* Avatar with platform dot */}
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <span className="text-sm font-extrabold text-primary">{initials}</span>
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${c.platform === 'WHATSAPP' ? 'bg-green-500' : 'bg-blue-500'}`}>
                      {c.platform === 'WHATSAPP'
                        ? <WaIcon />
                        : <MessageCircle size={8} className="text-white" />}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-slate-800 text-sm">{c.customerName ?? c.customerId}</span>
                      {!isOpen && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-full">Closed</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {c.customerPhone && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                          <Phone size={9} /> {c.customerPhone}
                        </span>
                      )}
                      {lastMsg && (
                        <p className="text-xs text-slate-400 truncate">
                          {lastMsg.direction === 'OUT' ? <span className="text-primary font-semibold">You: </span> : null}
                          {lastMsg.content}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[11px] text-slate-400">
                      {c.lastMessageAt ? timeAgo(c.lastMessageAt) : '—'}
                    </span>
                    <ChevronRight size={14} className="text-slate-200 group-hover:text-slate-400 transition-colors" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Live indicator */}
      <p className="text-center text-[11px] text-slate-300 mt-4 flex items-center justify-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Auto-refreshing every 5 seconds
      </p>
    </div>
  )
}
