import { prisma } from '@/lib/prisma'
import { getEnabledPaymentMethods } from '@/lib/payment-methods-server'

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
  'WHATSAPP_NUMBER',
  'CONTACT_INSTAGRAM',
  'CONTACT_X',
  'CONTACT_YOUTUBE',
  'DELIVERY_MODE',
  'DELIVERY_ENABLED',
]

export async function GET() {
  try {
    const [settings, enabledPaymentMethods] = await Promise.all([
      prisma.appSetting.findMany({ where: { key: { in: PUBLIC_KEYS } } }),
      getEnabledPaymentMethods(),
    ])
    const config: Record<string, string> = {}
    for (const s of settings) config[s.key] = s.value
    return Response.json({
      FREE_DELIVERY_THRESHOLD: parseInt(config.FREE_DELIVERY_THRESHOLD ?? '5000', 10),
      enabledPaymentMethods,
      STORE_NAME:      config.STORE_NAME      ?? process.env.NEXT_PUBLIC_STORE_NAME ?? 'Balapasa',
      STORE_PHONE:     config.STORE_PHONE     ?? '',
      STORE_EMAIL:     config.STORE_EMAIL     ?? '',
      STORE_ADDRESS:   config.STORE_ADDRESS   ?? 'Kathmandu, Nepal',
      STORE_LOGO_URL:  config.STORE_LOGO_URL  ?? '',
      STORE_THEME:     config.STORE_THEME     ?? 'emerald',
      FACEBOOK_PIXEL_ID: config.FACEBOOK_PIXEL_ID ?? '',
      FACEBOOK_PAGE_ID:    config.FACEBOOK_PAGE_ID    ?? '',
      WHATSAPP_NUMBER:     config.WHATSAPP_NUMBER     ?? '',
      CONTACT_INSTAGRAM:   config.CONTACT_INSTAGRAM   ?? '',
      CONTACT_X:           config.CONTACT_X           ?? '',
      CONTACT_YOUTUBE:     config.CONTACT_YOUTUBE     ?? '',
      DELIVERY_MODE:    (config.DELIVERY_MODE === 'FREE' ? 'FREE' : 'PAID') as 'FREE' | 'PAID',
      DELIVERY_ENABLED: config.DELIVERY_ENABLED !== 'false',
    }, { headers: { 'Cache-Control': 'public, max-age=60' } })
  } catch {
    return Response.json({ FREE_DELIVERY_THRESHOLD: 5000, STORE_NAME: process.env.NEXT_PUBLIC_STORE_NAME ?? 'Balapasa', STORE_PHONE: '', STORE_EMAIL: '', STORE_ADDRESS: '', STORE_LOGO_URL: '', WHATSAPP_NUMBER: '', DELIVERY_MODE: 'PAID' as const, DELIVERY_ENABLED: true, enabledPaymentMethods: ['COD', 'ESEWA', 'KHALTI'] })
  }
}
