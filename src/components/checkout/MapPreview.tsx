'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

interface Props {
  lat:    number
  lng:    number
  width?:  number
  height?: number
  zoom?:   number
}

export default function MapPreview({
  lat, lng, width = 120, height = 76, zoom = 16,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef       = useRef<any>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, {
        center:               [lat, lng],
        zoom,
        // Non-interactive — purely visual
        dragging:             false,
        scrollWheelZoom:      false,
        doubleClickZoom:      false,
        boxZoom:              false,
        keyboard:             false,
        touchZoom:            false,
        zoomControl:          false,
        attributionControl:   false,
      })

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map)

      // Custom div icon so we don't need to load the marker image set just for a thumbnail
      const pinHtml = `
        <div style="position:relative;width:18px;height:24px;">
          <svg viewBox="0 0 24 32" width="18" height="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.4 0 0 5.4 0 12c0 8.5 12 20 12 20s12-11.5 12-20C24 5.4 18.6 0 12 0z" fill="#16A34A"/>
            <circle cx="12" cy="12" r="4" fill="#FFFFFF"/>
          </svg>
        </div>
      `
      const icon = L.divIcon({
        html:        pinHtml,
        iconSize:    [18, 24],
        iconAnchor:  [9, 24],
        className:   'bp-map-preview-pin',
      })
      L.marker([lat, lng], { icon, interactive: false }).addTo(map)

      mapRef.current = map
      // Force size recompute in case the container animated in
      setTimeout(() => map.invalidateSize(), 80)
    }

    init().catch(() => {})

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [lat, lng, zoom])

  return (
    <div
      ref={containerRef}
      style={{ width, height }}
      className="shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 pointer-events-none"
      aria-hidden="true"
    />
  )
}
