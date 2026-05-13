import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { CheckCircle, ArrowRight, Package, ShieldCheck, Truck, Mail, Sparkles, KeyRound } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'
import { verifyMagicToken } from '@/lib/magic-link'

interface PageProps {
  params:       Promise<{ orderId: string }>
  searchParams: Promise<{ claim?: string }>
}

async function fetchOrder(orderId: string) {
  try {
    return await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })
  } catch {
    return null
  }
}

export default async function CheckoutSuccessPage({ params, searchParams }: PageProps) {
  const { orderId } = await params
  const sp          = await searchParams

  const order = await fetchOrder(orderId)
  if (!order) notFound()

  // Validate the claim token (if any) — only show signup card when token is valid
  // and matches the order's email.
  let claimToken: string | null = null
  if (sp.claim) {
    const payload = await verifyMagicToken(sp.claim)
    if (payload && payload.email === order.email?.toLowerCase()) {
      claimToken = sp.claim
    }
  }

  const orderShort = order.id.slice(0, 8).toUpperCase()
  const itemCount  = order.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="min-h-screen pt-6 pb-16 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F0FDF4 50%, #FAF5FF 100%)' }}>

      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="blob absolute -top-20 -left-20 w-[400px] h-[400px] animate-blob-morph animate-blob-float-a"
          style={{ background: '#10B981', opacity: 0.16 }} />
        <div className="blob absolute -bottom-16 -right-16 w-[360px] h-[360px] animate-blob-morph animate-blob-float-b"
          style={{ background: '#8B5CF6', opacity: 0.14 }} />
        <div className="blob absolute top-1/3 right-1/4 w-[280px] h-[280px] animate-blob-morph animate-blob-float-c"
          style={{ background: '#EC4899', opacity: 0.10 }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6">

        {/* Success header */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary text-white shadow-lg shadow-primary/30 mb-5 animate-bounce-in">
            <CheckCircle size={42} strokeWidth={2.5} />
          </div>
          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-slate-900 mb-2">
            Order Placed!
          </h1>
          <p className="text-slate-600 text-sm sm:text-base">
            Thank you, <span className="font-semibold text-slate-900">{order.name}</span>. We&apos;ll confirm your order shortly.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-white/80 border border-slate-100 shadow-sm" style={{ backdropFilter: 'blur(8px)' }}>
            <Package size={13} className="text-primary" />
            <span className="text-xs font-bold text-slate-700">Order #{orderShort}</span>
          </div>
        </div>

        {/* Guest signup card (claim + 10% off) */}
        {claimToken && (
          <div className="glass-card p-6 sm:p-7 mb-6 animate-fade-in-up relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-30" style={{ background: '#F59E0B' }} />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold mb-3">
                <Sparkles size={11} /> Exclusive offer
              </div>
              <h2 className="font-heading font-extrabold text-xl text-slate-900 mb-2">
                Claim your account + 10% off your next order
              </h2>
              <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                We&apos;ve saved your details for next time. Set a password now and unlock a one-time <strong>10% off</strong> coupon — plus order tracking and faster checkout.
              </p>
              <Link
                href={`/account/setup?token=${encodeURIComponent(claimToken)}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl transition-all cursor-pointer shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5"
              >
                <KeyRound size={15} />
                Claim my account
                <ArrowRight size={14} />
              </Link>
              <p className="text-[11px] text-slate-400 mt-3">
                Link is valid for 7 days. We&apos;ll also send it to {order.email}.
              </p>
            </div>
          </div>
        )}

        {/* Order summary */}
        <div className="glass-card p-6 sm:p-7 mb-6 animate-fade-in-up">
          <h2 className="font-heading font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
            <Package size={16} className="text-primary" /> Order details
          </h2>

          <div className="space-y-3 mb-5">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                  {item.image && <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />}
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">× {item.quantity}</p>
                </div>
                <p className="text-sm font-bold text-slate-900 shrink-0">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Delivery</span>
              <span className="font-semibold text-slate-900">
                {order.deliveryCharge === 0 ? 'FREE' : formatPrice(order.deliveryCharge)}
              </span>
            </div>
            {(order.couponDiscount ?? 0) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Promo discount</span>
                <span className="font-semibold">− {formatPrice(order.couponDiscount ?? 0)}</span>
              </div>
            )}
            <div className="border-t border-slate-100 pt-3 flex justify-between">
              <span className="font-heading font-bold text-slate-900">Total</span>
              <span className="font-heading font-extrabold text-xl text-primary">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Delivery info */}
        <div className="glass-card p-6 sm:p-7 mb-6 animate-fade-in-up">
          <h2 className="font-heading font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
            <Truck size={16} className="text-primary" /> Delivery
          </h2>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Recipient</p>
              <p className="text-slate-800 font-semibold">{order.name} · {order.phone}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Address</p>
              <p className="text-slate-700 leading-relaxed">{order.address}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Shipping</p>
              <p className="text-slate-700">{order.shippingOption}</p>
            </div>
          </div>
        </div>

        {/* Email confirmation note */}
        {order.email && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/70 border border-slate-100 mb-6"
            style={{ backdropFilter: 'blur(8px)' }}>
            <div className="w-9 h-9 rounded-xl bg-primary-bg flex items-center justify-center shrink-0">
              <Mail size={15} className="text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-bold text-slate-800">Order confirmation sent</p>
              <p className="text-xs text-slate-500">Check <span className="font-semibold text-slate-700">{order.email}</span> for your receipt</p>
            </div>
          </div>
        )}

        {/* Trust badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {[
            { icon: ShieldCheck, title: '100% Authentic',  desc: 'Verified products' },
            { icon: Truck,        title: 'Track Anytime',   desc: 'Real-time updates' },
            { icon: Package,      title: 'Easy Returns',    desc: '7-day window'      },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 border border-slate-100"
              style={{ backdropFilter: 'blur(8px)' }}>
              <div className="w-9 h-9 rounded-xl bg-primary-bg flex items-center justify-center shrink-0">
                <Icon size={15} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{title}</p>
                <p className="text-[11px] text-slate-500 truncate">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
          <Link href={`/track-order?id=${order.id}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl transition-all cursor-pointer shadow-lg shadow-primary/20">
            <Package size={15} /> Track this order
          </Link>
          <Link href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 hover:text-primary hover:border-primary/30 font-bold rounded-2xl transition-all cursor-pointer shadow-sm"
            style={{ backdropFilter: 'blur(8px)' }}>
            Continue shopping <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
