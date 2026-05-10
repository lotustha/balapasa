import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

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

  const ext      = file.name.split('.').pop()?.toLowerCase() ?? (isVideo ? 'mp4' : 'jpg')
  const folder   = isVideo ? 'videos' : 'images'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const uploadDir = join(process.cwd(), 'uploads', folder)

  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, filename), Buffer.from(await file.arrayBuffer()))

  return Response.json({ url: `/uploads/${folder}/${filename}`, type: isVideo ? 'video' : 'image' })
}
