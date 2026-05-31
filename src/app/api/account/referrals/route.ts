import { getCurrentUser } from '@/lib/auth'
import { getReferralSummary } from '@/lib/referral'
import { getSiteSettings } from '@/lib/site-settings'

// GET /api/account/referrals — the signed-in customer's referral code, a
// ready-to-share link (built from the store URL, not the request host), the
// reward config, and the people they've referred. Bearer or cookie.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const [summary, settings] = await Promise.all([getReferralSummary(user.sub), getSiteSettings()])
    const shareUrl = `${settings.storeUrl}/register?ref=${encodeURIComponent(summary.code)}`
    return Response.json({ ...summary, shareUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg, code: null, shareUrl: '', referrals: [] }, { status: 500 })
  }
}
