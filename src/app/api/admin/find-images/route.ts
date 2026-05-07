import { createClient } from '@supabase/supabase-js'

const BUCKET = 'product-images'

interface SearchItem {
  name:    string
  image:   string
  itemUrl: string
  price:   number
}

async function searchDaraz(productName: string): Promise<SearchItem | null> {
  const url = `https://www.daraz.com.np/catalog/?ajax=true&q=${encodeURIComponent(productName)}`
  try {
    const res  = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept':          'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data  = await res.json()
    const items = (data?.mods?.listItems ?? []) as SearchItem[]
    return items[0] ?? null
  } catch { return null }
}

function extractImages(html: string): string[] {
  const seen = new Set<string>()
  const imgs: string[] = []
  const re   = /"(?:src|poster)"\s*:\s*"(https:\/\/(?:static-\d+\.daraz|img\.drz\.lazcdn)\.com[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi
  for (const m of html.matchAll(re)) {
    const u = m[1].split('?')[0]
    if (!seen.has(u) && imgs.length < 12) { seen.add(u); imgs.push(u) }
  }
  // Also check JSON-LD image array
  const ldM = html.match(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/i)
  if (ldM) {
    try {
      const ld = JSON.parse(ldM[1].trim())
      if (Array.isArray(ld.image)) {
        for (const u of ld.image) {
          const clean = String(u).split('?')[0]
          if (!seen.has(clean)) { seen.add(clean); imgs.unshift(clean) }
        }
      }
    } catch { /* ignore */ }
  }
  return imgs.slice(0, 10)
}

async function uploadImage(imgUrl: string, admin: ReturnType<typeof createClient>): Promise<string> {
  const res = await fetch(imgUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
      'Referer':    'https://www.daraz.com.np/',
      'Accept':     'image/webp,image/avif,image/*,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const ct   = res.headers.get('content-type') ?? 'image/jpeg'
  const ext  = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg'
  const buf  = await res.arrayBuffer()
  const path = `imports/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await admin.storage.from(BUCKET).upload(path, buf, { contentType: ct })
  if (error) throw new Error(error.message)

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)
  return publicUrl
}

export async function POST(req: Request) {
  const { productName } = await req.json() as { productName: string }
  if (!productName) return Response.json({ error: 'productName required' }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey || serviceKey === 'your-service-role-key') {
    return Response.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  // Step 1: Search Daraz for the product
  const item = await searchDaraz(productName)
  if (!item) return Response.json({ error: 'Product not found on Daraz', images: [] })

  // Step 2: Fetch the product page to get all images
  const pdpUrl = item.itemUrl.startsWith('//') ? `https:${item.itemUrl}` : item.itemUrl
  let allImages: string[] = []

  try {
    const pdpRes = await fetch(pdpUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        'Accept':     'text/html',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (pdpRes.ok) {
      const html = await pdpRes.text()
      allImages  = extractImages(html)
    }
  } catch { /* ignore — fall back to search thumbnail */ }

  // Fall back to search thumbnail if PDP scrape failed
  if (!allImages.length && item.image) allImages = [item.image]
  if (!allImages.length) return Response.json({ error: 'No images found', images: [] })

  // Step 3: Upload all images to Supabase
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  // Ensure bucket
  const { data: buckets } = await admin.storage.listBuckets()
  if (!buckets?.find(b => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 10 * 1024 * 1024 })
  }

  const uploadedUrls = await Promise.allSettled(allImages.map(u => uploadImage(u, admin)))
  const images = uploadedUrls.map((r, i) =>
    r.status === 'fulfilled' ? r.value : allImages[i]
  )

  return Response.json({
    images,
    uploaded:   images.filter(u => u.includes('supabase')).length,
    total:      images.length,
    foundAs:    item.name,
    darazUrl:   pdpUrl,
  })
}
