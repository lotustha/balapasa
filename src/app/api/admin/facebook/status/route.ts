import { requireRole } from '@/lib/auth'
import { isFacebookConfigured } from '@/lib/facebook'

// Tells the product form whether the "Post to Facebook" toggle should appear
// (i.e. a page id + access token are configured).
export async function GET() {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error
  try {
    return Response.json({ configured: await isFacebookConfigured() })
  } catch {
    return Response.json({ configured: false })
  }
}
