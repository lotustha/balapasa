import { requireRole } from '@/lib/auth'
import { waBot, waBotResponse, type WaBotStatus } from '@/lib/wa-bot'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error
  return waBotResponse(await waBot<WaBotStatus>('/status'))
}
