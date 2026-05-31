import { NextRequest } from 'next/server'
import { runAbandonedCartRecovery } from '@/lib/abandoned-cart'

// Reading headers/query forces dynamic anyway; cheap insurance against caching.
export const dynamic = 'force-dynamic'

// POST (or GET, for easy curl) /api/cron/abandoned-carts
// Sends recovery reminders for carts left unpaid past their window. Idempotent
// — safe to run on a frequent schedule (e.g. hourly). Auth mirrors the billing
// cron: a CRON_SECRET in process.env, via `Authorization: Bearer <secret>` or
// `?token=<secret>`.
function authorize(req: NextRequest): Response | null {
  const secret = process.env.CRON_SECRET
  if (!secret) return Response.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const token = req.nextUrl.searchParams.get('token')
  if (bearer !== secret && token !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function POST(req: NextRequest) {
  const denied = authorize(req)
  if (denied) return denied
  return Response.json({ ok: true, ...(await runAbandonedCartRecovery()) })
}

export async function GET(req: NextRequest) {
  const denied = authorize(req)
  if (denied) return denied
  return Response.json({ ok: true, ...(await runAbandonedCartRecovery()) })
}
