// Daraz access tokens live in app_settings so a renewed token survives restarts and redeploys.
// The first run seeds them from the environment (DARAZ_ACCESS_TOKEN / DARAZ_REFRESH_TOKEN / *_EXPIRES_AT).
import { darazGet } from './api.mjs'

const RENEW_WITHIN_MS = 7 * 24 * 60 * 60 * 1000
const keyFor = shop => `daraz.tokens.${shop}`

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
  let tokens = row ? JSON.parse(row.value) : fromEnv()
  if (!tokens) throw new Error(`No Daraz tokens for "${shop}" in app_settings or the environment`)
  if (!row) await save(db, shop, tokens)

  if (tokens.expiresAt - now < RENEW_WITHIN_MS) {
    const res = await darazGet('/auth/token/refresh', { refresh_token: tokens.refreshToken })
    tokens = {
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      expiresAt: now + Number(res.expires_in) * 1000,
      refreshExpiresAt: now + Number(res.refresh_expires_in) * 1000,
    }
    await save(db, shop, tokens)
    console.log(`token renewed for ${shop}, valid until ${new Date(tokens.expiresAt).toISOString().slice(0, 10)}`)
  }
  return tokens.accessToken
}
