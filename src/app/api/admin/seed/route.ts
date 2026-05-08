import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { secret } = await req.json() as { secret: string }

  const adminSecret = process.env.SEED_SECRET
  if (!adminSecret || secret !== adminSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const EMAIL    = 'allthemyth@gmail.com'
  const PASSWORD = 'asdf1234'
  const NAME     = 'Kamal Shrestha'
  const PHONE    = '9843742374'

  const hash = await bcrypt.hash(PASSWORD, 12)

  const profile = await prisma.profile.upsert({
    where:  { email: EMAIL },
    update: { role: 'ADMIN', name: NAME, phone: PHONE, password: hash },
    create: { email: EMAIL, name: NAME, phone: PHONE, role: 'ADMIN', password: hash },
  })

  return Response.json({ success: true, id: profile.id, email: EMAIL })
}
