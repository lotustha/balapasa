import { NextRequest } from 'next/server'
import { saveFile } from '@/lib/upload'

export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') ?? ''
  if (!ct.startsWith('image/')) {
    return Response.json({ error: 'Expected image content-type' }, { status: 400 })
  }
  const buf = await req.arrayBuffer()
  if (buf.byteLength < 512) {
    return Response.json({ error: 'File too small' }, { status: 400 })
  }
  const url = await saveFile(buf, ct)
  return Response.json({ url })
}
