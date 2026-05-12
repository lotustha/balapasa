// Client-safe tracking constants and types — no server-only imports.
// Pulled out of tracking.ts so client components can import them without
// dragging Prisma / pg into the browser bundle.

export interface TrackingEvent {
  at: string
  label: string
}

export interface CarrierStatus {
  provider:    'PATHAO' | 'PICKNDROP' | null
  label:       string | null
  liveStatus:  string | null
  mappedStage: number
  eta:         string | null
  rider:       { name: string; phone: string } | null
  events:      TrackingEvent[]
  trackingUrl: string | null
  fetchedAt:   string
  error:       string | null
  isMock:      boolean
}

export const ACTIVE_STATES = new Set(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'])
