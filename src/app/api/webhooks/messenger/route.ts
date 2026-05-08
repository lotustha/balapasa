import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/appSettings'
import { getMessengerProfile } from '@/lib/messenger'

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entries = body?.entry ?? []

    for (const entry of entries) {
      for (const event of entry?.messaging ?? []) {
        if (!event.message?.text) continue
        const psid = String(event.sender?.id)
        const text = event.message.text as string
        const mid  = event.message.mid as string

        // Try get profile name (may fail without token)
        const profile = await getMessengerProfile(psid).catch(() => null)
        const name = profile?.name ?? psid

        const conv = await prisma.conversation.upsert({
          where:  { platform_customerId: { platform: 'MESSENGER', customerId: psid } },
          create: { platform: 'MESSENGER', customerId: psid, customerName: name, lastMessageAt: new Date() },
          update: { customerName: name, lastMessageAt: new Date(), status: 'OPEN' },
        })

        await prisma.message.create({
          data: { conversationId: conv.id, direction: 'IN', content: text, externalId: mid },
        })
      }
    }
  } catch (e) {
    console.error('[webhook/messenger]', e)
  }
  return new Response('OK', { status: 200 })
}
