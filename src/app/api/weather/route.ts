import { NextResponse } from 'next/server'

// Store is always Kathmandu — use precise coords for reliability
const STORE_LAT = 27.7172
const STORE_LON = 85.3240

interface OWMPayload {
  weather: { id: number; main: string; description: string }[]
  main: { temp: number; feels_like: number; humidity: number }
  wind: { speed: number }
  name: string
  cod?: number | string
}

async function owmByCoords(lat: number, lon: number, key: string): Promise<OWMPayload | null> {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric`,
      { next: { revalidate: 600 } },
    )
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

async function owmByCity(city: string, key: string): Promise<OWMPayload | null> {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},NP&appid=${key}&units=metric`,
      { next: { revalidate: 600 } },
    )
    if (!res.ok) return null
    const data: OWMPayload = await res.json()
    // OWM returns cod:404 as a string when city not found
    if (data.cod && String(data.cod) !== '200') return null
    return data
  } catch { return null }
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'not_configured' }, { status: 503 })

  const { municipality, district } = (await req.json()) as {
    municipality: string
    district: string
  }

  const [store, destByMunicipality, destByDistrict] = await Promise.all([
    owmByCoords(STORE_LAT, STORE_LON, apiKey),
    municipality ? owmByCity(municipality, apiKey) : Promise.resolve(null),
    district     ? owmByCity(district, apiKey)     : Promise.resolve(null),
  ])

  // Prefer municipality name; fall back to district if OWM doesn't recognise it
  const destination = destByMunicipality ?? destByDistrict

  return NextResponse.json({ store, destination })
}
