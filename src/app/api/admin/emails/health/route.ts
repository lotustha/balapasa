import { getCurrentUser } from '@/lib/auth'
import { getEmailHealth } from '@/lib/email'

// Health probe for the email pipeline. Admin-only. Surfaces why customer
// emails aren't being delivered (missing API key, unverified from-domain,
// invalid key, etc.) without exposing the secret value.
export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const health = await getEmailHealth()
  return Response.json(health)
}
