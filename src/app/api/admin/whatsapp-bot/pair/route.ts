import { requireRole } from '@/lib/auth'
import { waBot, waBotResponse } from '@/lib/wa-bot'

export async function POST(req: Request) {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error
  const { number } = await req.json().catch(() => ({ number: '' }))
  return waBotResponse(await waBot<{ code: string; number: string }>('/pair', { method: 'POST', body: { number } }))
}
