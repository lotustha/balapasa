// Daraz access tokens live in app_settings so a renewed token survives restarts and redeploys.
// The first run seeds them from the environment (DARAZ_ACCESS_TOKEN / DARAZ_REFRESH_TOKEN / *_EXPIRES_AT).
//
// Renewing rotates the refresh token, so only ONE place may do it: the server sets DARAZ_TOKEN_RENEW=1.
// A developer machine without that flag only ever reads, and cannot rotate production's token away.
import { darazPost } from './api.mjs'

const RENEW_WITHIN_MS = 7 * 24 * 60 * 60 * 1000
const keyFor = shop => `daraz.tokens.${shop}`

export function parseTokenResponse(res, now) {
  if (!res?.access_token) throw new Error('token response has no access_token')
  if (!res.refresh_token) throw new Error('token response has no refresh_token')
  const expiresIn = Number(res.expires_in)
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) throw new Error('token response has no usable expires_in')
  const refreshIn = Number(res.refresh_expires_in)
  return {
    accessToken: res.access_token,
    refreshToken: res.refresh_token,
    expiresAt: now + expiresIn * 1000,
    refreshExpiresAt: Number.isFinite(refreshIn) && refreshIn > 0 ? now + refreshIn * 1000 : 0,
  }
}

// 'use' | 'renew' | 'expired' (cannot renew here) | 'reauthorize' (refresh token is dead too)
export function chooseToken(tokens, now, canRenew) {
  if (tokens.expiresAt - now >= RENEW_WITHIN_MS) return 'use'
  if (!canRenew) return tokens.expiresAt > now ? 'use' : 'expired'
  if (tokens.refreshExpiresAt && tokens.refreshExpiresAt <= now) return 'reauthorize'
  return 'renew'
}

async function save(db, shop, tokens) {
  await db.query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [keyFor(shop), JSON.stringify(tokens)])
}

function fromEnv() {
  const { DARAZ_ACCESS_TOKEN, DARAZ_REFRESH_TOKEN, DARAZ_TOKEN_EXPIRES_AT, DARAZ_REFRESH_EXPIRES_AT } = process.env
  if (!DARAZ_ACCESS_TOKEN || !DARAZ_REFRESH_TOKEN) return null
  return {
    accessToken: DARAZ_ACCESS_TOKEN,
    refreshToken: DARAZ_REFRESH_TOKEN,
    expiresAt: Number(DARAZ_TOKEN_EXPIRES_AT) * 1000 || 0,
    refreshExpiresAt: Number(DARAZ_REFRESH_EXPIRES_AT) * 1000 || 0,
  }
}

// Call outside any transaction: a renewed token must be kept even if the sync later rolls back.
export async function getAccessToken(db, shop = 'trendwave', now = Date.now()) {
  const row = (await db.query('SELECT value FROM app_settings WHERE key = $1', [keyFor(shop)])).rows[0]
  const tokens = row ? JSON.parse(row.value) : fromEnv()
  if (!tokens) throw new Error(`No Daraz tokens for "${shop}" in app_settings or the environment`)
  if (!row) await save(db, shop, tokens)

  const canRenew = process.env.DARAZ_TOKEN_RENEW === '1'
  const action = process.env.DARAZ_TOKEN_FORCE_RENEW === '1' && canRenew ? 'renew' : chooseToken(tokens, now, canRenew)

  if (action === 'use') return tokens.accessToken
  if (action === 'expired') throw new Error(`Daraz access token for "${shop}" has expired and this machine may not renew it (DARAZ_TOKEN_RENEW is not 1)`)
  if (action === 'reauthorize') throw new Error(`Daraz refresh token for "${shop}" has expired: the seller must authorize the app again`)

  try {
    const renewed = parseTokenResponse(await darazPost('/auth/token/refresh', { refresh_token: tokens.refreshToken }), now)
    await save(db, shop, renewed)
    console.log(`token renewed for ${shop}, valid until ${new Date(renewed.expiresAt).toISOString().slice(0, 10)}`)
    return renewed.accessToken
  } catch (err) {
    if (tokens.expiresAt > now) {
      console.error(`token renewal failed (${err.message}); continuing with the current token, valid until ${new Date(tokens.expiresAt).toISOString().slice(0, 10)}`)
      return tokens.accessToken
    }
    throw new Error(`Daraz token renewal failed and the current token has expired: ${err.message}`)
  }
}
