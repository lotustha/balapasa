import { NextRequest } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { runBotCommand, dailySummary, BOT_HELP } from '@/lib/bot-commands'

export const dynamic = 'force-dynamic'

// Called only by the WhatsApp bot service on this server (tools/wa-notifier), which has already
// checked that the message came from a commanding number. Authenticated with the shared
// WA_NOTIFY_TOKEN; without that variable set the endpoint is closed.
function authorized(req: NextRequest): boolean {
  const expected = process.env.WA_NOTIFY_TOKEN
  if (!expected) return false
  const sent = (req.headers.get('authorization') ?? '').replace(/^bearer\s+/i, '')
  const a = Buffer.from(sent), b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return Response.json({ error: 'Not authorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { command?: string; arg?: string; confirmed?: boolean; scheduled?: boolean }
  const command = String(body.command ?? '').toLowerCase().slice(0, 30)
  const arg = String(body.arg ?? '').trim().slice(0, 120)

  try {
    // The bot's own 8 pm timer: answers with no text when the summary is switched off.
    if (command === 'summary' && body.scheduled === true) return Response.json({ text: await dailySummary() })
    if (command === 'help') return Response.json({ text: BOT_HELP })

    // Loop back to this same server for order changes, without going out through nginx.
    const origin = process.env.PORT ? `http://127.0.0.1:${process.env.PORT}` : req.nextUrl.origin
    const reply = await runBotCommand(command, arg, body.confirmed === true, origin)
    if (!reply) return Response.json({ error: 'unknown command' }, { status: 404 })
    return Response.json(reply)
  } catch (err) {
    console.error('[bot] command failed:', err)
    return Response.json({ text: `That command failed: ${err instanceof Error ? err.message.slice(0, 200) : 'unknown error'}` })
  }
}
