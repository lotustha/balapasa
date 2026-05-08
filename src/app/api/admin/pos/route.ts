import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

interface POSItem { id: string; name: string; price: number; quantity: number; image?: string }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      items: POSItem[]
      subtotal: number; total: number; deliveryCharge?: number
      paymentMethod: string  // COD | ESEWA | KHALTI | CASH
      customerName?: string; customerPhone?: string
      discount?: number; notes?: string
    }
    const { items, subtotal, total, paymentMethod, customerName, customerPhone, discount, notes } = body

    if (!items?.length) return Response.json({ error: 'No items' }, { status: 400 })

    const order = await prisma.order.create({
      data: {
        source: 'POS',
        name:    customerName  ?? 'Walk-in Customer',
        phone:   customerPhone ?? '0000000000',
        address: 'In-store',
        city:    'Kathmandu',
        email:   null,
        subtotal, total,
        deliveryCharge: 0,
        paymentMethod:  paymentMethod as 'COD',
        paymentStatus:  ['COD', 'CASH'].includes(paymentMethod) ? 'PAID' : 'UNPAID',
        status: 'DELIVERED',
        couponDiscount: discount ?? null,
        notes: notes ?? null,
        items: {
          create: items.map(i => ({
            productId: i.id, name: i.name,
            price: i.price, quantity: i.quantity, image: i.image ?? null,
          })),
        },
      },
    })

    // Deduct stock
    for (const item of items) {
      const p = await prisma.product.findUnique({ where: { id: item.id }, select: { stock: true, trackInventory: true } })
      if (!p?.trackInventory) continue
      const newStock = Math.max(0, p.stock - item.quantity)
      await prisma.product.update({ where: { id: item.id }, data: { stock: newStock } })
      await prisma.inventoryLog.create({
        data: { productId: item.id, type: 'SALE', quantity: -item.quantity, stockAfter: newStock, referenceId: order.id, note: 'POS sale' },
      })
    }

    return Response.json({ orderId: order.id }, { status: 201 })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
