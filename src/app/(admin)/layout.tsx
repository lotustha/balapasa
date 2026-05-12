import AdminNav from '@/components/admin/AdminNav'
import AdminMobileNav from '@/components/admin/AdminMobileNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminNav />          {/* desktop sidebar — hidden on mobile */}
      <AdminMobileNav />    {/* mobile top bar + bottom tabs — hidden on desktop */}
      <main className="flex-1 overflow-auto pt-14 pb-20 md:pt-0 md:pb-0">
        {children}
      </main>
    </div>
  )
}
