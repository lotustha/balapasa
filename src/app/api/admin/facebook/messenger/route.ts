import { requireRole } from '@/lib/auth'
import { subscribeMessengerWebhook, getMessengerSubscription } from '@/lib/facebook'

// GET  → current page→app webhook subscription (which fields are active).
// POST → subscribe the page to the app so Messenger messages reach the webhook.
export async function GET() {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error
  return Response.json(await getMessengerSubscription())
}

export async function POST() {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error
  const result = await subscribeMessengerWebhook()
  return Response.json(result, { status: result.ok ? 200 : 400 })
}
