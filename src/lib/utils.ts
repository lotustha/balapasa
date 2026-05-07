export function formatPrice(amount: number): string {
  // Use en-US for consistent number formatting across server (Node) and client (browser).
  // 'ne-NP' outputs Devanagari digits on some ICU builds causing SSR hydration mismatch.
  const n = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
  return `NPR ${n}`
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-NP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .trim()
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function discountPercent(original: number, sale: number): number {
  return Math.round(((original - sale) / original) * 100)
}

export function truncate(text: string, length: number): string {
  return text.length > length ? text.slice(0, length) + '…' : text
}
