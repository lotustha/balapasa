'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

export interface CartItem {
  id: string
  name: string
  price: number
  salePrice?: number | null
  image: string
  quantity: number
  slug: string
  codAvailable?: boolean
  // Set when the product has variants: two variants of one product are two cart lines.
  variantId?: string | null
  variantTitle?: string | null
}

// Identifies one cart line. Use this, not `id`, as the React key and when editing a line.
export const cartLineKey = (i: { id: string; variantId?: string | null }) => (i.variantId ? `${i.id}:${i.variantId}` : i.id)

interface CartContextValue {
  // ── Regular cart ─────────────────────────────────────────────────────────────
  items: CartItem[]
  count: number
  subtotal: number
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number, opts?: { silent?: boolean }) => void
  removeItem: (lineKey: string) => void
  updateQty: (lineKey: string, qty: number) => void
  // Applies prices the server says are current (after an order was refused for stale prices).
  syncPrices: (lines: { id: string; variantId?: string | null; price: number }[]) => void
  clearCart: () => void
  isOpen: boolean
  openCart: () => void
  closeCart: () => void

  // ── Buy Now session (isolated, never mixes with cart) ────────────────────────
  buyNowItem: CartItem | null
  setBuyNow: (item: Omit<CartItem, 'quantity'>, qty?: number) => void
  clearBuyNow: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Items start empty on both server and client to avoid SSR/CSR hydration
  // mismatch (server has no localStorage, so a lazy initializer would diverge).
  // We hydrate from localStorage in an effect once on mount. The lint rule
  // about setState-in-effect doesn't apply here — this is the canonical pattern
  // for SSR-safe persistent storage hydration.
  const [items,      setItems]      = useState<CartItem[]>([])
  const [isOpen,     setIsOpen]     = useState(false)
  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(null)
  const hydratedRef = useRef(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('balapasa_cart')
      if (stored) setItems(JSON.parse(stored))  // eslint-disable-line react-hooks/set-state-in-effect
    } catch {}
    hydratedRef.current = true
  }, [])
  useEffect(() => {
    if (!hydratedRef.current) return
    try { localStorage.setItem('balapasa_cart', JSON.stringify(items)) } catch {}
  }, [items])

  // ── Regular cart actions ─────────────────────────────────────────────────────

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, qty = 1, opts?: { silent?: boolean }) => {
    setItems(prev => {
      const key = cartLineKey(item)
      const existing = prev.find(i => cartLineKey(i) === key)
      // Keep the newest price: the line may have been added before a price change.
      if (existing) return prev.map(i => cartLineKey(i) === key ? { ...i, ...item, quantity: i.quantity + qty } : i)
      return [...prev, { ...item, quantity: qty }]
    })
    if (!opts?.silent) setIsOpen(true)
  }, [])

  const removeItem = useCallback((lineKey: string) => {
    // A bare product id (no variant part) removes every line of that product.
    setItems(prev => prev.filter(i => cartLineKey(i) !== lineKey && i.id !== lineKey))
  }, [])

  const updateQty = useCallback((lineKey: string, qty: number) => {
    if (qty <= 0) { removeItem(lineKey); return }
    setItems(prev => prev.map(i => cartLineKey(i) === lineKey ? { ...i, quantity: qty } : i))
  }, [removeItem])

  const syncPrices = useCallback((lines: { id: string; variantId?: string | null; price: number }[]) => {
    const current = new Map(lines.map(l => [cartLineKey(l), l]))
    const apply = (i: CartItem): CartItem => {
      // A line added before variants were tracked has no variantId; match it by product.
      const fresh = current.get(cartLineKey(i)) ?? lines.find(l => l.id === i.id)
      if (!fresh) return i
      return { ...i, variantId: i.variantId ?? fresh.variantId ?? null, price: Math.max(i.price, fresh.price), salePrice: fresh.price }
    }
    setItems(prev => prev.map(apply))
    setBuyNowItem(prev => (prev ? apply(prev) : prev))
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  // ── Buy Now actions ───────────────────────────────────────────────────────────

  const setBuyNow = useCallback((item: Omit<CartItem, 'quantity'>, qty = 1) => {
    setBuyNowItem({ ...item, quantity: qty })
  }, [])

  const clearBuyNow = useCallback(() => setBuyNowItem(null), [])

  const count    = items.reduce((s, i) => s + i.quantity, 0)
  const subtotal = items.reduce((s, i) => s + (i.salePrice ?? i.price) * i.quantity, 0)

  return (
    <CartContext.Provider value={{
      items, count, subtotal,
      addItem, removeItem, updateQty, syncPrices, clearCart,
      isOpen, openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false),
      buyNowItem, setBuyNow, clearBuyNow,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be inside CartProvider')
  return ctx
}
