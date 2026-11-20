import { prisma } from '@/lib/prisma'
import { CONTROL_KEY, parseControls } from '../../scripts/daraz/controls.mjs'

export async function getDarazControls() {
  const row = await prisma.appSetting.findUnique({ where: { key: CONTROL_KEY } }).catch(() => null)
  return parseControls(row?.value)
}

export const DARAZ_JOBS = {
  website: { label: 'Website sync',    script: 'daily-sync.mjs',  schedule: 'Daily, 06:15' },
  mirror:  { label: 'Daraz shop sync', script: 'mirror-sync.mjs', schedule: 'Daily, 06:30' },
  orders:  { label: 'Daraz orders',    script: 'orders-sync.mjs', schedule: 'Every 15 minutes' },
} as const

export type DarazJob = keyof typeof DARAZ_JOBS

export interface HeldPrice {
  id: string; sku: string; name: string
  oldPrice: number; newPrice: number; oldSalePrice: number | null; newSalePrice: number | null
  changePercent: number; createdAt: Date
}

/** Price moves the sync is holding back: the newest hold per product that is still not the live price. */
export function getHeldPrices(): Promise<HeldPrice[]> {
  return prisma.$queryRaw<HeldPrice[]>`
    SELECT DISTINCT ON (h.sku)
           h.id, h.sku, h.name, h.old_price AS "oldPrice", h.new_price AS "newPrice",
           h.old_sale_price AS "oldSalePrice", h.new_sale_price AS "newSalePrice",
           h.change_percent AS "changePercent", h.created_at AS "createdAt"
      FROM price_history h
      JOIN products p ON p.sku = h.sku
     WHERE h.status = 'HELD'
       AND NOT EXISTS (SELECT 1 FROM price_history n WHERE n.sku = h.sku AND n.created_at > h.created_at)
       AND (p.price <> h.new_price OR p.sale_price IS DISTINCT FROM h.new_sale_price)
     ORDER BY h.sku, h.created_at DESC
  `
}
