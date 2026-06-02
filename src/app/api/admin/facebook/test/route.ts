import { requireRole } from '@/lib/auth'
import { testFacebookConnection } from '@/lib/facebook'
import { STORE_NAME } from '@/lib/config'

// Posts a real (deletable) test message to the linked page and returns the exact
// Graph API result, so the admin can diagnose why auto-posting isn't working.
export async function POST() {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error
  const result = await testFacebookConnection(STORE_NAME)
  return Response.json(result, { status: result.ok ? 200 : 400 })
}
