import { createClient } from '@supabase/supabase-js'

const BUCKET = 'product-images'

// Proxy: fetches an external image server-side (no CORS) → uploads to Supabase → returns our URL.
// Browser calls this instead of fetching the external URL directly.

export async function POST(req: Request) {
  const { url } = await req.json() as { url: string }
  if (!url) return Response.json({ error: 'url required' }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey || serviceKey === 'your-service-role-key') {
    return Response.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  try {
    // Server-side fetch — not subject to browser CORS restrictions
    const imgRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        'Referer':    'https://www.daraz.com.np/',
        'Accept':     'image/webp,image/avif,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(20000),
    })

    if (!imgRes.ok) {
      return Response.json({ error: `Source returned ${imgRes.status}`, originalUrl: url }, { status: 400 })
    }

    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
    if (!contentType.startsWith('image/')) {
      return Response.json({ error: 'Not an image', originalUrl: url }, { status: 400 })
    }

    const ext  = contentType.includes('png')  ? 'png'
               : contentType.includes('webp') ? 'webp'
               : contentType.includes('gif')  ? 'gif'
               : 'jpg'
    const buf  = await imgRes.arrayBuffer()
    const path = `imports/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Ensure bucket exists
    const { data: buckets } = await admin.storage.listBuckets()
    if (!buckets?.find(b => b.name === BUCKET)) {
      await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 10 * 1024 * 1024 })
    }

    const { error } = await admin.storage.from(BUCKET).upload(path, buf, { contentType, upsert: false })
    if (error) return Response.json({ error: error.message, originalUrl: url }, { status: 500 })

    const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)
    return Response.json({ url: publicUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg, originalUrl: url }, { status: 500 })
  }
}
