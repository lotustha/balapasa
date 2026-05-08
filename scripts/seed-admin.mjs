import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL not set — run with DATABASE_URL="postgresql://..." node scripts/seed-admin.mjs')
  process.exit(1)
}

const pool    = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma  = new PrismaClient({ adapter })

const EMAIL    = 'allthemyth@gmail.com'
const PASSWORD = 'asdf1234'
const NAME     = 'Admin'

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 12)

  const existing = await prisma.profile.findUnique({ where: { email: EMAIL } })
  if (existing) {
    await prisma.profile.update({ where: { email: EMAIL }, data: { password: hash, role: 'ADMIN', name: NAME } })
    console.log(`✓ Updated existing account → ADMIN: ${EMAIL}`)
  } else {
    await prisma.profile.create({ data: { email: EMAIL, password: hash, name: NAME, role: 'ADMIN' } })
    console.log(`✓ Created admin account: ${EMAIL}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
