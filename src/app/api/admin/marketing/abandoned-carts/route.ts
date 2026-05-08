import { prisma } from '@/lib/prisma'
import { waAbandonedCart } from '@/lib/whatsapp'

export async function GET() {
  try {
    const carts = await prisma.cartAbandonment.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
    return Response.json({ carts })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

// POST: Trigger reminders for eligible abandoned carts (call from admin or cron)
export async function POST() {
  try {
    const eligible = await prisma.cartAbandonment.findMany({
      where: { reminded: false, expiresAt: { lt: new Date() } },
    })

    let sent = 0
    for (const cart of eligible) {
      const msgId = await waAbandonedCart(cart.phone, cart.name ?? '').catch(() => null)
      await prisma.cartAbandonment.update({
        where: { id: cart.id },
        data:  { reminded: true },
      })
      if (msgId) sent++
    }

    return Response.json({ sent, total: eligible.length })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
