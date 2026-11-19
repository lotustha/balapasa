import { requireRole } from '@/lib/auth'
import { waBot, waBotResponse, type WaBotStatus } from '@/lib/wa-bot'

export async function POST() {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error
  return waBotResponse(await waBot<WaBotStatus>('/logout', { method: 'POST' }))
}
