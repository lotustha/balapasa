import Link from 'next/link'
import Image from 'next/image'
import {
  User, ShoppingBag, MapPin, Heart, ChevronRight, Package, Star,
  Settings, ArrowRight, Shield, Bell, Clock,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'
import SignOutButton from './SignOutButton'

const NAV = [
  { href: '/account/orders',    icon: ShoppingBag, label: 'My Orders',          desc: 'Track & manage orders'     },
  { href: '/account/addresses', icon: MapPin,      label: 'Saved Addresses',    desc: 'Manage delivery locations' },
  { href: '/account/wishlist',  icon: Heart,       label: 'Wishlist',           desc: 'Products you saved'        },
  { href: '/account/profile',   icon: Settings,    label: 'Profile & Security', desc: 'Edit your info & password' },
]

const STATUS_CLS: Record<string, string> = {
  PENDING:    'bg-yellow-100 text-yellow-700 border-yellow-200',
  CONFIRMED:  'bg-blue-100 text-blue-700 border-blue-200',
  PROCESSING: 'bg-purple-100 text-purple-700 border-purple-200',
  SHIPPED:    'bg-indigo-100 text-indigo-700 border-indigo-200',
  DELIVERED:  'bg-green-100 text-green-700 border-green-200',
  CANCELLED:  'bg-red-100 text-red-700 border-red-200',
}

function timeAgo(iso: Date) {
  const diff = Date.now() - iso.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return iso.toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initials(name: string | null | undefined, email: string) {
  const src = (name && name.trim()) || email
  const parts = src.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || src[0].toUpperCase()
}

export default async function AccountPage() {
  const auth = await getCurrentUser()

  // Load profile + counts + recent orders in parallel for signed-in users.
  const [profile, orderCount, wishlistCount, reviewCount, recentOrders] = auth
    ? await Promise.all([
        prisma.profile.findUnique({ where: { id: auth.sub } }).catch(() => null),
        prisma.order.count({ where: { userId: auth.sub } }).catch(() => 0),
        prisma.wishlistItem.count({ where: { userId: auth.sub } }).catch(() => 0),
        prisma.review.count({ where: { userId: auth.sub } }).catch(() => 0),
        prisma.order.findMany({
          where: { userId: auth.sub },
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: { items: { take: 4 } },
        }).catch(() => []),
      ])
    : [null, 0, 0, 0, []]

  const signedIn    = !!auth
  const displayName = profile?.name?.trim() || auth?.name || (auth?.email ? auth.email.split('@')[0] : 'Guest User')
  const displayMail = auth?.email ?? null

  const stats = [
    { label: 'Total Orders',   value: signedIn ? String(orderCount)    : '0', icon: Package, color: '#6366F1' },
    { label: 'Wishlist Items', value: signedIn ? String(wishlistCount) : '0', icon: Heart,   color: '#EC4899' },
    { label: 'Reviews Left',   value: signedIn ? String(reviewCount)   : '0', icon: Star,    color: '#F59E0B' },
  ]

  return (
    <div
      className="min-h-screen py-8 relative"
      style={{ background: 'linear-gradient(135deg,#F8F7FF 0%,#F4F6FF 40%,#FFF5FB 70%,#F0FDF4 100%)' }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-a absolute -top-32 -left-32 w-[500px] h-[500px]"
          style={{ background: '#8B5CF6', opacity: 0.08 }} />
        <div className="blob animate-blob-morph animate-blob-float-b absolute -bottom-20 -right-20 w-[400px] h-[400px]"
          style={{ background: '#06B6D4', opacity: 0.07, animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">

        <div className="mb-7 animate-fade-in-up">
          <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-1">Dashboard</p>
          <h1 className="font-heading font-extrabold text-3xl text-slate-900">My Account</h1>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">

          {/* ── LEFT SIDEBAR ─────────────────────────────────── */}
          <div className="space-y-4">

            {/* Profile card */}
            <div className="glass-card p-6 animate-fade-in-up">
              <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-lg overflow-hidden"
                  style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
                >
                  {signedIn && profile?.avatar ? (
                    <Image src={profile.avatar} alt={displayName} width={80} height={80} className="w-full h-full object-cover" />
                  ) : signedIn ? (
                    <span className="text-white font-extrabold text-2xl">{initials(profile?.name, displayMail ?? '')}</span>
                  ) : (
                    <User size={34} className="text-white" />
                  )}
                </div>
                <h2 className="font-heading font-bold text-slate-900 text-lg leading-tight truncate max-w-full">{displayName}</h2>
                <p className="text-slate-400 text-sm mt-0.5 truncate max-w-full">
                  {signedIn ? displayMail : 'Not signed in'}
                </p>
                {!signedIn && (
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
                )}
                {signedIn && profile?.createdAt && (
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-4">
                    Member since {profile.createdAt.toLocaleDateString('en-NP', { month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-5">
                {stats.map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="text-center">
                    <Icon size={15} className="mx-auto mb-1" style={{ color }} />
                    <p className="font-extrabold text-lg text-slate-900 leading-none">{value}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5 leading-tight">{label}</p>
                  </div>
                ))}
              </div>
            </div>

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

            {signedIn && <SignOutButton />}
          </div>

          {/* ── RIGHT CONTENT ─────────────────────────────────── */}
          <div className="space-y-5">

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

              {!signedIn && (
                <div className="px-6 py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <ShoppingBag size={26} className="text-slate-300" />
                  </div>
                  <p className="font-bold text-slate-600 text-sm">Sign in to see your orders</p>
                  <p className="text-slate-400 text-xs mt-1.5 max-w-xs mx-auto">
                    Sign in to view your order history, track deliveries and request returns.
                  </p>
                  <Link
                    href="/login"
                    className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-2xl transition-colors cursor-pointer shadow-md shadow-primary/15"
                  >
                    Sign In <ArrowRight size={14} />
                  </Link>
                </div>
              )}

              {signedIn && recentOrders.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <ShoppingBag size={26} className="text-slate-300" />
                  </div>
                  <p className="font-bold text-slate-600 text-sm">No orders yet</p>
                  <p className="text-slate-400 text-xs mt-1.5 max-w-xs mx-auto">
                    Start shopping to see your order history here.
                  </p>
                  <Link
                    href="/products"
                    className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-2xl transition-colors cursor-pointer shadow-md shadow-primary/15"
                  >
                    Browse Products <ArrowRight size={14} />
                  </Link>
                </div>
              )}

              {signedIn && recentOrders.length > 0 && (
                <div className="divide-y divide-slate-50">
                  {recentOrders.map(order => {
                    const statusCls = STATUS_CLS[order.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'
                    const totalQty  = order.items.reduce((s, i) => s + i.quantity, 0)
                    return (
                      <Link
                        key={order.id}
                        href={`/track-order?id=${order.id}`}
                        className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors cursor-pointer group"
                      >
                        <div className="flex -space-x-2 shrink-0">
                          {order.items.slice(0, 3).map((item, j) => (
                            <div key={j} className="relative w-10 h-10 rounded-xl border-2 border-white overflow-hidden bg-slate-100 shadow-sm">
                              {item.image
                                ? <Image src={item.image} alt={item.name} fill sizes="40px" className="object-cover" />
                                : <ShoppingBag size={14} className="absolute inset-0 m-auto text-slate-300" />
                              }
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="w-10 h-10 rounded-xl border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                              +{order.items.length - 3}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800 text-sm font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCls}`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock size={10} /> {timeAgo(order.createdAt)} · {totalQty} item{totalQty !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-sm text-slate-900">{formatPrice(order.total)}</p>
                          <p className="text-[10px] text-primary font-bold flex items-center gap-0.5 justify-end mt-0.5 group-hover:underline">
                            Track <ChevronRight size={10} />
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Info cards row */}
            <div className="grid sm:grid-cols-2 gap-4">
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
