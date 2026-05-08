'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Send, Loader2,
  ArchiveX, ArchiveRestore, Phone, CheckCheck, Check,
} from 'lucide-react'

interface Message {
  id: string; direction: string; content: string; status: string; createdAt: string
}
interface Conversation {
  id: string; platform: string; customerId: string
  customerName: string | null; customerPhone: string | null; status: string
  messages: Message[]
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit' })
}
function formatDay(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-NP', { weekday: 'long', day: 'numeric', month: 'short' })
}

function Bubble({ msg }: { msg: Message }) {
  const isOut = msg.direction === 'OUT'
  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
        isOut
          ? 'bg-primary text-white rounded-br-sm shadow-primary/20'
          : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm'
      }`}>
        <p>{msg.content}</p>
        <div className={`flex items-center gap-1 mt-1 ${isOut ? 'justify-end' : ''}`}>
          <span className={`text-[10px] ${isOut ? 'text-white/60' : 'text-slate-400'}`}>
            {formatTime(msg.createdAt)}
          </span>
          {isOut && (
            msg.status === 'SENT'
              ? <Check size={11} className="text-white/60" />
              : msg.status === 'DELIVERED' || msg.status === 'READ'
              ? <CheckCheck size={11} className={msg.status === 'READ' ? 'text-blue-200' : 'text-white/60'} />
              : <span className="text-[9px] text-red-300">Failed</span>
          )}
        </div>
      </div>
    </div>
  )
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-slate-200/60" />
      <span className="text-[10px] font-bold text-slate-400 px-3 py-1 bg-white rounded-full border border-slate-200/80">
        {date}
      </span>
      <div className="flex-1 h-px bg-slate-200/60" />
    </div>
  )
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [conv,    setConv]    = useState<Conversation | null>(null)
  const [reply,   setReply]   = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/messaging/${id}`)
    if (res.ok) setConv((await res.json()).conversation)
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [load])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv?.messages.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim() || sending) return
    setSending(true)
    await fetch(`/api/admin/messaging/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: reply }),
    })
    setReply('')
    await load()
    setSending(false)
    inputRef.current?.focus()
  }

  async function toggleStatus() {
    if (!conv) return
    const newStatus = conv.status === 'OPEN' ? 'CLOSED' : 'OPEN'
    await fetch(`/api/admin/messaging/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setConv(c => c ? { ...c, status: newStatus } : null)
  }

  if (!conv) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-primary" />
    </div>
  )

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = []
  for (const msg of conv.messages) {
    const day = formatDay(msg.createdAt)
    const last = grouped[grouped.length - 1]
    if (last?.date === day) last.messages.push(msg)
    else grouped.push({ date: day, messages: [msg] })
  }

  const isWA = conv.platform === 'WHATSAPP'

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-all">
            <ArrowLeft size={16} />
          </button>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <span className="text-sm font-extrabold text-primary">
                {(conv.customerName ?? conv.customerId)[0]?.toUpperCase()}
              </span>
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${isWA ? 'bg-green-500' : 'bg-blue-500'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-800 text-sm">{conv.customerName ?? conv.customerId}</p>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${isWA ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {isWA ? 'WhatsApp' : 'Messenger'}
              </span>
            </div>
            {conv.customerPhone && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <Phone size={9} /> {conv.customerPhone}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${conv.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${conv.status === 'OPEN' ? 'bg-green-500' : 'bg-slate-400'}`} />
            {conv.status === 'OPEN' ? 'Open' : 'Closed'}
          </div>
          <button onClick={toggleStatus}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
            {conv.status === 'OPEN'
              ? <><ArchiveX size={13} /> Close</>
              : <><ArchiveRestore size={13} /> Reopen</>}
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-2"
        style={{ background: 'linear-gradient(160deg, #F0FDF4 0%, #EFF6FF 50%, #FAF5FF 100%)' }}>
        {conv.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-3 shadow-sm">
              <Send size={20} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold">No messages yet</p>
            <p className="text-xs mt-1">Start the conversation below</p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date}>
              <DateSeparator date={group.date} />
              <div className="space-y-2">
                {group.messages.map(m => <Bubble key={m.id} msg={m} />)}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply area */}
      {conv.status === 'OPEN' ? (
        <form onSubmit={send} className="px-5 py-4 border-t border-slate-100 bg-white shrink-0">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e as unknown as React.FormEvent) } }}
              placeholder={`Reply via ${isWA ? 'WhatsApp' : 'Messenger'}… (Enter to send, Shift+Enter for new line)`}
              rows={2}
              className="flex-1 px-4 py-3 text-sm border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none leading-relaxed"
            />
            <button type="submit" disabled={sending || !reply.trim()}
              className="w-11 h-11 rounded-2xl bg-primary hover:bg-primary-dark disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-md shadow-primary/20 active:scale-95">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 ml-1">
            {isWA ? 'WhatsApp allows replies within 24 hours of last customer message' : 'Messenger session active'}
          </p>
        </form>
      ) : (
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <p className="text-sm text-slate-400">Conversation is closed</p>
          <button onClick={toggleStatus}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-primary-dark transition-colors">
            <ArchiveRestore size={13} /> Reopen conversation
          </button>
        </div>
      )}
    </div>
  )
}
