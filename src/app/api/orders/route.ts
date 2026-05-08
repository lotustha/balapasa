import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { esewaFormData, ESEWA_PAYMENT_URL, khaltiInitiate } from '@/lib/payment'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null
    let userEmail: string | null = null
    try {
      const token = req.cookies.get(AUTH_COOKIE)?.value
      if (token) {
        const payload = await verifyToken(token)
        userId    = payload?.sub    ?? null
        userEmail = payload?.email  ?? null
      }
    } catch { /* guest checkout */ }

    const body = await req.json()
    const { items, subtotal, deliveryCharge, total, paymentMethod, shippingOption, shippingProvider, name, phone, email, address, house, road, city, lat, lng, advancePaid, codAmount, advanceMethod } = body

    const order = await prisma.order.create({
      data: {
        userId,
        subtotal,
        deliveryCharge,
        total,
        paymentMethod,
        shippingOption,
        shippingProvider: shippingProvider ?? null,
        name,
        phone,
        email: email || userEmail || null,
        address,
        house,
        road,
        city,
        lat:          lat          ? Number(lat)          : null,
        lng:          lng          ? Number(lng)          : null,
        advancePaid:  advancePaid  ? Number(advancePaid)  : null,
        codAmount:    codAmount    ? Number(codAmount)    : null,
        advanceMethod: advanceMethod || null,
        items: {
          create: items.map((item: {
            id: string; name: string; price: number; salePrice?: number | null;
            image: string; quantity: number;
          }) => ({
            productId: item.id,
            name: item.name,
            price: item.salePrice ?? item.price,
            quantity: item.quantity,
            image: item.image,
          })),
        },
      },
    })

    try {
      for (const item of items as { id: string; quantity: number }[]) {
        const product = await prisma.product.findUnique({
          where: { id: item.id },
          select: { stock: true, trackInventory: true },
        })
        if (!product || !product.trackInventory) continue

        const newStock = Math.max(0, product.stock - item.quantity)
        await prisma.product.update({ where: { id: item.id }, data: { stock: newStock } })
        await prisma.inventoryLog.create({
          data: {
            productId:   item.id,
            type:        'SALE',
            quantity:    -item.quantity,
            stockAfter:  newStock,
            referenceId: order.id,
            note:        `Order ${order.id.slice(0, 8).toUpperCase()}`,
          },
        })
      }
    } catch (e) {
      console.warn('[orders] stock deduction failed (non-fatal):', e)
    }

    if (paymentMethod === 'ESEWA') {
      const esewaData = esewaFormData(order.id, subtotal, deliveryCharge)
      return Response.json({ orderId: order.id, esewaData, esewaUrl: ESEWA_PAYMENT_URL })
    }

    if (paymentMethod === 'KHALTI') {
      const khalti = await khaltiInitiate({
        orderId:       order.id,
        orderName:     `Balapasa Order ${order.id.slice(0, 8)}`,
        amount:        total,
        customerName:  name,
        customerEmail: email || userEmail || 'customer@balapasa.com',
        customerPhone: phone,
      })

      if (khalti.error || !khalti.payment_url) {
        await prisma.order.delete({ where: { id: order.id } }).catch(() => {})
        return Response.json(
          { error: `Khalti initiation failed: ${khalti.error ?? 'no payment_url'}` },
          { status: 502 },
        )
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { transactionId: khalti.pidx },
      })
      return Response.json({ orderId: order.id, paymentUrl: khalti.payment_url })
    }

    return Response.json({ orderId: order.id, status: 'success' }, { status: 201 })
  } catch (e) {
    console.error('[orders] create failed:', e)
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json(
      { error: process.env.NODE_ENV === 'development' ? msg : 'Failed to create order' },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyToken(token)
    if (!payload) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const orders = await prisma.order.findMany({
      where: { userId: payload.sub },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })
    return Response.json({ orders })
  } catch {
    return Response.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
