'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import {
  ShoppingCart, Search, Plus, Minus, Trash2, Receipt,
  Loader2, CheckCircle2, X, Printer, User,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface Product { id: string; name: string; price: number; salePrice: number | null; images: string[]; stock: number; sku: string | null; brand: string | null }
interface CartItem extends Product { quantity: number }

const PAYMENT_METHODS = [
  { value: 'CASH',   label: 'Cash' },
  { value: 'ESEWA',  label: 'eSewa' },
  { value: 'KHALTI', label: 'Khalti' },
]

function ReceiptModal({ orderId, items, total, payment, customer, onClose }: {
  orderId: string; items: CartItem[]; total: number; payment: string; customer: string; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-heading font-bold text-slate-900">Receipt</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"><X size={16} /></button>
        </div>
        <div id="pos-receipt" className="p-6 font-mono text-sm">
          <div className="text-center mb-4 border-b border-dashed border-slate-200 pb-4">
            <p className="font-bold text-lg">BALAPASA</p>
            <p className="text-slate-500 text-xs">POS Sale Receipt</p>
            <p className="text-slate-400 text-xs">{new Date().toLocaleString('en-NP')}</p>
            <p className="text-slate-400 text-[10px]">Order #{orderId.slice(-8).toUpperCase()}</p>
          </div>
          {customer && <p className="text-xs text-slate-500 mb-3">Customer: {customer}</p>}
          <div className="space-y-1.5 mb-4">
            {items.map(i => (
              <div key={i.id} className="flex justify-between text-xs">
                <span className="flex-1 truncate">{i.name} × {i.quantity}</span>
                <span className="font-bold ml-2">{formatPrice((i.salePrice ?? i.price) * i.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-slate-200 pt-3 space-y-1">
            <div className="flex justify-between font-extrabold">
              <span>TOTAL</span><span>{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Payment</span><span>{payment}</span>
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-4">Thank you for shopping!</p>
        </div>
        <div className="px-6 pb-6">
          <button onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-bold rounded-xl cursor-pointer hover:bg-primary-dark transition-colors">
            <Printer size={16} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  )
}

export default function POSPage() {
  const [products,  setProducts]  = useState<Product[]>([])
  const [search,    setSearch]    = useState('')
  const [cart,      setCart]      = useState<CartItem[]>([])
  const [payment,   setPayment]   = useState('CASH')
  const [customer,  setCustomer]  = useState('')
  const [phone,     setPhone]     = useState('')
  const [discount,  setDiscount]  = useState('')
  const [placing,   setPlacing]   = useState(false)
  const [receipt,   setReceipt]   = useState<{ orderId: string } | null>(null)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchProducts = useCallback(async (q: string) => {
    const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=20&admin=true`)
    if (res.ok) setProducts((await res.json()).products ?? [])
  }, [])

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => fetchProducts(search), 250)
    return () => { if (searchRef.current) clearTimeout(searchRef.current) }
  }, [search, fetchProducts])

  useEffect(() => { fetchProducts('') }, [fetchProducts])

  function addToCart(p: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.id === p.id)
      if (existing) return prev.map(i => i.id === p.id ? { ...i, quantity: Math.min(i.quantity + 1, p.stock) } : i)
      return [...prev, { ...p, quantity: 1 }]
    })
  }

  function updateQty(id: string, delta: number) {
    setCart(prev => prev.map(i => i.id === id
      ? { ...i, quantity: Math.max(0, Math.min(i.quantity + delta, i.stock)) }
      : i).filter(i => i.quantity > 0))
  }

  function removeItem(id: string) { setCart(prev => prev.filter(i => i.id !== id)) }

  const subtotal      = cart.reduce((s, i) => s + (i.salePrice ?? i.price) * i.quantity, 0)
  const discountAmt   = discount ? Math.min(Number(discount), subtotal) : 0
  const total         = subtotal - discountAmt

  async function placeOrder() {
    if (!cart.length) return
    setPlacing(true)
    const res = await fetch('/api/admin/pos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.salePrice ?? i.price, quantity: i.quantity, image: i.images[0] })),
        subtotal, total, deliveryCharge: 0,
        paymentMethod: payment,
        customerName: customer || undefined,
        customerPhone: phone || undefined,
        discount: discountAmt || undefined,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setReceipt({ orderId: data.orderId })
    } else {
      alert(data.error ?? 'Order failed')
    }
    setPlacing(false)
  }

  function clearAll() {
    setCart([]); setReceipt(null); setCustomer(''); setPhone(''); setDiscount('')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ marginTop: '-64px', paddingTop: '64px' }}>
      {/* Left: Product search */}
      <div className="flex-1 flex flex-col border-r border-slate-100 bg-slate-50/50 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search product name, SKU, or brand…" autoFocus
              className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 rounded-2xl bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {products.map(p => {
              const ep = p.salePrice ?? p.price
              const inCart = cart.find(i => i.id === p.id)
              return (
                <button key={p.id} onClick={() => addToCart(p)} disabled={p.stock === 0}
                  className={`relative bg-white rounded-2xl border p-3 text-left cursor-pointer transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed group ${inCart ? 'border-primary/40 bg-primary-bg/30' : 'border-slate-200'}`}>
                  <div className="relative h-24 rounded-xl overflow-hidden bg-slate-100 mb-3">
                    {p.images[0]
                      ? <Image src={p.images[0]} alt={p.name} fill sizes="180px" className="object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-slate-300"><ShoppingCart size={24} /></div>}
                    {inCart && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-[10px] font-extrabold shadow">
                        {inCart.quantity}
                      </div>
                    )}
                    {p.stock === 0 && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Out of stock</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2 mb-1">{p.name}</p>
                  {p.brand && <p className="text-[10px] text-slate-400 mb-1">{p.brand}</p>}
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-primary text-sm">{formatPrice(ep)}</span>
                    {p.salePrice && <span className="text-[10px] text-slate-400 line-through">{formatPrice(p.price)}</span>}
                  </div>
                </button>
              )
            })}
          </div>
          {products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Search size={28} className="mb-2 text-slate-200" />
              <p className="text-sm">No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart + checkout */}
      <div className="w-96 flex flex-col bg-white">
        {/* Cart items */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-heading font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart size={16} className="text-primary" /> Cart
            {cart.length > 0 && <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">{cart.length}</span>}
          </h2>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-red-400 hover:text-red-600 cursor-pointer font-semibold">Clear</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 py-12">
              <ShoppingCart size={36} className="mb-3" />
              <p className="text-sm text-slate-400">Cart is empty</p>
              <p className="text-xs text-slate-300 mt-1">Click products to add</p>
            </div>
          ) : cart.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                {item.images[0] && <Image src={item.images[0]} alt={item.name} fill sizes="40px" className="object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                <p className="text-[10px] text-primary font-bold">{formatPrice(item.salePrice ?? item.price)}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
                  <Minus size={10} />
                </button>
                <span className="w-7 text-center text-sm font-bold text-slate-900">{item.quantity}</span>
                <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
                  <Plus size={10} />
                </button>
                <button onClick={() => removeItem(item.id)} className="w-6 h-6 rounded-lg text-slate-300 hover:text-red-500 flex items-center justify-center cursor-pointer transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout panel */}
        <div className="border-t border-slate-100 p-4 space-y-3">
          {/* Customer info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Customer name"
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white outline-none focus:border-primary transition-all" />
            </div>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone (optional)"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white outline-none focus:border-primary transition-all" />
          </div>

          {/* Discount */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 shrink-0">Discount (NPR)</label>
            <input type="number" min="0" max={subtotal} value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0"
              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white outline-none focus:border-primary transition-all" />
          </div>

          {/* Payment method */}
          <div className="flex gap-1.5">
            {PAYMENT_METHODS.map(m => (
              <button key={m.value} onClick={() => setPayment(m.value)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer border-2 transition-all ${payment === m.value ? 'border-primary bg-primary-bg text-primary' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Totals */}
          <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal</span><span className="font-semibold text-slate-800">{formatPrice(subtotal)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-xs text-green-600">
                <span>Discount</span><span className="font-semibold">− {formatPrice(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-slate-900 border-t border-slate-200 pt-1.5 mt-1.5">
              <span className="text-sm">Total</span>
              <span className="text-primary text-lg">{formatPrice(total)}</span>
            </div>
          </div>

          <button onClick={placeOrder} disabled={placing || !cart.length}
            className="w-full flex items-center justify-center gap-2 py-4 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white font-extrabold text-sm rounded-2xl cursor-pointer transition-colors shadow-lg shadow-primary/25 active:scale-[0.98]">
            {placing ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : <><Receipt size={16} /> Complete Sale · {formatPrice(total)}</>}
          </button>
        </div>
      </div>

      {/* Receipt modal */}
      {receipt && (
        <ReceiptModal
          orderId={receipt.orderId} items={cart} total={total}
          payment={payment} customer={customer}
          onClose={clearAll}
        />
      )}
    </div>
  )
}
