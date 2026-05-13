'use client'

import { Check, Sparkles } from 'lucide-react'

interface Props {
  checked:   boolean
  onChange:  (next: boolean) => void
  hasEmail:  boolean
}

export default function SaveMyInfoCheckbox({ checked, onChange, hasEmail }: Props) {
  const disabled = !hasEmail

  return (
    <label
      className={`flex items-start gap-3 p-4 rounded-2xl border-2 transition-all duration-200 ${
        disabled
          ? 'border-slate-100 bg-slate-50/50 cursor-not-allowed opacity-60'
          : checked
          ? 'border-primary bg-primary-bg cursor-pointer'
          : 'border-slate-100 bg-white/70 hover:border-slate-200 cursor-pointer'
      }`}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {/* Custom checkbox */}
      <div
        className={`shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
          checked && !disabled
            ? 'bg-primary border-primary'
            : 'border-slate-300 bg-white'
        }`}
      >
        {checked && !disabled && <Check size={12} strokeWidth={3} className="text-white" />}
      </div>

      <input
        type="checkbox"
        className="sr-only"
        checked={checked && !disabled}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Sparkles size={12} className="text-primary shrink-0" />
          <p className="text-sm font-bold text-slate-800">
            Save my info for faster checkout next time
          </p>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {disabled
            ? 'Add an email above and we’ll send you a one-tap link to claim your account + 10% off your next order.'
            : 'We’ll email you a one-tap link to set a password and unlock 10% off your next order. No password needed now.'}
        </p>
      </div>
    </label>
  )
}
