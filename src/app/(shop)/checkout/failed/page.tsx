import Link from 'next/link'
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react'

const REASON_MESSAGES: Record<string, string> = {
  missing_data:       'Payment data was not received.',
  invalid_signature:  'Payment verification failed. Please contact support.',
  CANCELED:           'Payment was cancelled by eSewa.',
  PENDING:            'Payment is still pending. Please wait and check your orders.',
  user_canceled:      'You cancelled the payment.',
  lookup_failed:      'Could not verify payment status. Please check your orders.',
  Expired:            'Payment session expired. Please try again.',
  Refunded:           'Payment was refunded.',
}

export default function CheckoutFailedPage({
  searchParams,
}: {
  searchParams: { reason?: string }
}) {
  const reason = searchParams?.reason ?? ''
  const message = REASON_MESSAGES[reason] ?? 'Something went wrong with your payment.'

  return (
    <div
      className="min-h-[70vh] flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #FFF5F5 0%, #FFF0F0 50%, #F4F6FF 100%)' }}
    >
      {/* Subtle blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="blob absolute -top-16 -right-16 w-64 h-64 animate-blob-morph animate-blob-float-b"
          style={{ background: '#EF4444', opacity: 0.10 }} />
        <div className="blob absolute bottom-10 left-0 w-56 h-56 animate-blob-morph animate-blob-float-c"
          style={{ background: '#8B5CF6', opacity: 0.08, animationDelay: '2s' }} />
      </div>

      <div className="relative text-center max-w-md w-full glass-panel p-10 animate-fade-in-up">
        <div className="w-18 h-18 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6" style={{ width: 72, height: 72 }}>
          <XCircle size={40} className="text-red-400" />
        </div>

        <h1 className="font-heading font-extrabold text-2xl text-slate-900 mb-2">
          Payment Failed
        </h1>
        <p className="text-slate-500 mb-2">{message}</p>
        {reason && !REASON_MESSAGES[reason] && (
          <p className="text-xs text-slate-400 font-mono bg-slate-50 rounded-xl px-3 py-1.5 mb-4">
            Error: {reason}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Link href="/checkout"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl transition-colors cursor-pointer shadow-lg shadow-primary/20">
            <RefreshCw size={16} /> Try Again
          </Link>
          <Link href="/cart"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 glass-card text-slate-700 font-semibold rounded-2xl hover:bg-white/90 transition-colors cursor-pointer">
            <ArrowLeft size={16} /> Back to Cart
          </Link>
        </div>

        <p className="text-xs text-slate-400 mt-6">
          Your cart is preserved. No charge was made.
        </p>
      </div>
    </div>
  )
}
