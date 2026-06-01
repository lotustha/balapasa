import { NextRequest } from 'next/server'
import { runBackInStockNotifications } from '@/lib/back-in-stock'

// Reading headers/query forces dynamic anyway; cheap insurance against caching.
export const dynamic = 'force-dynamic'

// POST (or GET, for easy curl) /api/cron/back-in-stock
// Emails customers whose subscribed products are back in stock. Idempotent —
// `notifiedAt` guards against re-sends — so safe on a frequent schedule (hourly).
// Auth mirrors the billing / abandoned-cart crons: a CRON_SECRET in process.env,
// via `Authorization: Bearer <secret>` or `?token=<secret>`.
function authorize(req: NextRequest): Response | null {
  const secret = process.env.CRON_SECRET
  if (!secret) return Response.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const token  = req.nextUrl.searchParams.get('token')
  if (bearer !== secret && token !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function POST(req: NextRequest) {
  const denied = authorize(req)
  if (denied) return denied
  return Response.json({ ok: true, ...(await runBackInStockNotifications()) })
}

export async function GET(req: NextRequest) {
  const denied = authorize(req)
  if (denied) return denied
  return Response.json({ ok: true, ...(await runBackInStockNotifications()) })
}
