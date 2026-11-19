// Server-side client for the local WhatsApp bot service (tools/wa-notifier). The service only
// listens on 127.0.0.1, so these calls work on the server that runs it and nowhere else.

export interface WaBotStatus {
  connected: boolean
  me: string | null
  pairing: { number: string; code: string; requestedAt: string } | null
  qr: string | null
  commanders: string[]
}

export type WaBotResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string }

export function waBotConfigured(): boolean {
  return Boolean(process.env.WA_NOTIFY_URL && process.env.WA_NOTIFY_TOKEN)
}

export async function waBot<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<WaBotResult<T>> {
  if (!waBotConfigured()) return { ok: false, status: 503, error: 'The WhatsApp bot is not set up on this server.' }
  try {
    const res = await fetch(`${process.env.WA_NOTIFY_URL!.replace(/\/$/, '')}${path}`, {
      method: init.method ?? 'GET',
      headers: { Authorization: `Bearer ${process.env.WA_NOTIFY_TOKEN}`, 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
      signal: AbortSignal.timeout(40_000),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, status: res.status, error: (data as { error?: string }).error ?? `Bot service answered ${res.status}` }
    return { ok: true, data: data as T }
  } catch {
    return { ok: false, status: 502, error: 'The WhatsApp bot service is not running.' }
  }
}

export function waBotResponse<T>(result: WaBotResult<T>): Response {
  return result.ok ? Response.json(result.data) : Response.json({ error: result.error }, { status: result.status })
}

export interface OrderAlert {
  code: string
  express: boolean
  customer: string
  phone: string
  total: number
  paymentMethod: string
  shipping: string | null
  address: string
  items: { name: string; quantity: number }[]
  adminUrl: string
}

const MAX_ALERT_ITEMS = 8

export function newOrderText(o: OrderAlert): string {
  const shown = o.items.slice(0, MAX_ALERT_ITEMS).map(i => `- ${i.quantity} x ${i.name.slice(0, 70)}`)
  if (o.items.length > MAX_ALERT_ITEMS) shown.push(`- and ${o.items.length - MAX_ALERT_ITEMS} more`)
  return [
    o.express ? `NEW EXPRESS ORDER ${o.code} (dispatch today)` : `NEW ORDER ${o.code}`,
    `${o.customer}, ${o.phone}`,
    `Rs. ${Math.round(o.total).toLocaleString('en-IN')} | ${o.paymentMethod}${o.shipping ? ` | ${o.shipping}` : ''}`,
    o.address,
    '',
    ...shown,
    '',
    o.adminUrl,
  ].join('\n')
}

// Tells the bot's commanding numbers about a new order. Never throws and never delays the checkout.
export async function sendOrderAlert(order: OrderAlert): Promise<void> {
  if (!waBotConfigured()) return
  const result = await waBot('/send', { method: 'POST', body: { text: newOrderText(order) } })
  if (!result.ok) console.warn('[orders] WhatsApp order alert not sent:', result.error)
}
