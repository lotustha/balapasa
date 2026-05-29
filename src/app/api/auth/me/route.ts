import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  // Bearer (mobile) or cookie (web). Returns id/email too so a mobile app can
  // confirm its session and identity from the token it holds.
  const payload = await getCurrentUser()
  if (!payload) return Response.json({ role: null })

  return Response.json({ id: payload.sub, email: payload.email, role: payload.role, name: payload.name })
}
