import { requireRole } from '@/lib/auth'
import { waBot, waBotResponse, type WaBotStatus } from '@/lib/wa-bot'

export async function PUT(req: Request) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error
  const { numbers } = await req.json().catch(() => ({ numbers: null }))
  return waBotResponse(await waBot<WaBotStatus>('/commanders', { method: 'PUT', body: { numbers } }))
}
