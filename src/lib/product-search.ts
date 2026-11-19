import { prisma } from '@/lib/prisma'

// One product search for the whole storefront (results page, navbar suggestions, mobile app), so
// they always agree. Ranks exact phrases first, then names containing every word, then close
// spellings (PostgreSQL pg_trgm: "bottel" finds "bottle"), then brand / SKU / tag / description hits.

const MAX_MATCHES = 200
// word_similarity of a misspelled word against a name it belongs to is ~0.55-0.8; unrelated text ~0.2.
const FUZZY_THRESHOLD = 0.45
const MAX_QUERY_LENGTH = 80

export function normalizeQuery(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH)
}

/** Ids of active products matching `query`, best match first. Empty array when nothing matches. */
export async function searchProductIds(query: string): Promise<string[]> {
  const q = normalizeQuery(query)
  if (!q) return []
  const words = q.toLowerCase().split(' ').filter(w => w.length > 1)
  const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`

  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM (
        SELECT id, view_count, created_at,
          CASE
            WHEN name ILIKE ${like} THEN 4
            WHEN ${words}::text[] <> '{}' AND (SELECT bool_and(name ILIKE '%' || w || '%') FROM unnest(${words}::text[]) AS w) THEN 3
            WHEN word_similarity(${q}, name) >= ${FUZZY_THRESHOLD} THEN 2
            WHEN brand ILIKE ${like} OR sku ILIKE ${like} OR ${q} = ANY(tags) OR description ILIKE ${like} THEN 1
            ELSE 0
          END AS tier,
          word_similarity(${q}, name) AS closeness
        FROM products
        WHERE is_active
      ) ranked
      WHERE tier > 0
      ORDER BY tier DESC, closeness DESC, view_count DESC, created_at DESC
      LIMIT ${MAX_MATCHES}
    `
    return rows.map(r => r.id)
  } catch (err) {
    // pg_trgm not installed on this database: fall back to plain matching rather than failing search.
    console.warn('[search] fuzzy search unavailable, using plain matching:', err instanceof Error ? err.message.slice(0, 120) : err)
    const rows = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name:        { contains: q, mode: 'insensitive' } },
          { brand:       { contains: q, mode: 'insensitive' } },
          { sku:         { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { tags:        { hasSome: [q] } },
        ],
      },
      select: { id: true },
      orderBy: { viewCount: 'desc' },
      take: MAX_MATCHES,
    })
    return rows.map(r => r.id)
  }
}

/** Records a search someone ran, so the admin can see what shoppers look for and do not find. */
export function logSearch(query: string, results: number): void {
  const q = normalizeQuery(query).toLowerCase()
  if (q.length < 3) return
  prisma.searchLog.create({ data: { query: q, results } }).catch(() => {})
}
