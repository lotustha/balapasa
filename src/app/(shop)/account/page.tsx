'use client'

import Link from 'next/link'
import {
  User, ShoppingBag, MapPin, Heart, LogOut,
  ChevronRight, Package, Star, Settings,
  ArrowRight, Shield, Bell, Clock,
} from 'lucide-react'

const NAV = [
  { href: '/account/orders',    icon: ShoppingBag, label: 'My Orders',        desc: 'Track & manage orders'       },
  { href: '/account/addresses', icon: MapPin,       label: 'Saved Addresses',  desc: 'Manage delivery locations'   },
  { href: '/account/wishlist',  icon: Heart,        label: 'Wishlist',          desc: 'Products you saved'          },
  { href: '/account/profile',   icon: Settings,     label: 'Profile & Security', desc: 'Edit your info & password' },
]

const STATS = [
  { label: 'Total Orders',  value: '0',  icon: Package, color: '#6366F1' },
  { label: 'Wishlist Items', value: '0', icon: Heart,   color: '#EC4899' },
  { label: 'Reviews Left',  value: '0',  icon: Star,    color: '#F59E0B' },
]

export default function AccountPage() {
  return (
    <div
      className="min-h-screen py-8 relative"
      style={{ background: 'linear-gradient(135deg,#F8F7FF 0%,#F4F6FF 40%,#FFF5FB 70%,#F0FDF4 100%)' }}
    >
      {/* Subtle fixed blobs */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-a absolute -top-32 -left-32 w-[500px] h-[500px]"
          style={{ background: '#8B5CF6', opacity: 0.08 }} />
        <div className="blob animate-blob-morph animate-blob-float-b absolute -bottom-20 -right-20 w-[400px] h-[400px]"
          style={{ background: '#06B6D4', opacity: 0.07, animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">

        {/* Page title */}
        <div className="mb-7 animate-fade-in-up">
          <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-1">Dashboard</p>
          <h1 className="font-heading font-extrabold text-3xl text-slate-900">My Account</h1>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">

          {/* ── LEFT SIDEBAR ─────────────────────────────────── */}
          <div className="space-y-4">

            {/* Profile card */}
            <div className="glass-card p-6 animate-fade-in-up">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                  style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
                >
                  <User size={34} className="text-white" />
                </div>
                <h2 className="font-heading font-bold text-slate-900 text-lg leading-tight">Guest User</h2>
                <p className="text-slate-400 text-sm mt-0.5">Not signed in</p>
                <div className="flex gap-2 mt-4 w-full">
                  <Link href="/login"
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl text-center transition-colors cursor-pointer">
                    Sign In
                  </Link>
                  <Link href="/register"
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl text-center transition-colors cursor-pointer">
                    Register
                  </Link>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-5">
                {STATS.map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="text-center">
                    <Icon size={15} className="mx-auto mb-1" style={{ color }} />
                    <p className="font-extrabold text-lg text-slate-900 leading-none">{value}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5 leading-tight">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="glass-card overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
              {NAV.map(({ href, icon: Icon, label, desc }, i) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3.5 px-5 py-4 hover:bg-slate-50/80 transition-colors group cursor-pointer ${i < NAV.length - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-primary-bg flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all duration-200">
                    <Icon size={16} className="text-primary group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm leading-tight">{label}</p>
                    <p className="text-slate-400 text-xs mt-0.5 truncate">{desc}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              ))}
            </div>

            {/* Sign out */}
            <button
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-100 bg-white/60 text-red-500 hover:bg-red-50 font-semibold text-sm transition-colors cursor-pointer animate-fade-in-up"
              style={{ animationDelay: '0.10s' }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>

          {/* ── RIGHT CONTENT ─────────────────────────────────── */}
          <div className="space-y-5">

            {/* Recent orders */}
            <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.08s' }}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <h3 className="font-heading font-bold text-slate-900 flex items-center gap-2">
                  <Package size={17} className="text-primary" /> Recent Orders
                </h3>
                <Link href="/account/orders"
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer">
                  View all <ChevronRight size={12} />
                </Link>
              </div>

              {/* Sign-in prompt / empty state */}
              <div className="px-6 py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <ShoppingBag size={26} className="text-slate-300" />
                </div>
                <p className="font-bold text-slate-600 text-sm">No orders yet</p>
                <p className="text-slate-400 text-xs mt-1.5 max-w-xs mx-auto">
                  Sign in to view your order history, track deliveries and request returns.
                </p>
                <Link
                  href="/products"
                  className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-2xl transition-colors cursor-pointer shadow-md shadow-primary/15"
                >
                  Browse Products <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Info cards row */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Order tracking */}
              <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: '0.12s' }}>
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <Clock size={18} className="text-indigo-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Real-time Tracking</p>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      Track your orders with live updates from Pathao and Pick &amp; Drop.
                    </p>
                    <Link href="/track-order"
                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer">
                      Track an order <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: '0.16s' }}>
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                    <Shield size={18} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Account Security</p>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      Your account and payment data are encrypted and protected.
                    </p>
                    <Link href="/account/profile"
                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer">
                      Manage security <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: '0.18s' }}>
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Bell size={18} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Notifications</p>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      Get SMS and email updates for every step of your order.
                    </p>
                  </div>
                </div>
              </div>

              {/* Wishlist */}
              <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: '0.20s' }}>
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center shrink-0">
                    <Heart size={18} className="text-pink-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Your Wishlist</p>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      Save products and get notified when prices drop.
                    </p>
                    <Link href="/account/wishlist"
                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer">
                      View wishlist <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
