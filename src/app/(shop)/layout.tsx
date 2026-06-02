import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import ScrollReset from '@/components/layout/ScrollReset'
import ThemeApplicator from '@/components/layout/ThemeApplicator'
import FacebookPixel from '@/components/layout/FacebookPixel'
import GoogleAnalytics from '@/components/layout/GoogleAnalytics'
import CustomHeadCode from '@/components/layout/CustomHeadCode'
import PageViewTracker from '@/components/layout/PageViewTracker'
import WhatsAppButton from '@/components/layout/WhatsAppButton'
import StoreBanner from '@/components/layout/StoreBanner'
import StorePopup from '@/components/layout/StorePopup'
import { ProductContextProvider } from '@/context/ProductContext'
import { getSiteSettings } from '@/lib/site-settings'
import { getEnabledPaymentMethods } from '@/lib/payment-methods-server'

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [settings, paymentMethods] = await Promise.all([
    getSiteSettings(),
    getEnabledPaymentMethods().catch(() => ['COD'] as string[]),
  ])
  return (
    <ProductContextProvider>
      <ThemeApplicator />
      <FacebookPixel />
      <GoogleAnalytics gaId={settings.gaMeasurementId} />
      <CustomHeadCode code={settings.customHeadCode} />
      <PageViewTracker />
      <ScrollReset />
      <Navbar siteName={settings.siteName} logoUrl={settings.logoUrl} brandSplit={settings.brandSplit} />
      {/* pt-20 clears floating navbar; pb-20 clears bottom nav on mobile.
          html has overflow-x: clip so the viewport is always bounded; we keep
          this element overflow-visible so sticky descendants (product gallery)
          can pin against the viewport. */}
      <main className="flex-1 min-w-0 pt-20 pb-20 md:pb-0">
        {/* Store announcement banner — sits below the floating navbar, in flow. */}
        <StoreBanner banner={settings.banner} />
        {children}
      </main>
      {/* Promotional popup — fixed overlay; self-suppresses on /checkout. */}
      <StorePopup popup={settings.popup} />
      {/* Footer hidden on mobile — bottom nav replaces it */}
      <div className="hidden md:block">
        <Footer
          siteName={settings.siteName}
          brandSplit={settings.brandSplit}
          logoUrl={settings.logoUrl}
          storeEmail={settings.storeEmail}
          storePhone={settings.storePhone}
          storeAddress={settings.storeAddress}
          whatsappNumber={settings.whatsappNumber}
          facebookPageId={settings.facebookPageId}
          instagramUrl={settings.content.contact.instagram}
          xUrl={settings.content.contact.x}
          youtubeUrl={settings.content.contact.youtube}
          paymentMethods={paymentMethods}
        />
      </div>
      <BottomNav />
      <WhatsAppButton />
    </ProductContextProvider>
  )
}
