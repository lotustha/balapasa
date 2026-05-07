'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface CartItem {
  id: string
  name: string
  price: number
  salePrice?: number | null
  image: string
  quantity: number
  slug: string
  codAvailable?: boolean
}

interface CartContextValue {
  // ── Regular cart ─────────────────────────────────────────────────────────────
  items: CartItem[]
  count: number
  subtotal: number
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number, opts?: { silent?: boolean }) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
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
  const [items,      setItems]      = useState<CartItem[]>([])
  const [isOpen,     setIsOpen]     = useState(false)
  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(null)

  // Persist regular cart to localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('balapasa_cart')
      if (stored) setItems(JSON.parse(stored))
    } catch {}
  }, [])
  useEffect(() => {
    localStorage.setItem('balapasa_cart', JSON.stringify(items))
  }, [items])

  // ── Regular cart actions ─────────────────────────────────────────────────────

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, qty = 1, opts?: { silent?: boolean }) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + qty } : i)
      return [...prev, { ...item, quantity: qty }]
    })
    if (!opts?.silent) setIsOpen(true)
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) { removeItem(id); return }
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i))
  }, [removeItem])

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
      addItem, removeItem, updateQty, clearCart,
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
