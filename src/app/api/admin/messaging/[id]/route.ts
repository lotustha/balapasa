import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppText } from '@/lib/whatsapp'
import { sendMessengerText } from '@/lib/messenger'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params
  try {
    const conv = await prisma.conversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!conv) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ conversation: conv })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  try {
    const { text } = await req.json() as { text: string }
    if (!text?.trim()) return Response.json({ error: 'text required' }, { status: 400 })

    const conv = await prisma.conversation.findUnique({ where: { id } })
    if (!conv) return Response.json({ error: 'Not found' }, { status: 404 })

    let extId: string | null = null
    if (conv.platform === 'WHATSAPP' && conv.customerPhone) {
      extId = await sendWhatsAppText(conv.customerPhone, text)
    } else if (conv.platform === 'MESSENGER') {
      extId = await sendMessengerText(conv.customerId, text)
    }

    const message = await prisma.message.create({
      data: {
        conversationId: id, direction: 'OUT', content: text,
        externalId: extId ?? undefined,
        status: extId ? 'SENT' : 'FAILED',
      },
    })
    await prisma.conversation.update({ where: { id }, data: { lastMessageAt: new Date() } })

    return Response.json({ message })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  try {
    const { status } = await req.json() as { status: string }
    const conv = await prisma.conversation.update({ where: { id }, data: { status } })
    return Response.json({ conversation: conv })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
