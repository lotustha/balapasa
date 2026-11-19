// Pure mapping from a Daraz /products/get item to balapasa website rows. No I/O.

const SLUG_MAX = 80
const OPEN_ENDED_MS = 365 * 24 * 60 * 60 * 1000

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// Daraz sale times are 'yyyy-MM-dd HH:mm:ss' in Nepal time.
function parseNepalTime(s) {
  if (!s) return null
  const d = new Date(`${String(s).trim().replace(' ', 'T')}+05:45`)
  return Number.isNaN(d.getTime()) ? null : d
}

function saleOf(sku, now) {
  const special = Number(sku.special_price) || 0
  const price = Number(sku.price)
  if (special <= 0 || special >= price) return null
  const startsAt = parseNepalTime(sku.special_from_time)
  const expiresAt = parseNepalTime(sku.special_to_time)
  if (startsAt && startsAt > now) return null
  if (expiresAt && expiresAt <= now) return null
  // Daraz "permanent" discounts end in 2099; a real end date would render a countdown.
  const openEnded = !expiresAt || expiresAt - now > OPEN_ENDED_MS
  return { salePrice: special, startsAt: null, expiresAt: openEnded ? null : expiresAt }
}

const effectivePrice = (sku, now) => saleOf(sku, now)?.salePrice ?? Number(sku.price)

function dimension(v) {
  const n = parseFloat(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

const COLOR_WORDS = new Set(('black white grey gray silver gold golden pink green blue brown red yellow purple orange beige cream ivory '
  + 'khaki maroon navy sky rose violet turquoise teal coffee champagne transparent clear multicolor multicolour multi colour color '
  + 'dark light matte glossy antique deep pastel neon army wine off').split(' '))
const isColor = value => String(value).toLowerCase().split(/[^a-z]+/).filter(Boolean).every(w => COLOR_WORDS.has(w))

// Daraz files every variant type under a colour property, including things like "10 PC SET".
function optionName(key, values) {
  if (!/colou?r/i.test(key)) return titleCase(key)
  return values.length > 0 && values.every(isColor) ? 'Color' : 'Variant'
}

const titleCase = key => key.replace(/_/g, ' ').trim().replace(/\S+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())

export function mapProduct(p, now) {
  if (p.status !== 'Active') return null
  const active = (p.skus ?? []).filter(s => s.Status === 'active' && Number(s.price) > 0)
  if (active.length === 0) return null

  const attrs = p.attributes ?? {}
  const name = String(attrs.name_en || attrs.name || '').trim()
  const base = active.reduce((best, s) => (effectivePrice(s, now) < effectivePrice(best, now) ? s : best))
  // The storefront opens on the first variant; keep it the one whose price the listing shows.
  const skus = [base, ...active.filter(s => s !== base)]
  const sale = saleOf(base, now)

  const multi = skus.length > 1
  const pricesDiffer = new Set(skus.map(s => effectivePrice(s, now))).size > 1

  const propValues = new Map()
  if (multi) {
    for (const s of skus) {
      for (const [key, value] of Object.entries(s.saleProp ?? {})) {
        if (!propValues.has(key)) propValues.set(key, [])
        if (!propValues.get(key).includes(String(value))) propValues.get(key).push(String(value))
      }
    }
  }
  const nameOfProp = new Map([...propValues].map(([key, values]) => [key, optionName(key, values)]))
  const options = [...propValues].map(([key, values]) => ({ name: nameOfProp.get(key), values }))

  const variants = !multi ? [] : skus.map((s, i) => {
    const opts = Object.fromEntries(Object.entries(s.saleProp ?? {}).map(([k, v]) => [nameOfProp.get(k), String(v)]))
    return {
      sku: `DZ-${s.SkuId}`,
      title: Object.values(opts).join(' / ') || `Option ${i + 1}`,
      price: pricesDiffer ? effectivePrice(s, now) : null,
      stock: Number(s.quantity) || 0,
      image: s.Images?.[0] ?? null,
      options: opts,
    }
  })

  const brand = String(attrs.brand ?? '').trim()

  return {
    sku: `DZ-${p.item_id}`,
    name,
    slug: `${slugify(name).slice(0, SLUG_MAX).replace(/-+$/, '')}-${p.item_id}`,
    description: `${attrs.short_description ?? ''}${attrs.description ?? ''}`.trim() || name,
    price: Number(base.price),
    salePrice: sale?.salePrice ?? null,
    salePriceStartsAt: sale?.startsAt ?? null,
    salePriceExpiresAt: sale?.expiresAt ?? null,
    stock: skus.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0),
    images: [...new Set(p.images ?? [])],
    brand: !brand || brand.toLowerCase() === 'no brand' ? null : brand,
    darazCategoryId: String(p.primary_category),
    weight: dimension(base.package_weight),
    length: dimension(base.package_length),
    width: dimension(base.package_width),
    height: dimension(base.package_height),
    options,
    variants,
  }
}
