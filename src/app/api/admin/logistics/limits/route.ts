import { requireRole } from '@/lib/auth'
import { getPathaoConfig, getPicknDropConfig } from '@/lib/logistics-config'

// Per-provider active flag + parcel limits, with no credentials. Drives the
// carrier-limit warning on the product add/edit form.
export async function GET() {
  const auth = await requireRole('ADMIN')
  if ('error' in auth) return auth.error

  const [pathao, pnd] = await Promise.all([getPathaoConfig(), getPicknDropConfig()])

  const shape = (c: { isActive: boolean; maxWeightKg: number; maxLengthCm: number; maxWidthCm: number; maxHeightCm: number }) => ({
    active:      c.isActive,
    maxWeightKg: c.maxWeightKg,
    maxLengthCm: c.maxLengthCm,
    maxWidthCm:  c.maxWidthCm,
    maxHeightCm: c.maxHeightCm,
  })

  return Response.json({ pathao: shape(pathao), pickndrop: shape(pnd) })
}
