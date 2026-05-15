// Central store configuration. STORE_URL/NAME read from env at build time —
// the DB-backed canonical sources are `app_settings.STORE_URL` and
// `STORE_NAME` (consumed via getSiteSettings()). These exports are kept for
// places that need a synchronous value (Facebook catalog, WhatsApp link,
// metadata helpers). Hard guard against localhost / empty / non-http values
// so a stale VPS env can't poison SEO / catalog / share URLs.

function resolveStoreUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim()
  if (!raw || !/^https?:\/\//i.test(raw) || /localhost|127\.0\.0\.1/i.test(raw)) {
    return 'https://balapasa.com.np'
  }
  return raw.replace(/\/+$/, '')
}

export const STORE_NAME = (process.env.NEXT_PUBLIC_STORE_NAME ?? '').trim() || 'Balapasa'
export const STORE_URL  = resolveStoreUrl()
