/**
 * Firebase Cloud Messaging — HTTP v1 API sender
 *
 * Credentials are admin-editable and live in app_settings (Settings →
 * Notifications → Firebase Cloud Messaging), so changing them takes effect
 * without a redeploy. Env vars (FCM_PROJECT_ID / FCM_CLIENT_EMAIL /
 * FCM_PRIVATE_KEY) are used as a fallback for backward compatibility.
 *
 * Get the values from: Firebase Console → Project Settings → Service accounts
 * → Generate new private key.
 */

import { prisma } from './prisma'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

// ── DB-backed credentials (cached 30s; busted on settings save) ───────────────
interface FcmConfig { projectId: string; clientEmail: string; privateKey: string }

const FCM_CACHE_TTL_MS = 30_000
let _fcmCache:    { value: FcmConfig; expiresAt: number } | null = null
let _accessToken: string | null = null
let _tokenExpiry: number        = 0

async function getFcmConfig(): Promise<FcmConfig> {
  const now = Date.now()
  if (_fcmCache && _fcmCache.expiresAt > now) return _fcmCache.value

  let rows: { key: string; value: string }[] = []
  try {
    rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM app_settings
      WHERE key IN ('FCM_PROJECT_ID', 'FCM_CLIENT_EMAIL', 'FCM_PRIVATE_KEY')
    `
  } catch (e) {
    console.warn('[push] FCM config DB read failed, using env fallback:', e)
  }
  const db = Object.fromEntries(rows.map(r => [r.key, r.value]))

  const value: FcmConfig = {
    projectId:   db.FCM_PROJECT_ID   || process.env.FCM_PROJECT_ID   || '',
    clientEmail: db.FCM_CLIENT_EMAIL || process.env.FCM_CLIENT_EMAIL || '',
    // Stored keys may use escaped "\n" (env-style) or real newlines — normalise both.
    privateKey:  (db.FCM_PRIVATE_KEY || process.env.FCM_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }
  _fcmCache = { value, expiresAt: now + FCM_CACHE_TTL_MS }
  return value
}

/** Bust the FCM config + access-token caches. Called from the settings save handler. */
export function invalidateFcmConfigCache(): void {
  _fcmCache    = null
  _accessToken = null
  _tokenExpiry = 0
}

async function getAccessToken(cfg: FcmConfig): Promise<string | null> {
  if (!cfg.projectId || !cfg.clientEmail || !cfg.privateKey) return null
  if (_accessToken && Date.now() < _tokenExpiry - 60_000) return _accessToken

  // Build JWT for service account auth (RS256)
  const now    = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const claim  = Buffer.from(JSON.stringify({
    iss: cfg.clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: TOKEN_URL,
    exp: now + 3600, iat: now,
  })).toString('base64url')

  const { createSign } = await import('crypto')
  const sig = createSign('RSA-SHA256')
    .update(`${header}.${claim}`)
    .sign(cfg.privateKey, 'base64url')

  const jwt = `${header}.${claim}.${sig}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!res.ok) { console.error('[push] token fetch failed', res.status); return null }
  const data = await res.json()
  _accessToken = data.access_token
  _tokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000
  return _accessToken
}

export interface PushPayload {
  title:   string
  body:    string
  data?:   Record<string, string>
  imageUrl?: string
}

/** Send to a single FCM token. Returns true if sent. */
export async function sendPush(token: string, payload: PushPayload): Promise<boolean> {
  const cfg         = await getFcmConfig()
  const accessToken = await getAccessToken(cfg)
  if (!accessToken) return false   // FCM not configured → silently skip

  const sendUrl = `https://fcm.googleapis.com/v1/projects/${cfg.projectId}/messages:send`
  const res = await fetch(sendUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: payload.title, body: payload.body, image: payload.imageUrl },
        data: payload.data ?? {},
        android: { notification: { sound: 'default', priority: 'HIGH' } },
        apns:    { payload: { aps: { sound: 'default', badge: 1 } } },
      },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    // Token expired / unregistered → clean up
    if (err.includes('UNREGISTERED') || err.includes('INVALID_ARGUMENT')) {
      await prisma.deviceToken.deleteMany({ where: { token } }).catch(() => {})
    } else {
      console.error('[push] send failed', res.status, err.slice(0, 200))
    }
    return false
  }
  return true
}

/** Send to all registered tokens for a user. Fire-and-forget safe. */
export async function pushToUser(userId: string, payload: PushPayload): Promise<void> {
  const tokens = await prisma.deviceToken.findMany({
    where: { userId },
    select: { token: true },
  })
  await Promise.all(tokens.map(({ token }) => sendPush(token, payload).catch(() => {})))
}

/** Send to every ADMIN/MANAGER/STAFF user's registered devices. Powers the
 *  vendor app's new-order alerts. Fire-and-forget safe. */
export async function pushToStaff(payload: PushPayload): Promise<void> {
  const staff = await prisma.profile.findMany({
    where:  { role: { in: ['ADMIN', 'MANAGER', 'STAFF'] } },
    select: { id: true },
  })
  if (!staff.length) return
  const tokens = await prisma.deviceToken.findMany({
    where:  { userId: { in: staff.map(s => s.id) } },
    select: { token: true },
  })
  await Promise.all(tokens.map(({ token }) => sendPush(token, payload).catch(() => {})))
}

/** Push every staff device when an order's status changes. NOT gated by the
 *  admin email opt-in — the vendor app wants every status transition. */
export async function pushOrderStatusToStaff(orderId: string, status: string): Promise<void> {
  const order = await prisma.order
    .findUnique({ where: { id: orderId }, select: { orderCode: true, name: true } })
    .catch(() => null)
  const ref   = order?.orderCode ?? orderId.slice(0, 6)
  const label = status ? status.charAt(0) + status.slice(1).toLowerCase() : status
  await pushToStaff({
    title: `📦 ${ref} → ${label}`,
    body:  `${order?.name ?? 'Order'} is now ${label}.`,
    data:  { orderId, screen: 'order', type: 'status_change', status },
  }).catch(() => {})
}

/** Send to all registered tokens for a phone-identified guest session.
 *  (Guests don't have userId, so we match by the order's phone—store
 *   guest tokens keyed to phone in a future enhancement.) */
export async function pushOrderEvent(params: {
  userId?:  string | null
  title:    string
  body:     string
  orderId:  string
}): Promise<void> {
  if (!params.userId) return   // guests receive WhatsApp only
  await pushToUser(params.userId, {
    title:   params.title,
    body:    params.body,
    data:    { orderId: params.orderId, screen: 'orders' },
  }).catch(() => {})
}
