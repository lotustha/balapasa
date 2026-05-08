'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  MessageCircle, Search, Loader2, RefreshCw,
  ChevronRight, Phone,
} from 'lucide-react'

interface Conversation {
  id: string; platform: string; customerId: string
  customerName: string | null; customerPhone: string | null
  status: string; lastMessageAt: string | null
  messages: { content: string; direction: string; createdAt: string }[]
}

function PlatformBadge({ platform }: { platform: string }) {
  if (platform === 'WHATSAPP') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
      <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.374 0 0 5.373 0 12c0 2.117.554 4.147 1.602 5.927L0 24l6.273-1.641A11.947 11.947 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.003-1.366l-.356-.213-3.726.976.994-3.62-.232-.372A9.785 9.785 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
      WhatsApp
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
      <MessageCircle size={10} /> Messenger
    </span>
  )
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h`
  return `${Math.floor(m / 1440)}d`
}

export default function MessagingPage() {
  const [convs,    setConvs]    = useState<Conversation[]>([])
  const [loading,  setLoading]  = useState(true)
  const [platform, setPlatform] = useState('')
  const [status,   setStatus]   = useState('')
  const [search,   setSearch]   = useState('')

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (platform) params.set('platform', platform)
    if (status)   params.set('status', status)
    const res = await fetch(`/api/admin/messaging?${params}`)
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
      (c.customerPhone ?? '').includes(q) ||
      c.customerId.includes(q)
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 flex items-center gap-2">
            <MessageCircle size={20} className="text-primary" /> Messaging
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">WhatsApp + Messenger unified inbox</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-sm font-semibold text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filters */}
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${platform === v ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-800'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1">
          {[['', 'All'], ['OPEN', 'Open'], ['CLOSED', 'Closed']].map(([v, l]) => (
            <button key={v} onClick={() => setStatus(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${status === v ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-800'}`}>
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
          <div className="flex flex-col items-center justify-center py-16 text-slate-300">
            <MessageCircle size={36} className="mb-3" />
            <p className="text-sm font-medium text-slate-400">No conversations yet</p>
            <p className="text-xs text-slate-300 mt-1">Messages will appear here when customers contact you</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(c => {
              const lastMsg = c.messages[0]
              return (
                <Link key={c.id} href={`/admin/messaging/${c.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors cursor-pointer">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="text-sm font-extrabold text-primary">
                      {(c.customerName ?? c.customerId)[0]?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-slate-800 text-sm truncate">
                        {c.customerName ?? c.customerId}
                      </span>
                      <PlatformBadge platform={c.platform} />
                      {c.status === 'CLOSED' && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-full">Closed</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {c.customerPhone && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Phone size={9} /> {c.customerPhone}
                        </span>
                      )}
                      {lastMsg && (
                        <p className="text-xs text-slate-400 truncate">
                          {lastMsg.direction === 'OUT' ? '↗ ' : ''}{lastMsg.content}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Time + arrow */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-slate-400">
                      {c.lastMessageAt ? timeAgo(c.lastMessageAt) : '—'}
                    </span>
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
