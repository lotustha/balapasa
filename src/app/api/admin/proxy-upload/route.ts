import { saveFile } from '@/lib/upload'

export async function POST(req: Request) {
  const { url } = await req.json() as { url: string }
  if (!url) return Response.json({ error: 'url required' }, { status: 400 })

  try {
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

    const buf        = await imgRes.arrayBuffer()
    const savedUrl   = await saveFile(buf, contentType)
    return Response.json({ url: savedUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg, originalUrl: url }, { status: 500 })
  }
}
