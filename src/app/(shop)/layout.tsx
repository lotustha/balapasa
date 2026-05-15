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
      <Navbar siteName={settings.siteName} logoUrl={settings.logoUrl} brandSplit={settings.brandSplit} />
      {/* pt-20 clears floating navbar; pb-20 clears bottom nav on mobile.
          min-w-0 + overflow-x-hidden so inner content wider than viewport
          (long product names, breadcrumbs, tables) doesn't blow out the layout
          and leave the page looking shifted on mobile. */}
      <main className="flex-1 min-w-0 overflow-x-hidden pt-20 pb-20 md:pb-0">
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
