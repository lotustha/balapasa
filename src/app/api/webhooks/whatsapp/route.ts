import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/appSettings'
import { markWhatsAppRead } from '@/lib/whatsapp'
import { downloadAndSave, abs } from '@/lib/chatMedia'
import { pushToStaff } from '@/lib/push'

const WA_BASE = 'https://graph.facebook.com/v19.0'

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

// Resolve a WhatsApp media id → temporary CDN url (auth-gated), then mirror it
// into our own /uploads store. Both the metadata GET and the CDN download need
// the access token. Returns { url, kind, mime } or null.
async function fetchWhatsAppMedia(
  mediaId: string,
  accessToken: string,
  baseName?: string,
): Promise<{ url: string; kind: string; mime: string } | null> {
  try {
    const metaRes = await fetch(`${WA_BASE}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!metaRes.ok) { console.error('[webhook/whatsapp] media meta failed', metaRes.status); return null }
    const meta = await metaRes.json() as { url?: string; mime_type?: string }
    if (!meta.url) return null
    const saved = await downloadAndSave(meta.url, { authToken: accessToken, baseName, contentTypeHint: meta.mime_type })
    if (!saved) return null
    return { url: saved.url, kind: saved.kind, mime: saved.mimeType }
  } catch (e) {
    console.error('[webhook/whatsapp] media fetch error', e)
    return null
  }
}

// POST: Receive incoming WhatsApp messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entry = body?.entry?.[0]
    const change = entry?.changes?.[0]?.value
    const messages = change?.messages ?? []
    const contacts = change?.contacts ?? []

    // Lazily resolve the access token only when a media message arrives.
    let accessToken: string | null = null

    for (const msg of messages) {
      const phone = msg.from
      const extId = msg.id

      // Idempotency: Meta retries the webhook on slow responses (media download
      // can be slow), which would duplicate rows + files. Skip if we've already
      // stored this message id.
      if (extId) {
        const dup = await prisma.message.findFirst({ where: { externalId: extId }, select: { id: true } })
        if (dup) continue
      }

      // Find contact info
      const contact = contacts.find((c: { wa_id: string }) => c.wa_id === phone)
      const name    = contact?.profile?.name ?? phone

      // Resolve text + optional media payload by message type.
      let text = ''
      let media: { url: string; kind: string; mime: string } | null = null

      if (msg.type === 'text') {
        text = msg.text?.body ?? ''
      } else if (msg.type === 'image' || msg.type === 'video') {
        const part   = msg.type === 'image' ? msg.image : msg.video
        text = part?.caption ?? ''
        const mediaId = part?.id
        if (mediaId) {
          if (!accessToken) accessToken = await getSetting('WHATSAPP_ACCESS_TOKEN')
          if (accessToken) {
            media = await fetchWhatsAppMedia(mediaId, accessToken, name)
          }
        }
        // If the media couldn't be fetched, still record the message with the
        // caption (or a placeholder) so staff at least see something arrived.
        if (!media && !text) text = msg.type === 'image' ? '📷 Photo' : '🎬 Video'
      } else {
        // Unsupported type (audio, document, sticker, location, …) — skip for P1.
        continue
      }

      // Upsert conversation
      const conv = await prisma.conversation.upsert({
        where:  { platform_customerId: { platform: 'WHATSAPP', customerId: phone } },
        create: { platform: 'WHATSAPP', customerId: phone, customerName: name, customerPhone: phone, lastMessageAt: new Date() },
        update: { customerName: name, lastMessageAt: new Date(), status: 'OPEN' },
      })

      // Save message
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          direction: 'IN',
          content: text,
          mediaUrl:  media?.url,
          mediaType: media?.kind,
          mediaMime: media?.mime,
          externalId: extId,
        },
      })

      // Mark as read
      markWhatsAppRead(extId).catch(() => {})

      // Notify staff devices (fire-and-forget).
      const preview = text || (media?.kind === 'video' ? '🎬 Video' : '📷 Photo')
      pushToStaff({
        title: `WhatsApp · ${name}`,
        body:  preview,
        imageUrl: media?.kind === 'image' && media.url ? abs(media.url) : undefined,
        data: { type: 'chat', conversationId: conv.id, platform: 'WHATSAPP' },
      }).catch(() => {})
    }
  } catch (e) {
    console.error('[webhook/whatsapp]', e)
  }

  // Always return 200 — Meta retries on non-200
  return new Response('OK', { status: 200 })
}
