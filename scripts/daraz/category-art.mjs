// Gives categories a picture, an icon and a colour when they have none, so category tiles in the
// site and the mobile app are not blank. Anything an admin has already set is left alone.

const ICONS = {
  'health-beauty': '💄', 'kitchen-dining': '🍳', 'furniture-decor': '🛋️', 'tools-diy-outdoor': '🛠️',
  'motors': '🏍️', 'laundry-cleaning': '🧺', 'home-appliances': '🔌', 'bedding-bath': '🛁',
  'stationery-craft': '✏️', 'sports-outdoors': '⚽', 'mobiles-tablets': '📱', 'fashion': '👕',
  'mother-baby': '🍼', 'bags-and-travel': '🎒', 'toys-games': '🧸', 'cameras': '📷',
  'watches-sunglasses-jewellery': '⌚', 'tv-audio-video-gaming-wearables': '📺', 'groceries': '🛒',
  'computers-laptops': '💻',
}
const DEFAULT_ICON = '🛍️'
const DEFAULT_COLOR = '#16A34A'
const PALETTE = ['#EC4899', '#F59E0B', '#8B5CF6', '#0EA5E9', '#EF4444', '#14B8A6', '#6366F1', '#F97316', '#10B981', '#D946EF']

export async function refreshCategoryArt(db) {
  const cats = (await db.query(`SELECT id, slug, color, icon, image FROM categories ORDER BY name`)).rows
  let changed = 0
  for (const [i, c] of cats.entries()) {
    const set = {}
    if (!c.image) {
      // The most viewed product's first picture; the newest one when nothing has been viewed yet.
      const pick = (await db.query(
        `SELECT images[1] AS image FROM products
          WHERE category_id = $1 AND is_active AND cardinality(images) > 0
          ORDER BY view_count DESC, created_at DESC LIMIT 1`, [c.id])).rows[0]
      if (pick?.image) set.image = pick.image
    }
    if (!c.icon) set.icon = ICONS[c.slug] ?? DEFAULT_ICON
    // Only recolour categories still on the default, so every tile is not the same green.
    if (c.color === DEFAULT_COLOR && cats.filter(x => x.color === DEFAULT_COLOR).length > 3) set.color = PALETTE[i % PALETTE.length]
    const keys = Object.keys(set)
    if (keys.length === 0) continue
    await db.query(`UPDATE categories SET ${keys.map((k, n) => `${k} = $${n + 2}`).join(', ')} WHERE id = $1`, [c.id, ...keys.map(k => set[k])])
    c.color = set.color ?? c.color
    changed++
  }
  return changed
}
