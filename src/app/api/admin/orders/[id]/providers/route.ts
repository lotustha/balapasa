import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { getPathaoConfig, getPicknDropConfig, type CarrierLimits } from '@/lib/logistics-config'
import { aggregateOrderPackage } from '@/lib/order-package'
import { exceeds, summarize, type Pkg } from '@/lib/carrier-limits'

type Ctx = { params: Promise<{ id: string }> }

// Per-provider availability for the admin order-assignment UI: whether the
// provider is enabled and whether THIS order's parcel fits its limits.
export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireRole('ADMIN')
  if ('error' in auth) return auth.error

  const { id } = await ctx.params

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true } })
  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 })

  const [pathao, pnd, pkg] = await Promise.all([
    getPathaoConfig(),
    getPicknDropConfig(),
    aggregateOrderPackage(id),
  ])

  const build = (label: string, active: boolean, limits: CarrierLimits, pkg: Pkg) => {
    const over = summarize(pkg, limits)
    const withinLimits = !exceeds(pkg, limits).any
    return {
      active,
      withinLimits,
      reason: withinLimits ? null : `Package ${over} for ${label}`,
      limits,
      pkg,
    }
  }

  return Response.json({
    PATHAO:    build('Pathao', pathao.isActive, pathao, pkg),
    PICKNDROP: build('Pick & Drop', pnd.isActive, pnd, pkg),
  })
}
