// Picks which imported products the homepage shows as "new" and "featured". Pure.
//
// Daraz has no such flags, so they are derived: "new" is the most recently listed products, and
// "featured" is a spread of the best discounts and most viewed products that are not already "new".

const MAX_FEATURED_PER_CATEGORY = 2
// A view is worth this many discount percentage points, capped so one viral product cannot
// outweigh a real 50% discount.
const POINTS_PER_VIEW = 0.2
const MAX_VIEW_POINTS = 40

function discountPercent(p) {
  const price = Number(p.price), sale = Number(p.salePrice)
  return p.salePrice != null && price > 0 && sale < price ? ((price - sale) / price) * 100 : 0
}

const score = p => discountPercent(p) + Math.min(MAX_VIEW_POINTS, Number(p.viewCount || 0) * POINTS_PER_VIEW)

export function chooseFlags(products, { newCount = 12, featuredCount = 12 } = {}) {
  const available = products.filter(p => Number(p.stock) > 0)

  const newIds = [...available]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, newCount)
    .map(p => p.id)
  const isNew = new Set(newIds)

  const featuredIds = []
  const perCategory = new Map()
  const ranked = available.filter(p => !isNew.has(p.id)).sort((a, b) => score(b) - score(a) || new Date(b.createdAt) - new Date(a.createdAt))
  for (const p of ranked) {
    if (featuredIds.length >= featuredCount) break
    const used = perCategory.get(p.categoryId) ?? 0
    if (used >= MAX_FEATURED_PER_CATEGORY) continue
    perCategory.set(p.categoryId, used + 1)
    featuredIds.push(p.id)
  }
  return { newIds, featuredIds }
}
