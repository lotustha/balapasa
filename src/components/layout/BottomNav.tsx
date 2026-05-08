'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, ShoppingCart, Heart, User } from 'lucide-react'
import { useCart } from '@/context/CartContext'

export default function BottomNav() {
  const pathname = usePathname()
  const { count, openCart } = useCart()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    if (href === '/account') return pathname === '/account' || (pathname.startsWith('/account') && !pathname.startsWith('/account/wishlist'))
    return pathname.startsWith(href)
  }

  const linkCls = (href: string) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors active:scale-95 ${
      isActive(href) ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
    }`

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50"
      style={{
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center h-16 px-2">
        {/* Home */}
        <Link href="/" className={linkCls('/')}>
          <Home size={21} strokeWidth={isActive('/') ? 2.5 : 1.8} />
          <span className="text-[10px] font-semibold tracking-wide">Home</span>
        </Link>

        {/* Shop */}
        <Link href="/products" className={linkCls('/products')}>
          <LayoutGrid size={21} strokeWidth={isActive('/products') ? 2.5 : 1.8} />
          <span className="text-[10px] font-semibold tracking-wide">Shop</span>
        </Link>

        {/* Cart — raised center button */}
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={openCart}
            aria-label="Cart"
            className="relative w-14 h-14 -mt-7 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/35 transition-transform active:scale-90 cursor-pointer"
          >
            <ShoppingCart size={22} className="text-white" strokeWidth={2} />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center px-1 shadow">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        </div>

        {/* Wishlist */}
        <Link href="/account/wishlist" className={linkCls('/account/wishlist')}>
          <Heart size={21} strokeWidth={isActive('/account/wishlist') ? 2.5 : 1.8} className={isActive('/account/wishlist') ? 'fill-primary/20' : ''} />
          <span className="text-[10px] font-semibold tracking-wide">Wishlist</span>
        </Link>

        {/* Account */}
        <Link href="/account" className={linkCls('/account')}>
          <User size={21} strokeWidth={isActive('/account') ? 2.5 : 1.8} />
          <span className="text-[10px] font-semibold tracking-wide">Account</span>
        </Link>
      </div>
    </nav>
  )
}
