import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { processPndWebhookEvent, type PndWebhookEvent } from '@/lib/pickndrop-webhook'

// Pick & Drop pushes events here. Returns 200 even on "no match" so PnD
// doesn't retry forever for stale tracking numbers. Returns 401 only when an
// HMAC signature was provided AND failed validation — never blocks on
// missing signature (some PnD environments send unsigned events).

export async function POST(req: NextRequest) {
  // Read raw body once — needed for HMAC validation.
  const raw = await req.text()

  // Validate HMAC signature when present. We accept several common header
  // names since the PnD docs don't pin one down; expand if needed.
  const signature =
    req.headers.get('x-webhook-signature') ??
    req.headers.get('x-pickndrop-signature') ??
    req.headers.get('x-signature') ??
    null

  if (signature) {
    const row = await prisma.logisticsSettings.findUnique({
      where: { provider: 'PICKNDROP' },
      select: { webhookSecret: true },
    }).catch(() => null)

    const secret = row?.webhookSecret?.trim()
    if (!secret) {
      console.warn('[webhooks/pickndrop] signature present but no webhookSecret configured')
      return Response.json({ error: 'Webhook not configured' }, { status: 401 })
    }

    if (!verifySignature(raw, signature, secret)) {
      console.warn('[webhooks/pickndrop] invalid signature header=', signature.slice(0, 16))
      return Response.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } else {
    console.warn('[webhooks/pickndrop] no signature header — accepting (PnD may send unsigned)')
  }

  let event: PndWebhookEvent
  try {
    event = JSON.parse(raw) as PndWebhookEvent
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!event?.tracking_number || !event?.status) {
    return Response.json({ error: 'Missing tracking_number or status' }, { status: 400 })
  }

  try {
    const result = await processPndWebhookEvent(event)
    if (!result.matched) {
      // 200 + matched:false so PnD logs it as delivered (no retries).
      console.warn(`[webhooks/pickndrop] no order for tracking_number=${event.tracking_number}`)
    } else {
      console.log(`[webhooks/pickndrop] processed orderId=${result.orderId} status=${event.status} advanced=${result.advanced ?? 'none'} notif=${result.notifications.join(',') || 'none'}`)
    }
    return Response.json({ ok: true, ...result })
  } catch (e) {
    console.error('[webhooks/pickndrop] processing failed:', e)
    // Still return 200 so PnD doesn't endlessly retry a payload that breaks us;
    // the audit row would already be inside processPndWebhookEvent unless the
    // failure happened before persist. Logged for ops.
    return Response.json({ ok: false, error: String(e) }, { status: 200 })
  }
}

// Constant-time comparison of an `sha256=<hex>` or raw-hex signature against
// HMAC-SHA256(raw, secret). Accepts both shapes so we're robust to PnD's
// formatting variations.
function verifySignature(raw: string, signature: string, secret: string): boolean {
  const cleaned = signature.startsWith('sha256=') ? signature.slice(7) : signature
  const expected = crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex')
  if (cleaned.length !== expected.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(cleaned, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}
