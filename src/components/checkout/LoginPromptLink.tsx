'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LogIn } from 'lucide-react'

export default function LoginPromptLink() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const qs           = searchParams.toString()
  const returnTo     = qs ? `${pathname}?${qs}` : pathname
  const href         = `/login?returnTo=${encodeURIComponent(returnTo)}`

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-dark transition-colors cursor-pointer underline-offset-4 hover:underline"
    >
      <LogIn size={11} />
      Sign in to autofill
    </Link>
  )
}
