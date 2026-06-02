'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Fires a lightweight, non-blocking beacon to /api/track on every storefront
// route change. Mounted only in the (shop) layout, so /admin is never logged.
export default function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    const body = JSON.stringify({ path: pathname, referrer: document.referrer || '' })
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/pageview', new Blob([body], { type: 'application/json' }))
      } else {
        fetch('/api/pageview', {
          method: 'POST', body, keepalive: true,
          headers: { 'Content-Type': 'application/json' },
        }).catch(() => {})
      }
    } catch { /* tracking must never break navigation */ }
  }, [pathname])

  return null
}
