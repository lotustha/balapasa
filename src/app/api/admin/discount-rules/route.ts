import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { DiscountRule } from '@/app/api/discount-rules/route'

export async function GET() {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: 'DISCOUNT_RULES' } })
    const rules: DiscountRule[] = row ? JSON.parse(row.value) : []
    return Response.json({ rules })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { rules } = await req.json() as { rules: DiscountRule[] }
    await prisma.$executeRaw`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('DISCOUNT_RULES', ${JSON.stringify(rules)}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(rules)}, updated_at = NOW()
    `
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
