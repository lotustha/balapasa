import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { redeemPoints, LoyaltyRedeemError } from '@/lib/loyalty'

// POST /api/account/loyalty/redeem  { points: number }
// Converts points to store credit (atomic: points debited + wallet credited).
// Bearer or cookie. Returns the new points + credit balances.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const { points } = await req.json()
    const result = await redeemPoints(user.sub, points)
    return Response.json(result)
  } catch (e) {
    if (e instanceof LoyaltyRedeemError) {
      return Response.json({ error: e.message }, { status: e.status })
    }
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
