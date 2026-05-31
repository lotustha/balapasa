import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { runAbandonedCartRecovery } from '@/lib/abandoned-cart'

export async function GET() {
  const auth = await requireRole('STAFF')
  if ('error' in auth) return auth.error
  try {
    const carts = await prisma.cartAbandonment.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
    return Response.json({ carts })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

// POST: manually trigger reminders from the admin marketing panel. Shares the
// exact recovery engine the cron uses (WhatsApp + best-effort email).
export async function POST() {
  const auth = await requireRole('STAFF')
  if ('error' in auth) return auth.error
  try {
    const { total, whatsapp, email } = await runAbandonedCartRecovery()
    return Response.json({ sent: whatsapp, email, total })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
