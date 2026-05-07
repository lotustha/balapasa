import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { invalidatePathaoCache, invalidatePndCache, seedDefaultsIfMissing } from '@/lib/logistics-config'

export async function GET() {
  await seedDefaultsIfMissing()
  try {
    const rows = await prisma.logisticsSettings.findMany({ orderBy: { provider: 'asc' } })
    return Response.json({ settings: rows })
  } catch {
    return Response.json({ error: 'DB unavailable' }, { status: 503 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { provider, ...data } = await req.json()
    if (!provider) return Response.json({ error: 'provider required' }, { status: 400 })

    const row = await prisma.logisticsSettings.upsert({
      where:  { provider },
      create: { provider, ...data },
      update: data,
    })

    // Bust the in-memory config cache
    if (provider === 'PATHAO')    invalidatePathaoCache()
    if (provider === 'PICKNDROP') invalidatePndCache()

    // Also invalidate Pathao auth token when credentials change
    if (provider === 'PATHAO' && (data.clientId || data.clientSecret)) {
      try {
        await prisma.pathaoToken.deleteMany()
      } catch { /* no tokens to delete */ }
    }

    return Response.json({ setting: row })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
