import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Checkout',
  description: `Secure checkout at ${process.env.NEXT_PUBLIC_STORE_NAME ?? 'Balapasa'}.`,
  robots: { index: false, follow: false },
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
