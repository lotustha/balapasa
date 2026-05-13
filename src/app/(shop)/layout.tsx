import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import ScrollReset from '@/components/layout/ScrollReset'
import ThemeApplicator from '@/components/layout/ThemeApplicator'
import FacebookPixel from '@/components/layout/FacebookPixel'
import WhatsAppButton from '@/components/layout/WhatsAppButton'
import { ProductContextProvider } from '@/context/ProductContext'
import { getSiteSettings } from '@/lib/site-settings'

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings()
  return (
    <ProductContextProvider>
      <ThemeApplicator />
      <FacebookPixel />
      <ScrollReset />
      <Navbar siteName={settings.siteName} logoUrl={settings.logoUrl} />
      {/* pt-20 clears floating navbar; pb-20 clears bottom nav on mobile */}
      <main className="flex-1 pt-20 pb-20 md:pb-0">
        {children}
      </main>
      {/* Footer hidden on mobile — bottom nav replaces it */}
      <div className="hidden md:block">
        <Footer siteName={settings.siteName} brandSplit={settings.brandSplit} logoUrl={settings.logoUrl} />
      </div>
      <BottomNav />
      <WhatsAppButton />
    </ProductContextProvider>
  )
}
