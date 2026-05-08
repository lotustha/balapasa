import { saveFile } from '@/lib/upload'

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

async function uploadImageLocally(imgUrl: string): Promise<string> {
  const res = await fetch(imgUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
      'Referer':    'https://www.daraz.com.np/',
      'Accept':     'image/webp,image/avif,image/*,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const ct  = res.headers.get('content-type') ?? 'image/jpeg'
  const buf = await res.arrayBuffer()
  return saveFile(buf, ct)
}

export async function POST(req: Request) {
  const { productName } = await req.json() as { productName: string }
  if (!productName) return Response.json({ error: 'productName required' }, { status: 400 })

  const item = await searchDaraz(productName)
  if (!item) return Response.json({ error: 'Product not found on Daraz', images: [] })

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
    if (pdpRes.ok) allImages = extractImages(await pdpRes.text())
  } catch { /* fall back to thumbnail */ }

  if (!allImages.length && item.image) allImages = [item.image]
  if (!allImages.length) return Response.json({ error: 'No images found', images: [] })

  const uploadedUrls = await Promise.allSettled(allImages.map(u => uploadImageLocally(u)))
  const images = uploadedUrls.map((r, i) =>
    r.status === 'fulfilled' ? r.value : allImages[i]
  )

  return Response.json({
    images,
    uploaded: images.filter(u => u.startsWith('/uploads')).length,
    total:    images.length,
    foundAs:  item.name,
    darazUrl: pdpUrl,
  })
}
