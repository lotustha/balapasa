'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { useProductContext } from '@/context/ProductContext'

export default function WhatsAppButton() {
  const [phone, setPhone]     = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [hint, setHint]       = useState(false)
  const [isMd, setIsMd]       = useState(false)
  const pathname              = usePathname()
  const { items, subtotal }   = useCart()
  const { product, stickyBarVisible } = useProductContext()

  // Load WhatsApp number from store config
  useEffect(() => {
    fetch('/api/store-config').then(r => r.json()).then(d => {
      const raw = String(d.WHATSAPP_NUMBER ?? '').replace(/\D/g, '')
      if (raw.length >= 8) setPhone(raw)
    }).catch(() => {})
  }, [])

  // Subtle entrance — show 1.5s after load, briefly highlight on first hover
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(t)
  }, [])

  // Track md breakpoint so we can pick the right vertical offset
  // (mobile must clear the 64px BottomNav; desktop sits closer to the corner).
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsMd(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Resting offset: just above the bottom-right corner.
  //   mobile  → clear 64px BottomNav + small gap (safe-area aware)
  //   desktop → 1.5rem from the bottom edge (no BottomNav)
  // When the product-page sticky add-to-cart bar (~72px) is visible, lift the
  // button above it.
  const buttonBottom = isMd
    ? (stickyBarVisible ? '6rem' : '1.5rem')
    : `calc(env(safe-area-inset-bottom) + ${stickyBarVisible ? '9rem' : '4.5rem'})`

  // Don't render the button on admin routes or if number isn't configured
  if (!phone || pathname?.startsWith('/admin')) return null

  function buildMessage(): string {
    const url = typeof window !== 'undefined' ? window.location.href : ''

    if (product && pathname?.startsWith('/products/')) {
      return `Hi! I'm interested in *${product.name}* (NPR ${product.price.toLocaleString()}).\nLink: ${url}\n\nMy question: `
    }
    if (pathname === '/cart' && items.length > 0) {
      return `Hi! I'd like help with my cart — ${items.length} item${items.length > 1 ? 's' : ''}, NPR ${subtotal.toLocaleString()}.\n\nQuestion: `
    }
    if (pathname?.startsWith('/checkout')) {
      return `Hi! I have a question while checking out.\nPage: ${url}`
    }
    if (pathname?.startsWith('/track-order')) {
      return `Hi! I need help tracking my order.`
    }
    return `Hi! I have a question about your store.`
  }

  function openWhatsApp() {
    const text = encodeURIComponent(buildMessage())
    const url  = `https://wa.me/${phone}?text=${text}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      {/* Tooltip — vertically centered on the 56px button (28px / 1.75rem from button bottom) */}
      {hint && (
        <div
          className="fixed z-50 right-[88px] hidden sm:block animate-fade-in"
          style={{
            bottom: `calc(${buttonBottom} + 1.25rem)`,
          }}
        >
          <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg whitespace-nowrap">
            Chat with us on WhatsApp
            <span className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={openWhatsApp}
        onMouseEnter={() => setHint(true)}
        onMouseLeave={() => setHint(false)}
        onFocus={() => setHint(true)}
        onBlur={() => setHint(false)}
        aria-label="Chat with us on WhatsApp"
        className={`fixed right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 cursor-pointer group ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
        style={{
          background: '#25D366',
          bottom: buttonBottom,
          boxShadow: '0 10px 30px rgba(37,211,102,0.40)',
        }}
      >
        {/* WhatsApp glyph (inline SVG — no emoji) */}
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" aria-hidden="true">
          <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.01zm-7.01 15.24h-.01a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.39c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 5.83 2.41 8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.25-8.25 8.25zm4.52-6.16c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.04-.39-1.99-1.23-.74-.66-1.23-1.47-1.37-1.71-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42-.14 0-.31-.02-.48-.02-.16 0-.43.06-.66.31-.23.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.55.12.16 1.74 2.65 4.21 3.71.59.25 1.05.41 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.46-.6 1.66-1.17.21-.58.21-1.07.14-1.17-.06-.1-.23-.16-.48-.29z"/>
        </svg>

        {/* Soft pulse ring */}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full animate-pulse-glow opacity-60"
          style={{ boxShadow: '0 0 0 0 rgba(37,211,102,0.55)' }}
        />
      </button>
    </>
  )
}
