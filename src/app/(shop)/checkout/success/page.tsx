import Link from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'

// Fallback success page when no orderId is in the URL (rare — only if the
// redirect from checkout lost the order ID for some reason).
export default function CheckoutSuccessFallback() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F0FDF4 100%)' }}>
      <div className="text-center max-w-md w-full glass-card p-12">
        <div className="w-20 h-20 bg-primary-bg rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-primary" />
        </div>
        <h2 className="font-heading font-extrabold text-3xl text-slate-900 mb-3">Order Placed!</h2>
        <p className="text-slate-500 mb-8">Thank you! We&apos;ll confirm your order shortly.</p>
        <Link href="/"
          className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-colors cursor-pointer">
          Continue Shopping <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}
