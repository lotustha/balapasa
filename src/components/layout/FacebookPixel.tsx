'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

declare global {
  interface Window {
    fbq: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string }
    _fbq?: Window['fbq']
  }
}

let pixelId = ''

function initPixel(id: string) {
  if (typeof window === 'undefined') return
  if (window.fbq?.loaded) { pixelId = id; return }
  pixelId = id

  const f = window.fbq = ((...args: unknown[]) => {
    if (f.callMethod) f.callMethod(...args)
    else (f.queue ??= []).push(args)
  }) as Window['fbq']
  if (!window._fbq) window._fbq = f
  f.loaded = true
  f.version = '2.0'
  f.queue = []

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)

  window.fbq('init', id)
  window.fbq('track', 'PageView')
}

export function trackViewContent(productId: string, productName: string, price: number) {
  window.fbq?.('track', 'ViewContent', {
    content_ids: [productId], content_name: productName,
    content_type: 'product', value: price, currency: 'NPR',
  })
}
export function trackAddToCart(productId: string, price: number) {
  window.fbq?.('track', 'AddToCart', { content_ids: [productId], value: price, currency: 'NPR' })
}
export function trackPurchase(orderId: string, total: number) {
  window.fbq?.('track', 'Purchase', { value: total, currency: 'NPR', order_id: orderId })
}
export function trackInitiateCheckout(total: number) {
  window.fbq?.('track', 'InitiateCheckout', { value: total, currency: 'NPR' })
}

export default function FacebookPixel() {
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/store-config').then(r => r.json()).then(d => {
      if (d.FACEBOOK_PIXEL_ID) initPixel(d.FACEBOOK_PIXEL_ID)
    }).catch(() => {})
  }, [])

  // Track PageView on route changes
  useEffect(() => {
    if (pixelId) window.fbq?.('track', 'PageView')
  }, [pathname])

  return null
}
