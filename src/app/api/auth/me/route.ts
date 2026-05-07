import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ role: null })

    const profile = await prisma.profile.findUnique({
      where: { email: user.email! },
      select: { role: true, name: true },
    })
    return Response.json({ role: profile?.role ?? 'CUSTOMER', name: profile?.name })
  } catch {
    return Response.json({ role: 'CUSTOMER' })
  }
}
