import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Account',
  description: `Create a ${process.env.NEXT_PUBLIC_STORE_NAME ?? 'Balapasa'} account for faster checkout and order tracking.`,
  robots: { index: false, follow: false },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
