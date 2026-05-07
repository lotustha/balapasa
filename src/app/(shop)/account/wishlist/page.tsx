'use client'

import Link from 'next/link'
import { ArrowLeft, Heart, ShoppingBag, ArrowRight } from 'lucide-react'

export default function WishlistPage() {
  return (
    <div
      className="min-h-screen pt-6 pb-16 relative"
      style={{ background: 'linear-gradient(135deg,#F8F7FF 0%,#FFF5FB 50%,#F0FDF4 100%)' }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-c absolute bottom-10 -left-20 w-[360px] h-[360px]"
          style={{ background: '#EC4899', opacity: 0.07, animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
          <Link href="/account"
            className="w-9 h-9 rounded-xl bg-white/80 border border-slate-200 flex items-center justify-center hover:bg-white transition-colors cursor-pointer shadow-sm">
            <ArrowLeft size={16} className="text-slate-600" />
          </Link>
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Account</p>
            <h1 className="font-heading font-extrabold text-2xl text-slate-900 leading-tight">Wishlist</h1>
          </div>
        </div>

        {/* Empty state */}
        <div className="glass-card p-14 text-center animate-fade-in-up">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="w-16 h-16 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center">
              <Heart size={30} className="text-pink-300" />
            </div>
          </div>
          <p className="font-bold text-slate-700">Your wishlist is empty</p>
          <p className="text-slate-400 text-xs mt-2 leading-relaxed max-w-xs mx-auto">
            Tap the heart icon on any product to save it here. You&apos;ll get notified when prices drop.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/15"
          >
            <ShoppingBag size={14} /> Discover Products <ArrowRight size={14} />
          </Link>
        </div>

        {/* How it works */}
        <div className="glass-card p-5 mt-4 animate-fade-in-up" style={{ animationDelay: '0.06s' }}>
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3">How it works</p>
          <div className="space-y-3">
            {[
              { n: '1', text: 'Browse products and tap ♥ to save' },
              { n: '2', text: 'All saved items appear here'        },
              { n: '3', text: 'Add to cart when you\'re ready'    },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary-bg flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-extrabold text-primary">{n}</span>
                </div>
                <p className="text-xs text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
