import AdminNav from '@/components/admin/AdminNav'
import AdminMobileNav from '@/components/admin/AdminMobileNav'
import { getSiteSettings } from '@/lib/site-settings'

// Server component so brand identity flows from the DB (getSiteSettings)
// into the client nav, rather than being hardcoded to the build-time
// STORE_NAME env var. Critical for multi-tenant deploys where a single
// codebase serves several stores.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings()
  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminNav        siteName={settings.siteName} logoUrl={settings.logoUrl} brandSplit={settings.brandSplit} />
      <AdminMobileNav  logoUrl={settings.logoUrl} siteName={settings.siteName} />
      <main className="flex-1 overflow-auto pt-14 pb-20 md:pt-0 md:pb-0">
        {children}
      </main>
    </div>
  )
}
