'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import type { StorePopup as Popup } from '@/lib/site-settings-shared'

function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

export default function StorePopup({ popup }: { popup: Popup }) {
  // Starts closed → server and first client render both emit null (no hydration
  // flash). The effect decides whether to open after a short delay.
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const hasContent = !!(popup.title.trim() || popup.description.trim() || popup.image.trim())
  const key = `storePopup:${hash(popup.image + popup.title + popup.description + popup.buttonLabel + popup.buttonUrl)}`
  // Never interrupt the payment flow with a modal.
  const suppressed = pathname?.startsWith('/checkout') ?? false

  useEffect(() => {
    if (!popup.enabled || !hasContent || suppressed) return
    let seen = false
    try {
      if (popup.frequency === 'once')         seen = localStorage.getItem(key) === '1'
      else if (popup.frequency === 'session') seen = sessionStorage.getItem(key) === '1'
      // 'always' → show on every load
    } catch { /* private mode */ }
    if (seen) return
    const t = setTimeout(() => setOpen(true), 900)
    return () => clearTimeout(t)
  }, [popup.enabled, popup.frequency, hasContent, suppressed, key])

  function close() {
    setOpen(false)
    try {
      if (popup.frequency === 'once')         localStorage.setItem(key, '1')
      else if (popup.frequency === 'session') sessionStorage.setItem(key, '1')
    } catch { /* private mode */ }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      role="dialog" aria-modal="true" aria-label={popup.title || 'Announcement'} onClick={close}>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up"
        onClick={e => e.stopPropagation()}>
        <button onClick={close} aria-label="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/85 hover:bg-white flex items-center justify-center text-slate-600 shadow cursor-pointer">
          <X size={16} />
        </button>
        {popup.image.trim() && (
          // Plain <img>: admin-pasted URLs aren't whitelisted for next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={popup.image} alt={popup.title || 'Promotion'} className="w-full max-h-72 object-cover block" />
        )}
        <div className="p-6 text-center">
          {popup.title.trim() && (
            <h2 className="font-heading font-extrabold text-xl text-slate-900 mb-2">{popup.title}</h2>
          )}
          {popup.description.trim() && (
            <p className="text-sm text-slate-500 leading-relaxed mb-5 whitespace-pre-line">{popup.description}</p>
          )}
          {popup.buttonLabel.trim() && popup.buttonUrl.trim() && (
            <a href={popup.buttonUrl} onClick={close}
              className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-sm cursor-pointer transition-colors shadow-md shadow-primary/20">
              {popup.buttonLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
