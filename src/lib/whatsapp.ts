import { getSetting } from './appSettings'
import { STORE_NAME, STORE_URL } from './config'

const WA_BASE = 'https://graph.facebook.com/v19.0'

async function creds() {
  const [token, phoneId] = await Promise.all([
    getSetting('WHATSAPP_ACCESS_TOKEN'),
    getSetting('WHATSAPP_PHONE_NUMBER_ID'),
  ])
  return { token, phoneId }
}

/** Send a pre-approved WhatsApp template message */
export async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  components: { type: 'body'; parameters: { type: 'text'; text: string }[] }[],
) {
  const { token, phoneId } = await creds()
  if (!token || !phoneId) { console.warn('[WA] credentials not configured'); return null }

  // Normalize phone: ensure + prefix, no spaces/dashes
  const to = phone.replace(/[\s\-()]/g, '').replace(/^0/, '+977')
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: { name: templateName, language: { code: 'en' }, components },
  }

  try {
    const res = await fetch(`${WA_BASE}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { console.error('[WA] template send failed:', data); return null }
    return data.messages?.[0]?.id ?? null
  } catch (e) {
    console.error('[WA] network error:', e)
    return null
  }
}

/** Send a plain text message within a 24-hour customer-initiated session */
export async function sendWhatsAppText(phone: string, text: string) {
  const { token, phoneId } = await creds()
  if (!token || !phoneId) return null

  const to = phone.replace(/[\s\-()]/g, '').replace(/^0/, '+977')
  try {
    const res = await fetch(`${WA_BASE}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
    })
    const data = await res.json()
    return res.ok ? (data.messages?.[0]?.id ?? null) : null
  } catch { return null }
}

/** Mark an incoming message as read */
export async function markWhatsAppRead(messageId: string) {
  const { token, phoneId } = await creds()
  if (!token || !phoneId) return
  await fetch(`${WA_BASE}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }),
  }).catch(() => {})
}

// ── Convenience order notification senders ────────────────────────────────

export async function waOrderConfirmed(phone: string, name: string, orderId: string, total: number) {
  return sendWhatsAppTemplate(phone, 'order_confirmation', [{
    type: 'body',
    parameters: [
      { type: 'text', text: name },
      { type: 'text', text: '#' + orderId.slice(-8).toUpperCase() },
      { type: 'text', text: `NPR ${total.toLocaleString()}` },
    ],
  }])
}

export async function waOrderShipped(phone: string, orderId: string, trackingUrl: string) {
  return sendWhatsAppTemplate(phone, 'order_shipped', [{
    type: 'body',
    parameters: [
      { type: 'text', text: '#' + orderId.slice(-8).toUpperCase() },
      { type: 'text', text: trackingUrl },
    ],
  }])
}

export async function waAbandonedCart(phone: string, name: string) {
  return sendWhatsAppTemplate(phone, 'abandoned_cart', [{
    type: 'body',
    parameters: [
      { type: 'text', text: name || 'there' },
      { type: 'text', text: STORE_URL + '/cart' },
    ],
  }])
}

export { STORE_NAME }
