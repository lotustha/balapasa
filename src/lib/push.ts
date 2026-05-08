/**
 * Firebase Cloud Messaging — HTTP v1 API sender
 *
 * Setup (one-time):
 *  1. Firebase Console → Project Settings → Service accounts → Generate new private key
 *  2. Add to .env.local:
 *       FCM_PROJECT_ID=your-project-id
 *       FCM_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
 *       FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 */

import { prisma } from './prisma'

const FCM_PROJECT_ID  = process.env.FCM_PROJECT_ID  ?? ''
const FCM_CLIENT_EMAIL= process.env.FCM_CLIENT_EMAIL ?? ''
const FCM_PRIVATE_KEY = (process.env.FCM_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')

const FCM_SEND_URL = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`
const TOKEN_URL    = 'https://oauth2.googleapis.com/token'

// In-memory access token cache
let _accessToken:  string | null = null
let _tokenExpiry:  number        = 0

async function getAccessToken(): Promise<string | null> {
  if (!FCM_PROJECT_ID || !FCM_CLIENT_EMAIL || !FCM_PRIVATE_KEY) return null
  if (_accessToken && Date.now() < _tokenExpiry - 60_000) return _accessToken

  // Build JWT for service account auth (RS256)
  const now    = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const claim  = Buffer.from(JSON.stringify({
    iss: FCM_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: TOKEN_URL,
    exp: now + 3600, iat: now,
  })).toString('base64url')

  const { createSign } = await import('crypto')
  const sig = createSign('RSA-SHA256')
    .update(`${header}.${claim}`)
    .sign(FCM_PRIVATE_KEY, 'base64url')

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
  const accessToken = await getAccessToken()
  if (!accessToken) return false   // FCM not configured → silently skip

  const res = await fetch(FCM_SEND_URL, {
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
