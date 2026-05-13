import { NextRequest } from 'next/server'
import { geocodeSearch } from '@/lib/geocode'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q            = searchParams.get('q')?.trim()
  const municipality = searchParams.get('municipality')?.trim() || undefined
  const limit        = Number(searchParams.get('limit') ?? '7')

  if (!q || q.length < 2) {
    return Response.json({ results: [] })
  }

  try {
    const results = await geocodeSearch({ q, municipality, limit })
    return Response.json({ results }, {
      headers: {
        // Allow short-term browser cache so back-button feels instant
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    })
  } catch (e) {
    console.warn('[geocode/search]', e)
    return Response.json({ results: [], error: 'geocode-failed' }, { status: 200 })
  }
}
