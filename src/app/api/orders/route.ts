import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { esewaFormData, ESEWA_PAYMENT_URL, khaltiInitiate } from '@/lib/payment'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    // Auth is optional — guest checkout is allowed
    let userId: string | null = null
    let userEmail: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId    = user?.id    ?? null
      userEmail = user?.email ?? null
    } catch { /* Supabase not configured or user not logged in */ }

    const body = await req.json()
    const { items, subtotal, deliveryCharge, total, paymentMethod, shippingOption, name, phone, email, address, house, road, city } = body

    const order = await prisma.order.create({
      data: {
        userId,
        subtotal,
        deliveryCharge,
        total,
        paymentMethod,
        shippingOption,
        name,
        phone,
        email: email || userEmail || null,
        address,
        house,
        road,
        city,
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

    // Auto-deduct stock for tracked products (best-effort, don't block order)
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
        amount:        total,    // khaltiInitiate converts to paisa internally
        customerName:  name,
        customerEmail: email || userEmail || 'customer@balapasa.com',
        customerPhone: phone,
      })

      if (khalti.error || !khalti.payment_url) {
        // Clean up the order so it doesn't linger in PENDING state
        await prisma.order.delete({ where: { id: order.id } }).catch(() => {})
        return Response.json(
          { error: `Khalti initiation failed: ${khalti.error ?? 'no payment_url'}` },
          { status: 502 },
        )
      }

      // Store pidx so the verify route can look it up by purchase_order_id
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
    let user = null
    try {
      const supabase = await createClient()
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch { /* Supabase not configured */ }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })
    return Response.json({ orders })
  } catch {
    return Response.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
