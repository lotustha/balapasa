import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import ScrollReset from '@/components/layout/ScrollReset'
import ThemeApplicator from '@/components/layout/ThemeApplicator'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeApplicator />
      <ScrollReset />
      <Navbar />
      {/* pt-20 clears floating navbar; pb-20 clears bottom nav on mobile */}
      <main className="flex-1 pt-20 pb-20 md:pb-0">
        {children}
      </main>
      {/* Footer hidden on mobile — bottom nav replaces it */}
      <div className="hidden md:block"><Footer /></div>
      <BottomNav />
    </>
  )
}
