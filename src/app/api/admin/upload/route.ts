import { saveFile, recordMediaAsset } from '@/lib/upload'
import { getCurrentUser } from '@/lib/auth'

const IMAGE_MAX = 10  * 1024 * 1024   // 10 MB
const VIDEO_MAX = 200 * 1024 * 1024   // 200 MB

export async function POST(req: Request) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')
  if (!isImage && !isVideo) {
    return Response.json({ error: 'Only image or video files are allowed' }, { status: 400 })
  }

  const maxSize = isVideo ? VIDEO_MAX : IMAGE_MAX
  if (file.size > maxSize) {
    return Response.json({ error: `File too large (max ${isVideo ? '200' : '10'} MB)` }, { status: 400 })
  }

  const saved = await saveFile(await file.arrayBuffer(), file.type || (isVideo ? 'video/mp4' : 'image/jpeg'), file.name)
  const me    = await getCurrentUser()
  await recordMediaAsset(saved, me?.sub ?? null)

  return Response.json({ url: saved.url, type: saved.kind })
}
