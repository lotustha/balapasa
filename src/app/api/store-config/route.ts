import { prisma } from '@/lib/prisma'

// Public store settings — safe to expose to customers
const PUBLIC_KEYS = [
  'FREE_DELIVERY_THRESHOLD',
  'STORE_NAME',
  'STORE_PHONE',
  'STORE_EMAIL',
  'STORE_ADDRESS',
  'STORE_LOGO_URL',
  'STORE_THEME',
  'FACEBOOK_PIXEL_ID',
  'FACEBOOK_PAGE_ID',
]

export async function GET() {
  try {
    const settings = await prisma.appSetting.findMany({
      where: { key: { in: PUBLIC_KEYS } },
    })
    const config: Record<string, string> = {}
    for (const s of settings) config[s.key] = s.value
    return Response.json({
      FREE_DELIVERY_THRESHOLD: parseInt(config.FREE_DELIVERY_THRESHOLD ?? '5000', 10),
      STORE_NAME:    config.STORE_NAME    ?? process.env.NEXT_PUBLIC_STORE_NAME ?? 'Balapasa',
      STORE_PHONE:   config.STORE_PHONE   ?? '',
      STORE_EMAIL:   config.STORE_EMAIL   ?? '',
      STORE_ADDRESS: config.STORE_ADDRESS ?? 'Kathmandu, Nepal',
      STORE_LOGO_URL:config.STORE_LOGO_URL ?? '',
      STORE_THEME:   config.STORE_THEME   ?? 'emerald',
    }, { headers: { 'Cache-Control': 'public, max-age=60' } })
  } catch {
    return Response.json({ FREE_DELIVERY_THRESHOLD: 5000, STORE_NAME: process.env.NEXT_PUBLIC_STORE_NAME ?? 'Balapasa', STORE_PHONE: '', STORE_EMAIL: '', STORE_ADDRESS: '', STORE_LOGO_URL: '' })
  }
}
