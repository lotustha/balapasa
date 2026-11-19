import { requireRole } from '@/lib/auth'
import { waBot, waBotResponse } from '@/lib/wa-bot'

export async function POST() {
  const guard = await requireRole('ADMIN')
  if ('error' in guard) return guard.error
  const text = 'Test message from the Balapasa admin panel. Send "help" to see what I can do.'
  return waBotResponse(await waBot<{ sent: number }>('/send', { method: 'POST', body: { text } }))
}
