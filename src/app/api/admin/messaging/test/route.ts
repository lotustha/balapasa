import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// Creates a simulated incoming message — for testing the inbox without a live webhook
export async function POST(req: NextRequest) {
  try {
    const { platform = 'WHATSAPP', phone = '+977 9800000000', name = 'Test Customer', text = 'Hello! Is this product available?' } = await req.json().catch(() => ({}))

    const customerId = platform === 'WHATSAPP' ? phone.replace(/\s/g, '') : 'test_psid_' + Date.now()

    const conv = await prisma.conversation.upsert({
      where:  { platform_customerId: { platform, customerId } },
      create: { platform, customerId, customerName: name, customerPhone: phone, status: 'OPEN', lastMessageAt: new Date() },
      update: { status: 'OPEN', lastMessageAt: new Date() },
    })

    await prisma.message.create({
      data: { conversationId: conv.id, direction: 'IN', content: text, externalId: 'test_' + Date.now(), status: 'SENT' },
    })

    return Response.json({ success: true, conversationId: conv.id })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
