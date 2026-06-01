'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { StoreBanner as Banner } from '@/lib/site-settings-shared'

// Small stable hash so the dismissal key changes when the admin edits the
// banner copy/link — editing it re-arms the notice for everyone.
function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

export default function StoreBanner({ banner }: { banner: Banner }) {
  // Start NOT dismissed so server + first client render match (no hydration
  // mismatch, no layout shift for non-dismissers); the effect hides it if this
  // visitor already closed this exact banner.
  const [dismissed, setDismissed] = useState(false)
  const key = `storeBanner:${hash(banner.message + banner.linkLabel + banner.linkUrl)}`

  useEffect(() => {
    if (!banner.dismissible) return
    try { if (localStorage.getItem(key) === '1') setDismissed(true) } catch { /* private mode */ }
  }, [key, banner.dismissible])

  if (!banner.enabled || !banner.message.trim() || dismissed) return null

  function close() {
    setDismissed(true)
    try { localStorage.setItem(key, '1') } catch { /* private mode */ }
  }

  return (
    <div className="relative w-full bg-gradient-to-r from-primary to-primary-dark text-white">
      <div className="max-w-7xl mx-auto px-10 py-2.5 flex items-center justify-center text-center">
        <p className="text-xs sm:text-sm font-semibold">
          {banner.message}
          {banner.linkUrl.trim() && banner.linkLabel.trim() && (
            <a href={banner.linkUrl} className="ml-2 underline underline-offset-2 font-bold hover:opacity-90">{banner.linkLabel} →</a>
          )}
        </p>
      </div>
      {banner.dismissible && (
        <button onClick={close} aria-label="Dismiss announcement"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/15 transition-colors cursor-pointer">
          <X size={15} />
        </button>
      )}
    </div>
  )
}
