// Daraz buyer reviews → website reviews. Pure helpers for reviews-sync.mjs.

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
const UNIT_MS = { minute: 6e4, hour: 36e5, day: 864e5, week: 7 * 864e5, month: 30 * 864e5, year: 365 * 864e5 }

/** Daraz shows a review date as "18 Sep 2026" or as "2 weeks ago". Returns a Date, or `now` when unreadable. */
export function reviewDate(text, now = new Date()) {
  const s = String(text ?? '').trim().toLowerCase()
  const abs = /^(\d{1,2}) ([a-z]{3})[a-z]* (\d{4})$/.exec(s)
  if (abs && MONTHS[abs[2]] != null) return new Date(Date.UTC(+abs[3], MONTHS[abs[2]], +abs[1], 6))
  const rel = /^(\d+|an?) (minute|hour|day|week|month|year)s? ago$/.exec(s)
  if (rel) return new Date(now.getTime() - (/^an?$/.test(rel[1]) ? 1 : +rel[1]) * UNIT_MS[rel[2]])
  return now
}

/** A buyer's name is never shown in full: "Sita Sharma" → "S***a". */
export function maskName(name) {
  const letters = [...String(name ?? '').replace(/[*\s]+/g, '')]
  if (letters.length === 0) return 'Daraz buyer'
  if (letters.length === 1) return `${letters[0].toUpperCase()}***`
  return `${letters[0].toUpperCase()}***${letters[letters.length - 1]}`
}

const imageUrl = u => {
  const s = String(u ?? '').trim()
  if (!s) return null
  return s.startsWith('//') ? `https:${s}` : /^https:\/\//.test(s) ? s : null
}

/**
 * One review from Daraz's review list → the row stored on the website, or null when it should
 * not be shown (rejected by Daraz, no star rating, not a product review).
 */
export function mapReview(raw, now = new Date()) {
  const rating = Math.round(Number(raw?.rating))
  if (!raw?.reviewRateId || !(rating >= 1 && rating <= 5)) return null
  if (raw.rejected || (raw.reviewType && raw.reviewType !== 'PRODUCT_REVIEW')) return null
  const comment = String(raw.reviewContent ?? '').replace(/\s+/g, ' ').trim()
  const images = (raw.images ?? []).map(i => imageUrl(typeof i === 'string' ? i : i?.url)).filter(Boolean).slice(0, 4)
  return {
    externalId: `daraz-${raw.reviewRateId}`,
    rating,
    comment: comment ? comment.slice(0, 2000) : null,
    authorName: maskName(raw.buyerName),
    variant: String(raw.skuInfo ?? '').trim().slice(0, 120) || null,
    images,
    createdAt: reviewDate(raw.reviewTime, now),
  }
}
