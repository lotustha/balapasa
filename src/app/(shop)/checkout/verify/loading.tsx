import { Loader2 } from 'lucide-react'

export default function VerifyLoading() {
  return (
    <div
      className="min-h-[70vh] flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg,#F0FDF4 0%,#EEF2FF 50%,#F0FDF4 100%)' }}
    >
      <div className="text-center glass-panel p-12 rounded-3xl max-w-sm w-full animate-fade-in-up">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Loader2 size={32} className="text-primary animate-spin" />
        </div>
        <h1 className="font-heading font-extrabold text-xl text-slate-900 mb-2">
          Verifying Payment
        </h1>
        <p className="text-slate-500 text-sm">
          Please wait while we confirm your payment…
        </p>
        <p className="text-xs text-slate-400 mt-4">Do not close this window.</p>
      </div>
    </div>
  )
}
