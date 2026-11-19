// Small in-memory attempt limiter for the sign-in routes. The site runs as a single process, so a
// Map is enough; counters reset on restart, which only ever errs in the visitor's favour.

interface Bucket { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 10_000

function live(key: string, now: number): Bucket | null {
  const b = buckets.get(key)
  if (!b) return null
  if (b.resetAt <= now) { buckets.delete(key); return null }
  return b
}

/** Seconds until `key` may try again, or 0 when it is not blocked. */
export function blockedFor(key: string, limit: number, now = Date.now()): number {
  const b = live(key, now)
  return b && b.count >= limit ? Math.ceil((b.resetAt - now) / 1000) : 0
}

/** Counts one attempt against `key`. */
export function recordAttempt(key: string, windowMs: number, now = Date.now()): void {
  const b = live(key, now)
  if (b) { b.count++; return }
  if (buckets.size >= MAX_BUCKETS) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
    if (buckets.size >= MAX_BUCKETS) buckets.clear()
  }
  buckets.set(key, { count: 1, resetAt: now + windowMs })
}

export function clearAttempts(key: string): void {
  buckets.delete(key)
}

/** The visitor's address as nginx reports it. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('x-real-ip') || 'unknown'
}

export const tooManyAttempts = (seconds: number) =>
  Response.json(
    { error: `Too many attempts. Please try again in ${Math.max(1, Math.ceil(seconds / 60))} minute${seconds > 60 ? 's' : ''}.` },
    { status: 429, headers: { 'Retry-After': String(seconds) } },
  )
