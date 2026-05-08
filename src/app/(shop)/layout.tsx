import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ScrollReset from '@/components/layout/ScrollReset'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScrollReset />
      <Navbar />
      {/* pt-20 = 80px clears the floating navbar (top-3 + h-14 + breathing room) */}
      <main className="flex-1 pt-20">
        {children}
      </main>
      <Footer />
    </>
  )
}
