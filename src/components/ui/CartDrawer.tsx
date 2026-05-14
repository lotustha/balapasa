'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { formatPrice } from '@/lib/utils'
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react'

// Animation durations
const OPEN_MS  = 420   // spring slide-in
const CLOSE_MS = 320   // ease-in slide-out

export default function CartDrawer() {
  const { items, count, subtotal, isOpen, closeCart, removeItem, updateQty } = useCart()
  const pathname = usePathname()
  const unlockRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-close when route changes (e.g. user clicks wishlist in navbar while
  // cart is open). Without this the drawer overlays the new page until manual
  // dismiss. Skip the very first mount so we don't fight initial render.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    if (isOpen) closeCart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Body scroll lock — lock immediately on open, release after close animation
  useEffect(() => {
    if (unlockRef.current) clearTimeout(unlockRef.current)

    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      // Wait for close animation to finish before unlocking
      unlockRef.current = setTimeout(() => {
        document.body.style.overflow = ''
      }, CLOSE_MS + 20)
    }

    return () => {
      if (unlockRef.current) clearTimeout(unlockRef.current)
    }
  }, [isOpen])

  return (
    <>
      {/* ── Overlay ────────────────────────────────────────────────────
          Always in DOM; opacity + pointer-events driven by isOpen       */}
      <div
        onClick={closeCart}
        className="fixed inset-0 z-50"
        style={{
          background: 'rgba(0,0,0,0.20)',
          backdropFilter: isOpen ? 'blur(4px)' : 'blur(0px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: isOpen
            ? `opacity ${OPEN_MS}ms ease, backdrop-filter ${OPEN_MS}ms ease`
            : `opacity ${CLOSE_MS}ms ease, backdrop-filter ${CLOSE_MS}ms ease`,
        }}
      />

      {/* ── Drawer ─────────────────────────────────────────────────────
          Always in DOM; translateX drives the slide-in / slide-out      */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col will-change-transform"
        style={{
          background: 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          borderLeft: '1px solid rgba(255,255,255,0.9)',
          boxShadow: '-12px 0 48px rgba(0,0,0,0.12)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: isOpen
            ? `transform ${OPEN_MS}ms cubic-bezier(0.16, 1, 0.3, 1)` // spring in
            : `transform ${CLOSE_MS}ms cubic-bezier(0.4, 0, 1, 1)`,  // ease-in out
        }}
        // Prevent clicks inside the drawer from triggering the overlay
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-primary" />
            <h2 className="font-heading font-bold text-slate-900">
              Your Cart{' '}
              <span className="text-primary text-sm font-medium">({count})</span>
            </h2>
          </div>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <ShoppingBag size={48} className="text-slate-200 mb-4" />
              <p className="text-slate-500 font-semibold">Your cart is empty</p>
              <p className="text-slate-400 text-sm mt-1">Add some awesome products!</p>
              <button
                onClick={closeCart}
                className="mt-5 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                className="flex gap-3 p-3 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 transition-colors"
              >
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 line-clamp-1">{item.name}</p>
                  <p className="text-primary font-bold text-sm mt-0.5">
                    {formatPrice(item.salePrice ?? item.price)}
                    {item.salePrice && (
                      <span className="ml-1.5 text-slate-400 line-through text-xs font-normal">
                        {formatPrice(item.price)}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <Minus size={12} className="text-slate-600" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <Plus size={12} className="text-slate-600" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove item"
                  className="p-1.5 text-slate-300 hover:text-red-400 transition-colors self-start cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-4 space-y-3 shrink-0">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span className="font-bold text-slate-900">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-slate-400">Delivery calculated at checkout</p>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl transition-colors cursor-pointer shadow-lg shadow-primary/20"
            >
              Checkout <ArrowRight size={17} />
            </Link>
            <Link
              href="/cart"
              onClick={closeCart}
              className="flex items-center justify-center w-full py-3 glass hover:bg-white/80 text-slate-600 hover:text-slate-900 font-semibold rounded-2xl transition-colors text-sm cursor-pointer"
            >
              View Full Cart
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
