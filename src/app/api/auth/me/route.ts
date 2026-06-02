import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  // Bearer (mobile) or cookie (web). Returns id/email too so a mobile app can
  // confirm its session and identity from the token it holds.
  const payload = await getCurrentUser()
  if (!payload) return Response.json({ role: null })

  // Prefer the LIVE profile name/role over the token payload so a renamed
  // account (or a role change) reflects immediately, without forcing a re-login.
  // The token (issued at login) is the resilient fallback if the DB is down.
  let name = payload.name ?? null
  let role = payload.role
  try {
    const profile = await prisma.profile.findUnique({
      where:  { id: payload.sub },
      select: { name: true, role: true },
    })
    if (profile) {
      name = profile.name ?? name
      role = profile.role
    }
  } catch { /* DB unavailable — fall back to token values */ }

  return Response.json({ id: payload.sub, email: payload.email, role, name })
}
