'use client'

import Link from 'next/link'
import { ArrowLeft, MapPin, Plus, Home, Briefcase, MoreHorizontal } from 'lucide-react'

export default function AddressesPage() {
  return (
    <div
      className="min-h-screen pt-6 pb-16 relative"
      style={{ background: 'linear-gradient(135deg,#F8F7FF 0%,#F4F6FF 40%,#FFF5FB 70%,#F0FDF4 100%)' }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-b absolute -top-24 -right-24 w-[400px] h-[400px]"
          style={{ background: '#06B6D4', opacity: 0.07, animationDelay: '1s' }} />
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
            <h1 className="font-heading font-extrabold text-2xl text-slate-900 leading-tight">Saved Addresses</h1>
          </div>
        </div>

        {/* Empty state */}
        <div className="glass-card p-12 text-center animate-fade-in-up mb-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center mx-auto mb-4">
            <MapPin size={28} className="text-cyan-400" />
          </div>
          <p className="font-bold text-slate-700 text-sm">No saved addresses</p>
          <p className="text-slate-400 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
            Save your delivery addresses to check out faster next time.
          </p>
        </div>

        {/* Address type guide */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
          {[
            { icon: Home,      label: 'Home',   desc: 'Your residential address',  color: 'bg-violet-50', ic: 'text-violet-500' },
            { icon: Briefcase, label: 'Office', desc: 'Your work address',          color: 'bg-amber-50',  ic: 'text-amber-500'  },
          ].map(({ icon: Icon, label, desc, color, ic }) => (
            <div key={label} className="glass-card p-4 flex items-center gap-3 opacity-50">
              <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon size={16} className={ic} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">{label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Add address CTA */}
        <button
          className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-primary/30 text-primary hover:bg-primary-bg font-bold text-sm transition-colors cursor-pointer animate-fade-in-up"
          style={{ animationDelay: '0.10s' }}
        >
          <Plus size={16} /> Add New Address
        </button>

        <p className="text-center text-xs text-slate-400 mt-4 animate-fade-in-up" style={{ animationDelay: '0.12s' }}>
          Addresses are saved securely and only used for delivery.
        </p>
      </div>
    </div>
  )
}
