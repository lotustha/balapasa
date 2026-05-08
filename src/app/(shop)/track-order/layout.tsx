import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Track Order',
  description: `Track your ${process.env.NEXT_PUBLIC_STORE_NAME ?? 'Balapasa'} order status in real time. Enter your order ID to get live updates.`,
  alternates: { canonical: '/track-order' },
  openGraph: {
    title: 'Track Your Order | Balapasa',
    description: 'Enter your order ID to track your Balapasa delivery status in real time.',
    url: '/track-order',
    type: 'website',
  },
}

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
