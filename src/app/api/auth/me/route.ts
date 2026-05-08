import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE)?.value
  if (!token) return Response.json({ role: null })

  const payload = await verifyToken(token)
  if (!payload) return Response.json({ role: null })

  return Response.json({ role: payload.role, name: payload.name })
}
