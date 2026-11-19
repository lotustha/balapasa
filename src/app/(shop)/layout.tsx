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
import { prisma } from '@/lib/prisma'
import { getEnabledPaymentMethods } from '@/lib/payment-methods-server'
import MaintenanceGate from '@/components/layout/MaintenanceGate'
import { getCurrentUser } from '@/lib/auth'
import { hasRole } from '@/lib/admin-access'
import {
  ordersBlocked, MAINTENANCE_FALLBACK_TITLE, MAINTENANCE_FALLBACK_MESSAGE, ORDERS_PAUSED_FALLBACK_MESSAGE,
} from '@/lib/site-settings-shared'

// The four categories with the most products, for the footer's Shop column.
async function getFooterCategories(): Promise<{ slug: string; name: string }[]> {
  try {
    const rows = await prisma.category.findMany({
      where:   { products: { some: { isActive: true } } },
      select:  { slug: true, name: true, _count: { select: { products: { where: { isActive: true } } } } },
    })
    return rows.sort((a, b) => b._count.products - a._count.products).slice(0, 4).map(({ slug, name }) => ({ slug, name }))
  } catch {
    return []
  }
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [settings, paymentMethods, shopCategories] = await Promise.all([
    getSiteSettings(),
    getEnabledPaymentMethods().catch(() => ['COD'] as string[]),
    getFooterCategories(),
  ])
  const { maintenance } = settings
  // Only look at who is visiting while a switch is on: reading the login cookie makes the page
  // uncacheable, which the normal storefront must not be.
  const isStaff = ordersBlocked(maintenance) ? hasRole((await getCurrentUser())?.role, 'STAFF') : false
  const closedForVisitor = maintenance.closed && !isStaff

  const storefront = (
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
        {maintenance.closed && isStaff && (
          <p role="status" className="bg-amber-500 text-white text-xs font-bold text-center px-4 py-2">
            Maintenance mode is on: customers see a closed store. You see the site because you are signed in as staff.
          </p>
        )}
        {!maintenance.closed && maintenance.ordersPaused && (
          <p role="status" data-maintenance="orders-paused" className="bg-amber-100 text-amber-900 text-xs font-semibold text-center px-4 py-2">
            {maintenance.message.trim() || ORDERS_PAUSED_FALLBACK_MESSAGE}
          </p>
        )}
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
          shopCategories={shopCategories}
        />
      </div>
      <BottomNav />
      <WhatsAppButton />
    </ProductContextProvider>
  )

  if (!closedForVisitor) return storefront
  return (
    <MaintenanceGate
      title={maintenance.title.trim() || MAINTENANCE_FALLBACK_TITLE}
      message={maintenance.message.trim() || MAINTENANCE_FALLBACK_MESSAGE}
      backBy={maintenance.backBy}
      siteName={settings.siteName}
      logoUrl={settings.logoUrl}
    >
      {storefront}
    </MaintenanceGate>
  )
}
