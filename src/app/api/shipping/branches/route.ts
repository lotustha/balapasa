import { getBranches } from '@/lib/pickndrop'
import { getPicknDropConfig } from '@/lib/logistics-config'

export const revalidate = 3600

export async function GET() {
  const cfg = await getPicknDropConfig().catch(() => null)
  if (!cfg?.isActive || !cfg.apiKey || !cfg.apiSecret) {
    return Response.json({ branches: [], reason: 'pnd-inactive' })
  }
  const raw = await getBranches()
  const branches = raw
    .filter(b => b.status === 'Active')
    .map(b => ({
      branch_name: b.branch_name,
      branch_code: b.branch_code,
      area:        b.area ?? [],
    }))
  return Response.json({ branches })
}
