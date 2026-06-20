import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/appSettings'
import { getMessengerProfile } from '@/lib/messenger'
import { downloadAndSave, abs } from '@/lib/chatMedia'
import { pushToStaff } from '@/lib/push'

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
        const message = event.message
        if (!message) continue
        // Skip echoes of our own outbound messages (carry is_echo + a mid we may
        // already have stored as an OUT row).
        if (message.is_echo) continue

        const text        = (message.text as string) ?? ''
        const attachments = (message.attachments as { type: string; payload?: { url?: string } }[]) ?? []
        // First image/video attachment becomes the message media (P1 = one media/msg).
        const mediaAtt = attachments.find(a => a.type === 'image' || a.type === 'video')
        if (!text && !mediaAtt) continue

        const psid = String(event.sender?.id)
        const mid  = event.message.mid as string

        // Idempotency: Meta retries the webhook on slow responses → skip duplicates.
        if (mid) {
          const dup = await prisma.message.findFirst({ where: { externalId: mid }, select: { id: true } })
          if (dup) continue
        }

        // Try get profile name (may fail without token)
        const profile = await getMessengerProfile(psid).catch(() => null)
        const name = profile?.name ?? psid

        // Messenger attachment urls are PUBLIC — no token needed to download.
        let media: { url: string; kind: string; mime: string } | null = null
        if (mediaAtt?.payload?.url) {
          const saved = await downloadAndSave(mediaAtt.payload.url, { baseName: name })
          if (saved) media = { url: saved.url, kind: saved.kind, mime: saved.mimeType }
        }

        const conv = await prisma.conversation.upsert({
          where:  { platform_customerId: { platform: 'MESSENGER', customerId: psid } },
          create: { platform: 'MESSENGER', customerId: psid, customerName: name, lastMessageAt: new Date() },
          update: { customerName: name, lastMessageAt: new Date(), status: 'OPEN' },
        })

        await prisma.message.create({
          data: {
            conversationId: conv.id,
            direction: 'IN',
            content: text,
            mediaUrl:  media?.url,
            mediaType: media?.kind,
            mediaMime: media?.mime,
            externalId: mid,
          },
        })

        const preview = text || (media?.kind === 'video' ? '🎬 Video' : media ? '📷 Photo' : 'New message')
        pushToStaff({
          title: `Messenger · ${name}`,
          body:  preview,
          imageUrl: media?.kind === 'image' && media.url ? abs(media.url) : undefined,
          data: { type: 'chat', conversationId: conv.id, platform: 'MESSENGER' },
        }).catch(() => {})
      }
    }
  } catch (e) {
    console.error('[webhook/messenger]', e)
  }
  return new Response('OK', { status: 200 })
}
