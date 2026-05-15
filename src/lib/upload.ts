import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'

export interface SavedFile {
  url:       string
  filename:  string
  mimeType:  string
  sizeBytes: number
  kind:      'image' | 'video'
}

function pickExt(contentType: string, fallbackName?: string): string {
  if (contentType.includes('png'))  return 'png'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif'))  return 'gif'
  if (contentType.includes('svg'))  return 'svg'
  if (contentType.includes('mp4'))  return 'mp4'
  if (contentType.includes('webm')) return 'webm'
  if (contentType.includes('quicktime') || contentType.includes('mov')) return 'mov'
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg'
  const fromName = fallbackName?.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName
  return 'bin'
}

export async function saveFile(buf: ArrayBuffer, contentType: string, originalName?: string): Promise<SavedFile> {
  const kind     = contentType.startsWith('video/') ? 'video' : 'image'
  const ext      = pickExt(contentType, originalName)
  const folder   = kind === 'video' ? 'videos' : 'images'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const uploadDir = join(process.cwd(), 'uploads', folder)

  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, filename), Buffer.from(buf))

  return {
    url:       `/uploads/${folder}/${filename}`,
    filename:  originalName ?? filename,
    mimeType:  contentType,
    sizeBytes: buf.byteLength,
    kind,
  }
}

// Records the asset in media_assets so the gallery picker can list it later.
// Best-effort: if the DB write fails (e.g. table missing pre-migration), the
// upload itself still succeeds — the file is on disk and the URL is returned.
export async function recordMediaAsset(file: SavedFile, uploadedBy?: string | null): Promise<void> {
  try {
    await prisma.mediaAsset.create({
      data: {
        url:        file.url,
        filename:   file.filename,
        mimeType:   file.mimeType,
        sizeBytes:  file.sizeBytes,
        kind:       file.kind,
        source:     'upload',
        uploadedBy: uploadedBy ?? null,
      },
    })
  } catch (e) {
    console.warn('[media] failed to record asset (non-fatal):', e)
  }
}
