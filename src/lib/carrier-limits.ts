import type { CarrierLimits } from '@/lib/logistics-config'

export type { CarrierLimits }

// A physical parcel. A 0 on any axis means "unknown" — we never flag unknown
// data as over-limit, so missing product weights/dimensions don't block a carrier.
export interface Pkg {
  weightKg: number
  lengthCm: number
  widthCm:  number
  heightCm: number
}

export interface ExceedResult {
  weight: boolean
  length: boolean
  width:  boolean
  height: boolean
  any:    boolean
}

// True on an axis only when BOTH the package value and the limit are known
// (> 0) and the package exceeds the limit.
export function exceeds(pkg: Pkg, limits: CarrierLimits): ExceedResult {
  const over = (val: number, max: number) => val > 0 && max > 0 && val > max
  const weight = over(pkg.weightKg, limits.maxWeightKg)
  const length = over(pkg.lengthCm, limits.maxLengthCm)
  const width  = over(pkg.widthCm,  limits.maxWidthCm)
  const height = over(pkg.heightCm, limits.maxHeightCm)
  return { weight, length, width, height, any: weight || length || width || height }
}

// Short human reason, e.g. "exceeds 25 kg weight limit" or
// "exceeds 60 cm size limit". Returns null when nothing is over.
export function summarize(pkg: Pkg, limits: CarrierLimits): string | null {
  const e = exceeds(pkg, limits)
  if (!e.any) return null
  if (e.weight) return `exceeds ${limits.maxWeightKg} kg weight limit`
  const axis = e.length
    ? `${limits.maxLengthCm} cm length`
    : e.width
    ? `${limits.maxWidthCm} cm width`
    : `${limits.maxHeightCm} cm height`
  return `exceeds ${axis} limit`
}
