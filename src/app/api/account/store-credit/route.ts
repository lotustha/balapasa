import { getCurrentUser } from '@/lib/auth'
import { getStoreCreditSummary } from '@/lib/store-credit'

// GET /api/account/store-credit — the signed-in customer's wallet balance and
// transaction history. Bearer (mobile) or cookie (web). Returns a zero balance
// with an empty ledger for users who have never received credit.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const summary = await getStoreCreditSummary(user.sub)
    return Response.json(summary)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg, balance: 0, transactions: [] }, { status: 500 })
  }
}
