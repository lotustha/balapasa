import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/appSettings'
import { markWhatsAppRead } from '@/lib/whatsapp'

// GET: Meta webhook verification handshake
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = await getSetting('WHATSAPP_WEBHOOK_VERIFY_TOKEN')
  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// POST: Receive incoming WhatsApp messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entry = body?.entry?.[0]
    const change = entry?.changes?.[0]?.value
    const messages = change?.messages ?? []
    const contacts = change?.contacts ?? []

    for (const msg of messages) {
      if (msg.type !== 'text') continue
      const phone = msg.from
      const text  = msg.text?.body ?? ''
      const extId = msg.id

      // Find contact info
      const contact = contacts.find((c: { wa_id: string }) => c.wa_id === phone)
      const name    = contact?.profile?.name ?? phone

      // Upsert conversation
      const conv = await prisma.conversation.upsert({
        where:  { platform_customerId: { platform: 'WHATSAPP', customerId: phone } },
        create: { platform: 'WHATSAPP', customerId: phone, customerName: name, customerPhone: phone, lastMessageAt: new Date() },
        update: { customerName: name, lastMessageAt: new Date(), status: 'OPEN' },
      })

      // Save message
      await prisma.message.create({
        data: { conversationId: conv.id, direction: 'IN', content: text, externalId: extId },
      })

      // Mark as read
      markWhatsAppRead(extId).catch(() => {})
    }
  } catch (e) {
    console.error('[webhook/whatsapp]', e)
  }

  // Always return 200 — Meta retries on non-200
  return new Response('OK', { status: 200 })
}
