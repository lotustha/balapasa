import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPathaoConfig, getPicknDropConfig } from '@/lib/logistics-config'

// Fallback if neither logistics config has a store location set
const FALLBACK_LAT = 27.7172
const FALLBACK_LON = 85.3240
const FALLBACK_LABEL = 'Kathmandu'

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
    if (data.cod && String(data.cod) !== '200') return null
    return data
  } catch { return null }
}

// Resolves the store's weather. Priority:
//   1. Pathao storeLat/storeLng (most precise — set in admin Settings)
//   2. PnD pickupArea (city name — uses OWM city lookup)
//   3. Fallback: hardcoded Kathmandu coords
async function fetchStoreWeather(apiKey: string): Promise<{ data: OWMPayload | null; label: string }> {
  const [pathao, pnd] = await Promise.all([
    getPathaoConfig().catch(() => null),
    getPicknDropConfig().catch(() => null),
  ])

  if (pathao?.storeLat && pathao?.storeLng) {
    const data = await owmByCoords(pathao.storeLat, pathao.storeLng, apiKey)
    if (data) return { data, label: pathao.storeName || data.name || FALLBACK_LABEL }
  }

  if (pnd?.pickupArea) {
    const data = await owmByCity(pnd.pickupArea, apiKey)
    if (data) return { data, label: pnd.pickupArea }
  }

  const data = await owmByCoords(FALLBACK_LAT, FALLBACK_LON, apiKey)
  return { data, label: FALLBACK_LABEL }
}

async function getOpenWeatherKey(): Promise<string | null> {
  try {
    const row = await prisma.$queryRaw<{ value: string }[]>`
      SELECT value FROM app_settings WHERE key = 'OPENWEATHER_API_KEY' LIMIT 1
    `
    if (row[0]?.value) return row[0].value
  } catch { /* DB unavailable — fall through */ }
  return null
}

export async function POST(req: Request) {
  const apiKey = await getOpenWeatherKey()
  if (!apiKey) return NextResponse.json({ error: 'not_configured' }, { status: 503 })

  const { municipality, district } = (await req.json()) as {
    municipality: string
    district: string
  }

  const [storeRes, destByMunicipality, destByDistrict] = await Promise.all([
    fetchStoreWeather(apiKey),
    municipality ? owmByCity(municipality, apiKey) : Promise.resolve(null),
    district     ? owmByCity(district, apiKey)     : Promise.resolve(null),
  ])

  const destination = destByMunicipality ?? destByDistrict

  return NextResponse.json({ store: storeRes.data, storeLabel: storeRes.label, destination })
}
