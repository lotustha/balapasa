'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Send, Loader2, CheckCircle2, XCircle,
  ArchiveX, ArchiveRestore,
} from 'lucide-react'

interface Message {
  id: string; direction: string; content: string; status: string; createdAt: string
}
interface Conversation {
  id: string; platform: string; customerId: string
  customerName: string | null; customerPhone: string | null; status: string
  messages: Message[]
}

function Bubble({ msg }: { msg: Message }) {
  const isOut = msg.direction === 'OUT'
  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
        isOut ? 'bg-primary text-white rounded-br-sm' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm'
      }`}>
        <p>{msg.content}</p>
        <div className={`flex items-center gap-1 mt-1 text-[10px] ${isOut ? 'text-white/60 justify-end' : 'text-slate-400'}`}>
          {new Date(msg.createdAt).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit' })}
          {isOut && (
            msg.status === 'SENT' ? <CheckCircle2 size={10} /> : <XCircle size={10} className="text-red-300" />
          )}
        </div>
      </div>
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

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/messaging/${id}`)
    if (res.ok) {
      const data = await res.json()
      setConv(data.conversation)
    }
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const timer = setInterval(load, 4000)
    return () => clearInterval(timer)
  }, [load])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv?.messages.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    await fetch(`/api/admin/messaging/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: reply }),
    })
    setReply('')
    await load()
    setSending(false)
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
    <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-primary" /></div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-all">
            <ArrowLeft size={16} />
          </button>
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
            <span className="text-sm font-extrabold text-primary">
              {(conv.customerName ?? conv.customerId)[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{conv.customerName ?? conv.customerId}</p>
            <p className="text-[10px] text-slate-400">
              {conv.platform === 'WHATSAPP' ? 'WhatsApp' : 'Messenger'}
              {conv.customerPhone ? ` · ${conv.customerPhone}` : ''}
            </p>
          </div>
        </div>
        <button onClick={toggleStatus}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
            conv.status === 'OPEN' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-green-50 text-green-600 hover:bg-green-100'
          }`}>
          {conv.status === 'OPEN'
            ? <><ArchiveX size={12} /> Close</>
            : <><ArchiveRestore size={12} /> Reopen</>}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-1"
        style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #EFF6FF 100%)' }}>
        {conv.messages.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-12">No messages yet</p>
        ) : (
          conv.messages.map(m => <Bubble key={m.id} msg={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar */}
      {conv.status === 'OPEN' ? (
        <form onSubmit={send}
          className="flex items-center gap-3 px-5 py-4 border-t border-slate-100 bg-white shrink-0">
          <input value={reply} onChange={e => setReply(e.target.value)}
            placeholder={conv.platform === 'WHATSAPP' ? 'Reply via WhatsApp…' : 'Reply via Messenger…'}
            className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
          <button type="submit" disabled={sending || !reply.trim()}
            className="w-10 h-10 rounded-2xl bg-primary hover:bg-primary-dark disabled:opacity-50 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      ) : (
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 text-center text-sm text-slate-400 shrink-0">
          Conversation closed · <button onClick={toggleStatus} className="text-primary font-semibold cursor-pointer hover:underline">Reopen to reply</button>
        </div>
      )}
    </div>
  )
}
