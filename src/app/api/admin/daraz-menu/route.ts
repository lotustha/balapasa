import { requireRole } from '@/lib/auth'
import { getDarazControls } from '@/lib/daraz-admin'

export const dynamic = 'force-dynamic'

// Whether the admin menu shows the Daraz page (Settings → Daraz → "Show Daraz in the menu").
export async function GET() {
  const guard = await requireRole('STAFF')
  if ('error' in guard) return guard.error
  return Response.json({ show: (await getDarazControls()).showDarazMenu })
}
