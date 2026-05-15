import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import SeoToolsClient from './SeoToolsClient'

export const dynamic = 'force-dynamic'

export default async function SeoToolsPage() {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) redirect('/login?next=/admin/seo-tools')

  return <SeoToolsClient />
}
