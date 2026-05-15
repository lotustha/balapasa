import { NextRequest } from 'next/server'
import { saveFile, recordMediaAsset } from '@/lib/upload'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') ?? ''
  if (!ct.startsWith('image/')) {
    return Response.json({ error: 'Expected image content-type' }, { status: 400 })
  }
  const buf = await req.arrayBuffer()
  if (buf.byteLength < 512) {
    return Response.json({ error: 'File too small' }, { status: 400 })
  }
  const saved = await saveFile(buf, ct)
  const me    = await getCurrentUser()
  await recordMediaAsset(saved, me?.sub ?? null)
  return Response.json({ url: saved.url })
}
