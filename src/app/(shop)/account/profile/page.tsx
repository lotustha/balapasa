'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, User, Mail, Phone, Camera,
  Shield, Eye, EyeOff, Save, Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react'

interface Profile {
  id: string
  name:   string | null
  email:  string
  phone:  string | null
  avatar: string | null
  role:   string
}

export default function ProfilePage() {
  const [loading,  setLoading]   = useState(true)
  const [authed,   setAuthed]    = useState(false)
  const [profile,  setProfile]   = useState<Profile | null>(null)

  // Profile form
  const [form,     setForm]      = useState({ name: '', phone: '', avatar: '' })
  const [saving,   setSaving]    = useState(false)
  const [savedAt,  setSavedAt]   = useState<number | null>(null)
  const [error,    setError]     = useState<string | null>(null)

  // Avatar upload
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // Password form
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd,     setNewPwd]     = useState('')
  const [showPwd,    setShowPwd]    = useState(false)
  const [pwdSaving,  setPwdSaving]  = useState(false)
  const [pwdSavedAt, setPwdSavedAt] = useState<number | null>(null)
  const [pwdError,   setPwdError]   = useState<string | null>(null)

  // Load profile
  useEffect(() => {
    fetch('/api/account/profile')
      .then(async r => {
        if (r.status === 401) { setAuthed(false); return }
        const d = await r.json()
        if (d.profile) {
          setAuthed(true)
          setProfile(d.profile)
          setForm({
            name:   d.profile.name   ?? '',
            phone:  d.profile.phone  ?? '',
            avatar: d.profile.avatar ?? '',
          })
        }
      })
      .catch(() => setAuthed(false))
      .finally(() => setLoading(false))
  }, [])

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError(null)
    try {
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { 'content-type': file.type },
        body: await file.arrayBuffer(),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Upload failed')
      setForm(f => ({ ...f, avatar: data.url }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Avatar upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null); setSavedAt(null)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setProfile(data.profile)
      setSavedAt(Date.now())
      setTimeout(() => setSavedAt(null), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!newPwd) return
    setPwdSaving(true); setPwdError(null); setPwdSavedAt(null)
    try {
      const res = await fetch('/api/account/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Password change failed')
      setPwdSavedAt(Date.now())
      setCurrentPwd(''); setNewPwd('')
      setTimeout(() => setPwdSavedAt(null), 2500)
    } catch (e) {
      setPwdError(e instanceof Error ? e.message : 'Password change failed')
    } finally {
      setPwdSaving(false)
    }
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

        {loading ? (
          <div className="glass-card p-12 flex justify-center">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : !authed || !profile ? (
          // ── Not signed in ───────────────────────────────────────────
          <div className="glass-card p-6 flex flex-col items-center text-center mb-4 animate-fade-in-up">
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
                <User size={34} className="text-white" />
              </div>
            </div>
            <p className="font-bold text-slate-800 text-sm">Guest User</p>
            <p className="text-slate-400 text-xs mt-0.5">Sign in to edit your profile</p>
            <Link href="/login"
              className="mt-3 px-5 py-2 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-dark transition-colors cursor-pointer">
              Sign In
            </Link>
          </div>
        ) : (
          <>
            {/* Avatar */}
            <div className="glass-card p-6 flex flex-col items-center text-center mb-4 animate-fade-in-up">
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden"
                  style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
                  {form.avatar ? (
                    <Image src={form.avatar} alt={form.name || profile.email}
                      width={80} height={80}
                      className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <User size={34} className="text-white" />
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  aria-label="Upload avatar"
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50">
                  {uploading ? <Loader2 size={12} className="animate-spin text-primary" /> : <Camera size={12} className="text-slate-500" />}
                </button>
              </div>
              <p className="font-bold text-slate-800 text-sm">{profile.name ?? profile.email}</p>
              <p className="text-slate-400 text-xs mt-0.5">{profile.email} · {profile.role.toLowerCase()}</p>
            </div>

            {/* Profile form */}
            <form onSubmit={handleSave} className="glass-card p-6 space-y-4 animate-fade-in-up mb-4" style={{ animationDelay: '0.05s' }}>
              <h2 className="font-heading font-bold text-slate-900 text-sm">Personal Information</h2>

              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span className="font-semibold">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Your full name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm border border-slate-200 bg-white/80 text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email" value={profile.email} disabled
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm border border-slate-200 bg-slate-100 text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">Email is your sign-in identity and can&apos;t be changed here.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel" inputMode="numeric" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="98XXXXXXXX"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm border border-slate-200 bg-white/80 text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
              >
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : savedAt
                  ? <><CheckCircle2 size={14} /> Saved!</>
                  : <><Save size={14} /> Save Changes</>}
              </button>
            </form>

            {/* Security */}
            <form onSubmit={handlePassword} className="glass-card p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: '0.10s' }}>
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-primary" />
                <h2 className="font-heading font-bold text-slate-900 text-sm">Security</h2>
              </div>

              {pwdError && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span className="font-semibold">{pwdError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Current Password</label>
                <input
                  type="password" value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  placeholder="Required to change your password"
                  className="w-full px-4 py-3 rounded-xl text-sm border border-slate-200 bg-white/80 text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'} value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    placeholder="Min 8 characters"
                    minLength={8}
                    className="w-full pl-4 pr-10 py-3 rounded-xl text-sm border border-slate-200 bg-white/80 text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                  />
                  <button
                    type="button" onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">Minimum 8 characters.</p>
              </div>

              <button
                type="submit" disabled={pwdSaving || newPwd.length < 8}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
              >
                {pwdSaving
                  ? <><Loader2 size={14} className="animate-spin" /> Updating…</>
                  : pwdSavedAt
                  ? <><CheckCircle2 size={14} /> Updated!</>
                  : <><Shield size={14} /> Change Password</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
