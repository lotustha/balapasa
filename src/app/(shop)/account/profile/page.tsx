'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, User, Mail, Phone, Camera,
  Shield, Eye, EyeOff, Save, Loader2,
} from 'lucide-react'

export default function ProfilePage() {
  const [showPass,  setShowPass]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)

  const [form, setForm] = useState({ name: '', email: '', phone: '' })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div
      className="min-h-screen pt-6 pb-16 relative"
      style={{ background: 'linear-gradient(135deg,#F8F7FF 0%,#F4F6FF 40%,#FFF5FB 70%,#F0FDF4 100%)' }}
    >
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="blob animate-blob-morph animate-blob-float-a absolute -top-20 -right-20 w-[350px] h-[350px]"
          style={{ background: '#F59E0B', opacity: 0.07 }} />
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
          <Link href="/account"
            className="w-9 h-9 rounded-xl bg-white/80 border border-slate-200 flex items-center justify-center hover:bg-white transition-colors cursor-pointer shadow-sm">
            <ArrowLeft size={16} className="text-slate-600" />
          </Link>
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Account</p>
            <h1 className="font-heading font-extrabold text-2xl text-slate-900 leading-tight">Profile &amp; Security</h1>
          </div>
        </div>

        {/* Avatar */}
        <div className="glass-card p-6 flex flex-col items-center text-center mb-4 animate-fade-in-up">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
              <User size={34} className="text-white" />
            </div>
            <button
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors cursor-pointer">
              <Camera size={12} className="text-slate-500" />
            </button>
          </div>
          <p className="font-bold text-slate-800 text-sm">Guest User</p>
          <p className="text-slate-400 text-xs mt-0.5">Sign in to edit your profile</p>
          <Link href="/login"
            className="mt-3 px-5 py-2 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-dark transition-colors cursor-pointer">
            Sign In
          </Link>
        </div>

        {/* Profile form */}
        <form onSubmit={handleSave} className="glass-card p-6 space-y-4 animate-fade-in-up mb-4" style={{ animationDelay: '0.05s' }}>
          <h2 className="font-heading font-bold text-slate-900 text-sm mb-1">Personal Information</h2>

          {[
            { key: 'name',  label: 'Full Name',    icon: User,  type: 'text',  placeholder: 'Your full name'    },
            { key: 'email', label: 'Email Address', icon: Mail,  type: 'email', placeholder: 'you@example.com'  },
            { key: 'phone', label: 'Phone Number',  icon: Phone, type: 'tel',   placeholder: '98XXXXXXXX'        },
          ].map(({ key, label, icon: Icon, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
              <div className="relative">
                <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm border border-slate-200 bg-white/80 text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : saved
              ? <><Save size={14} /> Saved!</>
              : <><Save size={14} /> Save Changes</>
            }
          </button>
        </form>

        {/* Security */}
        <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: '0.10s' }}>
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-primary" />
            <h2 className="font-heading font-bold text-slate-900 text-sm">Security</h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Leave blank to keep current"
                className="w-full pl-4 pr-10 py-3 rounded-xl text-sm border border-slate-200 bg-white/80 text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">Minimum 8 characters with at least one number.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
