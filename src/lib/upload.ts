import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function saveFile(buf: ArrayBuffer, contentType: string): Promise<string> {
  const ext = contentType.includes('png')  ? 'png'
            : contentType.includes('webp') ? 'webp'
            : contentType.includes('gif')  ? 'gif'
            : 'jpg'
  const filename  = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'images')
  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, filename), Buffer.from(buf))
  return `/uploads/images/${filename}`
}
