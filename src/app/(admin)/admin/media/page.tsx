import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import MediaLibraryClient from './MediaLibraryClient'

export const dynamic = 'force-dynamic'

export default async function AdminMediaPage() {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) redirect('/login?next=/admin/media')

  return <MediaLibraryClient />
}
