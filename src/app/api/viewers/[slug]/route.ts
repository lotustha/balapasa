import { NextRequest } from 'next/server'

// Module-level singleton: slug → Map<sessionId, lastSeen ms>
const store = new Map<string, Map<string, number>>()
const TTL = 2 * 60 * 1000 // 2 min — session expires if no heartbeat

function clean(slug: string): number {
  const sessions = store.get(slug)
  if (!sessions) return 0
  const now = Date.now()
  for (const [sid, last] of sessions) {
    if (now - last > TTL) sessions.delete(sid)
  }
  return sessions.size
}

export async function GET(_: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  return Response.json({ count: clean(slug) })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const { sessionId } = await req.json() as { sessionId?: string }
  if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 })
  if (!store.has(slug)) store.set(slug, new Map())
  store.get(slug)!.set(sessionId, Date.now())
  return Response.json({ count: clean(slug) })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const { sessionId } = await req.json().catch(() => ({})) as { sessionId?: string }
  if (sessionId) store.get(slug)?.delete(sessionId)
  return Response.json({ count: clean(slug) })
}
