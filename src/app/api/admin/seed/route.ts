import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { secret } = await req.json() as { secret: string }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || secret !== serviceKey) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const EMAIL    = 'allthemyth@gmail.com'
  const PASSWORD = 'asdf1234'
  const NAME     = 'Kamal Shrestha'
  const PHONE    = '9843742374'

  // Try to create; if already exists, fetch by email
  let userId: string
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL, password: PASSWORD, email_confirm: true,
    user_metadata: { name: NAME, phone: PHONE },
  })

  if (error) {
    // User likely already exists — look them up
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existing = list?.users.find(u => u.email === EMAIL)
    if (!existing) return Response.json({ error: error.message }, { status: 400 })
    userId = existing.id

    // Reset password in case it was different
    await admin.auth.admin.updateUserById(userId, { password: PASSWORD })
  } else {
    userId = data.user.id
  }

  // Upsert Profile with ADMIN role
  await prisma.profile.upsert({
    where:  { email: EMAIL },
    update: { role: 'ADMIN', name: NAME, phone: PHONE },
    create: { id: userId, email: EMAIL, name: NAME, phone: PHONE, role: 'ADMIN' },
  })

  return Response.json({ success: true, userId, email: EMAIL })
}
