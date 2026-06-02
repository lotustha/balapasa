import { getSetting } from './appSettings'
import { STORE_URL } from './config'

// Posts new products to the linked Facebook Page feed. Reuses the same page
// credentials as Messenger (FACEBOOK_PAGE_ID + FACEBOOK_PAGE_ACCESS_TOKEN,
// configured in Admin → Settings → Messaging).
const GRAPH_BASE = 'https://graph.facebook.com/v19.0'

export async function getFacebookPostConfig(): Promise<{ pageId: string; token: string } | null> {
  const [pageId, token] = await Promise.all([
    getSetting('FACEBOOK_PAGE_ID'),
    getSetting('FACEBOOK_PAGE_ACCESS_TOKEN'),
  ])
  if (!pageId?.trim() || !token?.trim()) return null
  return { pageId: pageId.trim(), token: token.trim() }
}

// True when a page id AND a page access token are both configured — drives the
// "Post to Facebook" toggle's visibility in the product form.
export async function isFacebookConfigured(): Promise<boolean> {
  return (await getFacebookPostConfig()) !== null
}

// A System User / User token must be exchanged for the PAGE access token before
// posting AS the page. If the configured token IS already a page token, Graph
// returns the same value. Falls back to the provided token on any error so a
// genuine page token still works.
async function resolvePageToken(pageId: string, token: string): Promise<string> {
  try {
    const res  = await fetch(`${GRAPH_BASE}/${pageId}?fields=access_token&access_token=${encodeURIComponent(token)}`)
    const data = await res.json()
    if (res.ok && typeof data?.access_token === 'string' && data.access_token) return data.access_token
  } catch { /* fall back to the provided token */ }
  return token
}

function absUrl(u: string): string {
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  return `${STORE_URL}${u.startsWith('/') ? '' : '/'}${u}`
}

export interface FacebookProductPost {
  name: string
  slug: string
  description: string
  price: number
  salePrice?: number | null
  images: string[]
}

// Posts a product to the page. Prefers a photo post (shows the product image);
// falls back to a link feed post. Never throws — returns a result the caller
// can log. Facebook can only fetch PUBLIC https image URLs, so dev/localhost
// images won't attach (the link fallback still works).
export async function postProductToFacebook(
  p: FacebookProductPost,
): Promise<{ ok: boolean; postId?: string; error?: string }> {
  const cfg = await getFacebookPostConfig()
  if (!cfg) return { ok: false, error: 'Facebook not configured' }
  const token = await resolvePageToken(cfg.pageId, cfg.token)

  const url   = `${STORE_URL}/products/${p.slug}`
  const price = p.salePrice != null && p.salePrice < p.price
    ? `Now NPR ${p.salePrice} (was NPR ${p.price})`
    : `NPR ${p.price}`
  const plain = p.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400)
  const caption = `🆕 ${p.name}\n\n${plain}\n\n💰 ${price}\n🛒 Order now: ${url}`
  const image = absUrl(p.images[0] ?? '')

  try {
    // Photo post — only when the image is a public https URL Facebook can fetch.
    if (/^https:\/\//i.test(image)) {
      const res  = await fetch(`${GRAPH_BASE}/${cfg.pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: image, caption, access_token: token }),
      })
      const data = await res.json()
      if (res.ok) return { ok: true, postId: data.post_id ?? data.id }
      console.warn('[facebook] photo post failed, trying feed:', JSON.stringify(data?.error ?? data).slice(0, 300))
    }

    // Link feed post fallback.
    const res2  = await fetch(`${GRAPH_BASE}/${cfg.pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: caption, link: url, access_token: token }),
    })
    const data2 = await res2.json()
    if (res2.ok) return { ok: true, postId: data2.id }
    return { ok: false, error: JSON.stringify(data2?.error ?? data2).slice(0, 300) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// Human-readable Graph API error, including the bits that actually tell you
// what to fix (message, type, code, subcode).
function graphError(data: unknown): string {
  const e = (data as { error?: { message?: string; type?: string; code?: number; error_subcode?: number } })?.error
  if (!e) return JSON.stringify(data).slice(0, 300)
  const bits = [e.message, e.type && `type: ${e.type}`, e.code != null && `code: ${e.code}`, e.error_subcode != null && `subcode: ${e.error_subcode}`]
  return bits.filter(Boolean).join(' · ')
}

// End-to-end connection test surfaced in Settings → Messaging. Verifies the
// token can read the page, then attempts a real (deletable) feed post — so the
// admin sees the EXACT Graph error instead of a silent failure.
export async function testFacebookConnection(storeName: string): Promise<{
  ok: boolean; step: 'config' | 'verify-page' | 'post' | 'done' | 'network'
  pageName?: string; postId?: string; error?: string
}> {
  const cfg = await getFacebookPostConfig()
  if (!cfg) return { ok: false, step: 'config', error: 'Facebook Page ID and/or Page Access Token are not set in Settings → Messaging.' }

  try {
    // 1) Can the token read the page? Catches invalid/expired tokens and a wrong page id.
    const res  = await fetch(`${GRAPH_BASE}/${cfg.pageId}?fields=name&access_token=${encodeURIComponent(cfg.token)}`)
    const data = await res.json()
    if (!res.ok || data?.error) return { ok: false, step: 'verify-page', error: graphError(data) }
    const pageName = typeof data.name === 'string' ? data.name : undefined

    // 2) Can it actually publish? Resolve the page token first (handles a
    //    System User / User token), then post. Catches a token missing
    //    pages_manage_posts or a page not assigned to the system user.
    const postToken = await resolvePageToken(cfg.pageId, cfg.token)
    const res2  = await fetch(`${GRAPH_BASE}/${cfg.pageId}/feed`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `✅ ${storeName}: Facebook posting is connected. (Test post — safe to delete.)`,
        access_token: postToken,
      }),
    })
    const data2 = await res2.json()
    if (!res2.ok || data2?.error) return { ok: false, step: 'post', pageName, error: graphError(data2) }
    return { ok: true, step: 'done', pageName, postId: data2.id }
  } catch (e) {
    return { ok: false, step: 'network', error: e instanceof Error ? e.message : String(e) }
  }
}

// Subscribes the Page to the app's webhooks (the step most setups miss). After
// this, Meta delivers incoming Messenger messages to /api/webhooks/messenger —
// PROVIDED the app-level webhook (callback URL + verify token + `messages`
// field) is also configured in the Meta App Dashboard.
export async function subscribeMessengerWebhook(): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getFacebookPostConfig()
  if (!cfg) return { ok: false, error: 'Facebook Page ID and/or Page Access Token are not set in Settings → Messaging.' }
  const token = await resolvePageToken(cfg.pageId, cfg.token)
  try {
    const res  = await fetch(`${GRAPH_BASE}/${cfg.pageId}/subscribed_apps`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscribed_fields: 'messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads',
        access_token: token,
      }),
    })
    const data = await res.json()
    if (res.ok && data?.success !== false && !data?.error) return { ok: true }
    return { ok: false, error: graphError(data) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// Lists which fields the page is subscribed to (so the admin can confirm
// `messages` is active).
export async function getMessengerSubscription(): Promise<{ ok: boolean; subscribedFields?: string[]; error?: string }> {
  const cfg = await getFacebookPostConfig()
  if (!cfg) return { ok: false, error: 'Not configured' }
  const token = await resolvePageToken(cfg.pageId, cfg.token)
  try {
    const res  = await fetch(`${GRAPH_BASE}/${cfg.pageId}/subscribed_apps?access_token=${encodeURIComponent(token)}`)
    const data = await res.json()
    if (!res.ok || data?.error) return { ok: false, error: graphError(data) }
    const fields = Array.isArray(data?.data)
      ? (data.data.flatMap((a: { subscribed_fields?: string[] }) => a.subscribed_fields ?? []) as string[])
      : []
    return { ok: true, subscribedFields: [...new Set(fields)] }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
