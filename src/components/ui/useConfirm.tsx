'use client'

import { useState, useCallback, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

export interface ConfirmOptions {
  title: string
  message?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
}

// Promise-based confirmation dialog — a drop-in, professional replacement for
// window.confirm(). Usage:
//   const { confirm, dialog } = useConfirm()
//   ...render {dialog} once in the component...
//   if (!(await confirm({ title: 'Delete coupon?', message: '…', tone: 'danger' }))) return
export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o)
    return new Promise<boolean>(resolve => { resolver.current = resolve })
  }, [])

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOpts(null)
  }, [])

  const dialog = <ConfirmDialog opts={opts} onResolve={settle} />
  return { confirm, dialog }
}

function ConfirmDialog({ opts, onResolve }: { opts: ConfirmOptions | null; onResolve: (v: boolean) => void }) {
  if (!opts) return null
  const tone = opts.tone ?? 'danger'
  const confirmCls = tone === 'danger'
    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
    : 'bg-primary hover:bg-primary-dark shadow-primary/20'

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={() => onResolve(false)}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-3.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${tone === 'danger' ? 'bg-red-50 text-red-500' : 'bg-primary-bg text-primary'}`}>
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h2 className="font-heading font-bold text-slate-900 text-base leading-snug">{opts.title}</h2>
              {opts.message && <div className="text-sm text-slate-500 mt-1.5 leading-relaxed">{opts.message}</div>}
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => onResolve(false)}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              {opts.cancelLabel ?? 'Cancel'}
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => onResolve(true)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer transition-colors shadow-md ${confirmCls}`}
            >
              {opts.confirmLabel ?? 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
