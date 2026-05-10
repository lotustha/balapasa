import { readFile, stat } from 'fs/promises'
import { join, normalize, sep } from 'path'

const TYPES: Record<string, string> = {
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
  gif:  'image/gif',
  svg:  'image/svg+xml',
  mp4:  'video/mp4',
  webm: 'video/webm',
  mov:  'video/quicktime',
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const root = join(process.cwd(), 'uploads')
  const requested = normalize(join(root, ...path))

  if (!requested.startsWith(root + sep)) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const info = await stat(requested)
    if (!info.isFile()) return new Response('Not found', { status: 404 })

    const ext  = requested.split('.').pop()?.toLowerCase() ?? ''
    const type = TYPES[ext] ?? 'application/octet-stream'
    const buf  = await readFile(requested)

    return new Response(buf, {
      headers: {
        'Content-Type':  type,
        'Content-Length': String(info.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
