import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { invalidatePathaoCache, invalidatePndCache, seedDefaultsIfMissing } from '@/lib/logistics-config'
import {
  invalidatePndBranchCache,
  invalidatePndRateCache,
  fetchBusinessAddressesWithCreds,
  fetchBranchesWithCreds,
  parseVendorAddress,
} from '@/lib/pickndrop'

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

    // Snapshot the previous row so we can detect credential changes for PnD.
    const prev = await prisma.logisticsSettings.findUnique({ where: { provider } })

    let row = await prisma.logisticsSettings.upsert({
      where:  { provider },
      create: { provider, ...data },
      update: data,
    })

    // Bust the in-memory config cache
    if (provider === 'PATHAO')    invalidatePathaoCache()
    if (provider === 'PICKNDROP') {
      invalidatePndCache()
      invalidatePndBranchCache()
      invalidatePndRateCache()
    }

    // Also invalidate Pathao auth token when credentials change
    if (provider === 'PATHAO' && (data.clientId || data.clientSecret)) {
      try {
        await prisma.pathaoToken.deleteMany()
      } catch { /* no tokens to delete */ }
    }

    // PnD vendor-address auto-fetch: when credentials change, pull the
    // registered vendor address from logi360.api.business_address and use it
    // to populate storeName/storeAddress + parse out the three pickup atoms.
    // We only fire this if (a) creds were touched, or (b) the storeAddress is
    // still empty — so saving an isActive toggle doesn't hammer the API.
    let vendorSync: { vendorName?: string; vendorAddress?: string; parsed?: ReturnType<typeof parseVendorAddress>; error?: string } | undefined
    if (provider === 'PICKNDROP') {
      const credsChanged =
        (data.apiKey    && data.apiKey    !== prev?.apiKey)    ||
        (data.apiSecret && data.apiSecret !== prev?.apiSecret) ||
        (data.baseUrl   && data.baseUrl   !== prev?.baseUrl)
      const addressMissing = !row.storeAddress
      if ((credsChanged || addressMissing) && row.apiKey && row.apiSecret && row.baseUrl) {
        const cfg = { baseUrl: row.baseUrl, apiKey: row.apiKey, apiSecret: row.apiSecret }
        const [biz, branches] = await Promise.all([
          fetchBusinessAddressesWithCreds(cfg),
          fetchBranchesWithCreds(cfg),
        ])
        if (biz && biz.addresses[0]) {
          const vendorAddress = biz.addresses[0]
          const parsed        = parseVendorAddress(vendorAddress, branches)
          row = await prisma.logisticsSettings.update({
            where: { provider },
            data: {
              storeName:      biz.vendor_name || row.storeName,
              storeAddress:   vendorAddress,
              pickupBranch:   parsed.pickupBranch   ?? row.pickupBranch,
              pickupArea:     parsed.pickupArea     ?? row.pickupArea,
              pickupLocation: parsed.pickupLocation ?? row.pickupLocation,
            },
          })
          invalidatePndCache()
          vendorSync = { vendorName: biz.vendor_name, vendorAddress, parsed }
        } else {
          vendorSync = { error: 'business_address API returned no usable address — check credentials' }
        }
      }
    }

    return Response.json({ setting: row, vendorSync })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
