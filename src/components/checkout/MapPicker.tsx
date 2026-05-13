'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Crosshair, MapPin, Check, Loader2, AlertCircle, Search } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

interface PickedAddress {
  lat:     number
  lng:     number
  street?: string
  suburb?: string
}

interface Props {
  initialLat:    number | null
  initialLng:    number | null
  municipality?: string
  district?:     string
  onCancel:      () => void
  onConfirm:     (a: PickedAddress) => void
}

// Default to Kathmandu Durbar Square — central, recognizable, dense map data.
const DEFAULT_CENTER: [number, number] = [27.7044, 85.3074]
const DEFAULT_ZOOM   = 13

export default function MapPicker({
  initialLat, initialLng, municipality, district, onCancel, onConfirm,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Using `any` for Leaflet types to avoid pulling its full types into the bundle.
  // It's a one-off integration and the API surface we use is tiny.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef       = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef    = useRef<any>(null)
  const [coords,  setCoords]  = useState<[number, number] | null>(
    initialLat != null && initialLng != null ? [initialLat, initialLng] : null,
  )
  const [reverseAddress, setReverseAddress] = useState<PickedAddress | null>(null)
  const [reverseLoading, setReverseLoading] = useState(false)
  const [geoLoading,     setGeoLoading]     = useState(false)
  const [geoError,       setGeoError]       = useState<string | null>(null)
  const [mapReady,       setMapReady]       = useState(false)

  // ── Initialize Leaflet map on mount ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function init() {
      // Dynamic import: Leaflet touches `window` and must run client-side.
      const L = (await import('leaflet')).default

      if (cancelled || !containerRef.current) return

      // Pick the initial center: existing pin > forward-geocoded municipality > default
      let center: [number, number] = DEFAULT_CENTER
      let zoom = DEFAULT_ZOOM
      if (initialLat != null && initialLng != null) {
        center = [initialLat, initialLng]
        zoom   = 17
      } else if (municipality) {
        // Forward-geocode the municipality (cheap — server-cached)
        try {
          const params = new URLSearchParams({
            q:            district ? `${municipality}, ${district}` : municipality,
            limit:        '1',
          })
          const res = await fetch(`/api/geocode/search?${params}`)
          if (res.ok) {
            const data = await res.json() as { results: { lat: number; lon: number }[] }
            if (data.results[0]) {
              center = [data.results[0].lat, data.results[0].lon]
              zoom   = 14
            }
          }
        } catch { /* fall back to default */ }
      }

      if (cancelled) return

      // Leaflet's default marker icon URLs assume webpack/cra asset paths; in Next we
      // point at the public CDN copies that ship with the leaflet package on the CDN.
      const iconUrl       = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png'
      const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png'
      const shadowUrl     = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'

      const map = L.map(containerRef.current, {
        center, zoom, zoomControl: true, attributionControl: true,
      })

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom:     19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)

      const markerIcon = L.icon({
        iconUrl, iconRetinaUrl, shadowUrl,
        iconSize:     [25, 41],
        iconAnchor:   [12, 41],
        popupAnchor:  [1, -34],
        shadowSize:   [41, 41],
      })

      function setPin(lat: number, lng: number) {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else {
          markerRef.current = L.marker([lat, lng], { icon: markerIcon, draggable: true }).addTo(map)
          markerRef.current.on('dragend', () => {
            const p = markerRef.current.getLatLng()
            setCoords([p.lat, p.lng])
          })
        }
        setCoords([lat, lng])
      }

      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        setPin(e.latlng.lat, e.latlng.lng)
      })

      if (coords) setPin(coords[0], coords[1])

      mapRef.current = map
      setMapReady(true)

      // Map containers sometimes paint at wrong size when rendered inside
      // a modal that animates in — force a recompute.
      setTimeout(() => map.invalidateSize(), 100)
    }

    init().catch(e => console.warn('[MapPicker init]', e))

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Reverse-geocode whenever the pin moves ────────────────────────────────
  useEffect(() => {
    if (!coords) { setReverseAddress(null); return }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setReverseLoading(true)
      try {
        const params = new URLSearchParams({
          lat: String(coords[0]),
          lon: String(coords[1]),
        })
        const res = await fetch(`/api/geocode/reverse?${params}`, { signal: ctrl.signal })
        if (!res.ok) return
        const data = await res.json() as {
          result: null | { road?: string; suburb?: string; displayName?: string }
        }
        if (data.result) {
          setReverseAddress({
            lat:    coords[0],
            lng:    coords[1],
            street: data.result.road,
            suburb: data.result.suburb,
          })
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return
      } finally {
        setReverseLoading(false)
      }
    }, 500)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [coords])

  // ── "Use my current location" ─────────────────────────────────────────────
  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError('Your browser does not support geolocation.')
      return
    }
    setGeoLoading(true); setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords([lat, lng])
        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([lat, lng], 17)
          markerRef.current.setLatLng([lat, lng])
        } else if (mapRef.current) {
          // First-time pin via geolocation
          mapRef.current.setView([lat, lng], 17)
          mapRef.current.fire('click', { latlng: { lat, lng } })
        }
        setGeoLoading(false)
      },
      (err) => {
        setGeoLoading(false)
        const msg = err.code === err.PERMISSION_DENIED
          ? 'Location permission denied. Allow it in your browser settings or tap the map instead.'
          : err.code === err.POSITION_UNAVAILABLE
          ? 'Could not determine your location. Tap on the map to drop a pin.'
          : 'Location lookup timed out. Tap on the map to drop a pin.'
        setGeoError(msg)
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  function confirm() {
    if (!coords) return
    onConfirm({
      lat:    coords[0],
      lng:    coords[1],
      street: reverseAddress?.street,
      suburb: reverseAddress?.suburb,
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Pin your delivery location">
      <div className="m-auto w-full max-w-3xl h-[90vh] max-h-[720px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary-bg flex items-center justify-center shrink-0">
              <MapPin size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading font-extrabold text-base text-slate-900 truncate">Pin your delivery location</h2>
              <p className="text-[11px] text-slate-500 truncate">
                Tap the map or use the location button — the rider will use this exact point.
              </p>
            </div>
          </div>
          <button type="button" onClick={onCancel}
            aria-label="Close map"
            className="shrink-0 w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Map */}
        <div className="relative flex-1 min-h-0">
          <div ref={containerRef} className="absolute inset-0" />
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Loader2 size={16} className="animate-spin" /> Loading map…
              </div>
            </div>
          )}

          {/* Use my location button (overlay) */}
          <button
            type="button"
            onClick={useMyLocation}
            disabled={geoLoading}
            className="absolute top-3 right-3 z-[401] flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 hover:text-primary text-xs font-bold rounded-xl shadow-lg disabled:opacity-60 cursor-pointer transition-colors"
          >
            {geoLoading
              ? <><Loader2 size={13} className="animate-spin" /> Locating…</>
              : <><Crosshair size={13} /> Use my location</>}
          </button>

          {geoError && (
            <div className="absolute bottom-3 left-3 right-3 z-[401] flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 shadow-lg">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-600 font-medium leading-relaxed">{geoError}</p>
              <button type="button" onClick={() => setGeoError(null)} className="text-red-400 hover:text-red-600 cursor-pointer shrink-0">
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Footer with confirm */}
        <div className="border-t border-slate-100 p-4 bg-slate-50/60">
          {coords ? (
            <div className="mb-3 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-white border border-slate-100">
              <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800">
                  Pin selected
                  <span className="ml-2 font-mono font-normal text-slate-400">{coords[0].toFixed(5)}, {coords[1].toFixed(5)}</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                  {reverseLoading ? (
                    <><Loader2 size={10} className="animate-spin" /> Looking up address…</>
                  ) : reverseAddress?.street || reverseAddress?.suburb ? (
                    <><Search size={10} /> {[reverseAddress.street, reverseAddress.suburb].filter(Boolean).join(' · ')}</>
                  ) : (
                    'Drag the pin to adjust if needed.'
                  )}
                </p>
              </div>
            </div>
          ) : (
            <p className="mb-3 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100 text-[11px] text-amber-700 font-medium">
              Tap on the map to drop a pin, or use the location button above.
            </p>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="button" onClick={confirm}
              disabled={!coords}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-400 transition-colors cursor-pointer">
              <Check size={14} /> Confirm location
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
