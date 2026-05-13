import { NextRequest } from 'next/server'
import { geocodeReverse } from '@/lib/geocode'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = Number(searchParams.get('lat'))
  const lon = Number(searchParams.get('lon'))

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ error: 'lat and lon are required numbers' }, { status: 400 })
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return Response.json({ error: 'lat/lon out of range' }, { status: 400 })
  }

  try {
    const result = await geocodeReverse({ lat, lon })
    if (!result) return Response.json({ result: null }, { status: 200 })
    return Response.json({ result }, {
      headers: { 'Cache-Control': 'public, max-age=600, s-maxage=600' },
    })
  } catch (e) {
    console.warn('[geocode/reverse]', e)
    return Response.json({ result: null, error: 'geocode-failed' }, { status: 200 })
  }
}
