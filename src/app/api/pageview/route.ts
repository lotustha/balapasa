import { NextRequest } from 'next/server'
import { cookies, headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const VISITOR_COOKIE = 'bp_vid'
const BOT_RE = /bot|crawl|spider|slurp|bing|yandex|baidu|duckduck|facebookexternalhit|preview|headless|lighthouse|monitor|curl|wget/i

function randomId(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// First-party page-view logging. Called via navigator.sendBeacon from the
// storefront PageViewTracker. Never throws to the client and always returns 204
// fast — tracking must not affect the visitor's experience.
export async function POST(req: NextRequest) {
  try {
    const ua = (await headers()).get('user-agent') ?? ''
    if (BOT_RE.test(ua)) return new Response(null, { status: 204 })

    const jar = await cookies()
    let vid = jar.get(VISITOR_COOKIE)?.value
    if (!vid) {
      vid = randomId()
      jar.set(VISITOR_COOKIE, vid, {
        httpOnly: true, sameSite: 'lax', path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 365 * 24 * 60 * 60,
      })
    }

    const { path, referrer } = (await req.json().catch(() => ({}))) as { path?: string; referrer?: string }
    if (!path || typeof path !== 'string') return new Response(null, { status: 204 })

    // Best-effort attribution to a signed-in user; never block tracking on it.
    let userId: string | null = null
    try { userId = (await getCurrentUser())?.sub ?? null } catch { /* anonymous */ }

    await prisma.pageView.create({
      data: {
        path:      path.slice(0, 512),
        referrer:  referrer ? referrer.slice(0, 512) : null,
        visitorId: vid,
        userId,
      },
    })
  } catch { /* table may not exist yet (pre-migration) / DB down — fail safe */ }

  return new Response(null, { status: 204 })
}
