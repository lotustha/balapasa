import Link from 'next/link'
import { AlertCircle, KeyRound } from 'lucide-react'
import { verifyMagicToken } from '@/lib/magic-link'
import { prisma } from '@/lib/prisma'
import SetupPasswordForm from './SetupPasswordForm'

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

export const dynamic = 'force-dynamic'

export default async function AccountSetupPage({ searchParams }: PageProps) {
  const { token } = await searchParams

  if (!token) {
    return <InvalidLinkScreen reason="No setup link found. Please use the link from your order confirmation." />
  }

  const payload = await verifyMagicToken(token)
  if (!payload) {
    return <InvalidLinkScreen reason="This setup link is invalid or has expired (links last 7 days)." />
  }

  const profile = await prisma.profile.findUnique({
    where:  { email: payload.email },
    select: { email: true, name: true, password: true },
  })

  if (!profile) {
    return <InvalidLinkScreen reason="Account not found. Please contact support." />
  }

  if (profile.password) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F0FDF4 100%)' }}>
        <div className="text-center max-w-md w-full glass-card p-10">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={32} className="text-amber-600" />
          </div>
          <h2 className="font-heading font-extrabold text-2xl text-slate-900 mb-2">Already activated</h2>
          <p className="text-slate-500 text-sm mb-6">
            Your account has already been set up. Sign in to continue shopping.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-colors cursor-pointer">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-12 pb-16 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F0FDF4 60%, #FAF5FF 100%)' }}>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="blob absolute -top-20 -left-20 w-[380px] h-[380px] animate-blob-morph animate-blob-float-a"
          style={{ background: '#10B981', opacity: 0.14 }} />
        <div className="blob absolute -bottom-16 -right-16 w-[320px] h-[320px] animate-blob-morph animate-blob-float-b"
          style={{ background: '#8B5CF6', opacity: 0.12 }} />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white shadow-lg shadow-primary/30 mb-4">
            <KeyRound size={28} />
          </div>
          <h1 className="font-heading font-extrabold text-3xl text-slate-900 mb-2">
            Set your password
          </h1>
          <p className="text-slate-600 text-sm">
            Welcome, <span className="font-semibold text-slate-900">{profile.name ?? profile.email}</span>! Choose a password to claim your account and unlock <strong>10% off</strong> your next order.
          </p>
        </div>

        <SetupPasswordForm token={token} email={profile.email} />
      </div>
    </div>
  )
}

function InvalidLinkScreen({ reason }: { reason: string }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 100%)' }}>
      <div className="text-center max-w-md w-full glass-card p-10">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <AlertCircle size={32} className="text-red-600" />
        </div>
        <h2 className="font-heading font-extrabold text-2xl text-slate-900 mb-2">Link not valid</h2>
        <p className="text-slate-500 text-sm mb-6">{reason}</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/login" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors cursor-pointer text-sm">
            Sign in
          </Link>
          <Link href="/" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-sm">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
