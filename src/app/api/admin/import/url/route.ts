import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { saveFile } from '@/lib/upload'

async function reuploadImage(sourceUrl: string): Promise<string> {
  const res = await fetch(sourceUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const buf = await res.arrayBuffer()
  return saveFile(buf, contentType)
}

async function reuploadImages(urls: string[]): Promise<string[]> {
  const results = await Promise.allSettled(urls.map(u => reuploadImage(u)))
  return results
    .map((r, i) => r.status === 'fulfilled' ? r.value : urls[i])
    .filter(Boolean)
}

export interface ExtractedProduct {
  name:           string
  description:    string
  price:          number
  salePrice?:     number
  images:         string[]
  brand?:         string
  sku?:           string
  category?:      string
  tags:           string[]
  attributes:     Record<string, string>
  variantOptions: { name: string; values: string[] }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function unescapeJson(s: string) {
  return s.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '')
          .replace(/\\t/g, '\t').replace(/\\\//g, '/').replace(/\\\\/g, '\\')
}

function cleanHtml(h: string) {
  return h.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim()
}

/** Parse price strings like "Rs. 2,000" or "Rs. 200" → number in NPR.
 *  The naive /[^0-9.]/ approach breaks "Rs. 200" → ".200" → 0.2
 *  Instead we extract the last digit group (with commas). */
function parseNPR(raw: string): number {
  const groups = String(raw).match(/\d[\d,]*/g)
  if (!groups) return 0
  // Take the last / largest number group (price, not a product count prefix)
  const biggest = groups.reduce((a, b) =>
    Number(b.replace(/,/g, '')) > Number(a.replace(/,/g, '')) ? b : a
  )
  const v = Number(biggest.replace(/,/g, ''))
  return v >= 1 && v <= 10_000_000 ? v : 0
}

// ── Daraz / Lazada extractor ──────────────────────────────────────────────────

function extractDaraz(html: string): Partial<ExtractedProduct> {
  const result: Partial<ExtractedProduct> = {}

  // ── 1. JSON-LD structured data (most reliable) ───────────────────────────
  // Daraz embeds <script type="application/ld+json">{...}</script> with Product schema
  const ldMatch = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/i)
  if (ldMatch) {
    try {
      const ld = JSON.parse(ldMatch[1].trim())

      // Name
      if (ld.name) result.name = String(ld.name)

      // Images — clean static CDN URLs
      if (Array.isArray(ld.image) && ld.image.length) {
        result.images = ld.image.map((u: string) => String(u).split('?')[0]).filter(Boolean)
      }

      // Category: "Sports & Outdoors > Exercise & Fitness > Cardio Equipment" → take last leaf
      if (ld.category) {
        const parts = String(ld.category).split(/\s*[>|/]\s*/)
        result.category = parts[parts.length - 1]?.trim()
      }

      // Brand
      const brandName = ld.brand?.name ?? ld.brand
      if (brandName && String(brandName) !== 'No Brand') {
        result.brand = String(brandName)
      }

      // Price from offers — try NPR amount, then lowPrice
      const offer = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers
      if (offer) {
        const currency = offer.priceCurrency ?? ''
        if (currency === 'NPR' || currency === '' || currency === 'NPR') {
          const p = parseNPR(String(offer.price ?? offer.lowPrice ?? ''))
          if (p) result.price = p
          const hp = parseNPR(String(offer.highPrice ?? ''))
          if (hp && hp !== p) {
            // highPrice = original, lowPrice = sale
            result.salePrice = p
            result.price     = hp
          }
        }
      }
    } catch { /* ignore */ }
  }

  // ── 2. pdpTrackingData → SKU, price supplement, category supplement ──────
  const trackM = html.match(/var\s+pdpTrackingData\s*=\s*"((?:[^"\\]|\\.)*)"/)
  if (trackM) {
    try {
      const t = JSON.parse(unescapeJson(trackM[1]))

      if (!result.name && t.pdt_name) result.name = String(t.pdt_name)
      if (!result.brand && t.brand_name && t.brand_name !== 'No Brand') {
        result.brand = String(t.brand_name)
      }
      if (t.pdt_sku) result.sku = String(t.pdt_sku)

      // Category from pdt_category array
      if (!result.category && Array.isArray(t.pdt_category) && t.pdt_category.length) {
        result.category = t.pdt_category[t.pdt_category.length - 1]
      }

      // Price from pdt_price — only if we don't have a good price yet
      if (!result.price && t.pdt_price) {
        const p = parseNPR(String(t.pdt_price))
        if (p) result.price = p
      }
    } catch { /* ignore */ }
  }

  // ── 3. Description from product.desc + highlights ────────────────────────
  const descM = html.match(/"desc"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (descM) {
    const raw = unescapeJson(descM[1])
    if (raw.length > 30) result.description = cleanHtml(raw)
  }
  const hlM = html.match(/"highlights"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (hlM) {
    const raw = unescapeJson(hlM[1])
    if (raw.length > 20) {
      result.description = cleanHtml(raw) + (result.description ? '\n' + result.description : '')
    }
  }

  // ── 4. Variants from skuBase.properties ──────────────────────────────────
  const skuM = html.match(/"properties"\s*:\s*(\[[\s\S]*?\{[\s\S]*?"values"\s*:\s*\[[\s\S]*?\][\s\S]*?\}[\s\S]*?\])/)
  if (skuM) {
    try {
      const props = JSON.parse(skuM[1]) as { name: string; values: { name: string }[] }[]
      const opts  = props
        .filter(p => Array.isArray(p.values) && p.values.length > 0)
        .map(p => ({ name: p.name, values: p.values.map(v => v.name) }))
      if (opts.length) result.variantOptions = opts
    } catch { /* ignore */ }
  }

  // ── 5. Supplement images if JSON-LD had none ─────────────────────────────
  if (!result.images?.length) {
    const seen = new Set<string>()
    const imgs: string[] = []
    const re   = /"(?:src|poster)"\s*:\s*"(https:\/\/(?:static-\d+\.daraz|img\.drz\.lazcdn)\.com[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi
    for (const m of html.matchAll(re)) {
      const u = m[1].split('?')[0]
      if (!seen.has(u) && imgs.length < 12) { seen.add(u); imgs.push(u) }
    }
    result.images = imgs
  }

  // ── 6. Tags from meta keywords ───────────────────────────────────────────
  const kwM = html.match(/<meta[^>]+name="keywords"[^>]+content="([^"]+)"/)
  if (kwM) result.tags = kwM[1].split(',').map(t => t.trim()).filter(Boolean).slice(0, 10)

  return result
}

// ── Generic extractor ─────────────────────────────────────────────────────────

function extractGeneric(html: string): Partial<ExtractedProduct> {
  // Try JSON-LD first for any platform
  const ldMatch = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/i)
  const result: Partial<ExtractedProduct> = {}

  if (ldMatch) {
    try {
      const ld  = JSON.parse(ldMatch[1].trim())
      if (ld.name)   result.name   = ld.name
      if (ld.image)  result.images = Array.isArray(ld.image) ? ld.image : [ld.image]
      if (ld.brand?.name) result.brand = ld.brand.name
      const offer = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers
      if (offer?.price) result.price = Number(offer.price) || 0
    } catch { /* ignore */ }
  }

  // og: fallbacks
  const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/)
  const ogDesc  = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/)
  const ogImage = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)
  const title   = html.match(/<title>([^<]+)<\/title>/)

  if (!result.name)    result.name   = ogTitle?.[1]?.trim() ?? title?.[1]?.trim() ?? 'Imported Product'
  if (!result.description && ogDesc?.[1]) result.description = `<p>${ogDesc[1]}</p>`
  if (!result.images?.length && ogImage?.[1]) result.images = [ogImage[1]]

  result.tags = []; result.variantOptions = []
  return result
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { url } = await req.json() as { url: string }
  if (!url) return Response.json({ error: 'URL is required' }, { status: 400 })

  let parsed: URL
  try { parsed = new URL(url) } catch {
    return Response.json({ error: 'Invalid URL' }, { status: 400 })
  }

  let html: string
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control':   'no-cache',
      },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return Response.json({ error: `Could not fetch page (HTTP ${res.status})` }, { status: 400 })
    html = await res.text()
  } catch (e) {
    return Response.json({ error: `Fetch failed: ${e instanceof Error ? e.message : e}` }, { status: 500 })
  }

  const host    = parsed.hostname.toLowerCase()
  const isDaraz = host.includes('daraz') || host.includes('lazada')
  const partial = isDaraz ? extractDaraz(html) : extractGeneric(html)

  // Re-upload images to Supabase Storage
  let images = partial.images ?? []
  let uploadedCount = 0

  if (images.length) {
    const reuploaded = await reuploadImages(images)
    uploadedCount    = reuploaded.filter(u => u.startsWith('/uploads')).length
    images           = reuploaded
  }

  const product: ExtractedProduct = {
    name:           partial.name           ?? 'Imported Product',
    description:    partial.description    ?? '',
    price:          partial.price          ?? 0,
    salePrice:      partial.salePrice,
    images,
    brand:          partial.brand,
    sku:            partial.sku,
    category:       partial.category,
    tags:           partial.tags           ?? [],
    attributes:     partial.attributes     ?? {},
    variantOptions: partial.variantOptions ?? [],
  }

  // Look up category mapping (Daraz category name → our category ID)
  let mappedCategoryId: string | null = null
  if (product.category) {
    try {
      const mapping = await prisma.categoryMapping.findUnique({
        where: { source_externalName: { source: isDaraz ? 'daraz' : host, externalName: product.category } },
        select: { categoryId: true },
      })
      mappedCategoryId = mapping?.categoryId ?? null
    } catch { /* ignore */ }
  }

  return Response.json({
    product,
    source:               host,
    total_images:         product.images.length,
    uploaded_locally: uploadedCount,
    mappedCategoryId,     // pre-selected category if mapping exists
  })
}
