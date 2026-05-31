import { getCurrentUser } from '@/lib/auth'
import { getLoyaltySummary } from '@/lib/loyalty'

// GET /api/account/loyalty — the signed-in customer's points balance, lifetime
// total, recent ledger, and the active earn/redeem config. Bearer or cookie.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const summary = await getLoyaltySummary(user.sub)
    return Response.json(summary)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg, balance: 0, lifetimePoints: 0, transactions: [] }, { status: 500 })
  }
}
