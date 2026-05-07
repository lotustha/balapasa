import { NextRequest } from 'next/server'
import { estimateDelivery } from '@/lib/pathao'

export async function POST(req: NextRequest) {
  try {
    const { receiverLat, receiverLng, receiverAddress, totalValue, isCodActive } = await req.json()
    const data = await estimateDelivery({ receiverLat, receiverLng, receiverAddress, totalValue, isCodActive })
    return Response.json(data)
  } catch (e) {
    return Response.json({ error: 'Pathao estimate failed' }, { status: 500 })
  }
}
