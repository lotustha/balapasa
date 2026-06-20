import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { sendWhatsAppText, sendWhatsAppMedia } from '@/lib/whatsapp'
import { sendMessengerText, sendMessengerMedia } from '@/lib/messenger'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Ctx) {
  const auth = await requireRole('STAFF')
  if ('error' in auth) return auth.error

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
  const auth = await requireRole('STAFF')
  if ('error' in auth) return auth.error

  const { id } = await params
  try {
    const { text, mediaUrl, mediaType } = await req.json() as {
      text?: string
      mediaUrl?: string
      mediaType?: 'image' | 'video'
    }
    const trimmed = text?.trim() ?? ''
    // Allow media-only OR text-only messages, but not an empty one.
    if (!trimmed && !mediaUrl) return Response.json({ error: 'text or media required' }, { status: 400 })

    const conv = await prisma.conversation.findUnique({ where: { id } })
    if (!conv) return Response.json({ error: 'Not found' }, { status: 404 })

    const kind: 'image' | 'video' = mediaType === 'video' ? 'video' : 'image'
    let extId: string | null = null

    if (conv.platform === 'WHATSAPP' && conv.customerPhone) {
      if (mediaUrl) extId = await sendWhatsAppMedia(conv.customerPhone, kind, mediaUrl, trimmed || undefined)
      else          extId = await sendWhatsAppText(conv.customerPhone, trimmed)
    } else if (conv.platform === 'MESSENGER') {
      // Messenger sends media and text as separate messages; the media id wins
      // for the stored externalId, and the caption follows as a text bubble.
      if (mediaUrl) {
        extId = await sendMessengerMedia(conv.customerId, kind, mediaUrl)
        if (trimmed) await sendMessengerText(conv.customerId, trimmed)
      } else {
        extId = await sendMessengerText(conv.customerId, trimmed)
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        direction: 'OUT',
        content: trimmed,
        mediaUrl:  mediaUrl || undefined,
        mediaType: mediaUrl ? kind : undefined,
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
  const auth = await requireRole('STAFF')
  if ('error' in auth) return auth.error

  const { id } = await params
  try {
    const { status } = await req.json() as { status: string }
    const conv = await prisma.conversation.update({ where: { id }, data: { status } })
    return Response.json({ conversation: conv })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
