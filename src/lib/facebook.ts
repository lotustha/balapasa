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
        body: JSON.stringify({ url: image, caption, access_token: cfg.token }),
      })
      const data = await res.json()
      if (res.ok) return { ok: true, postId: data.post_id ?? data.id }
      console.warn('[facebook] photo post failed, trying feed:', JSON.stringify(data?.error ?? data).slice(0, 300))
    }

    // Link feed post fallback.
    const res2  = await fetch(`${GRAPH_BASE}/${cfg.pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: caption, link: url, access_token: cfg.token }),
    })
    const data2 = await res2.json()
    if (res2.ok) return { ok: true, postId: data2.id }
    return { ok: false, error: JSON.stringify(data2?.error ?? data2).slice(0, 300) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
