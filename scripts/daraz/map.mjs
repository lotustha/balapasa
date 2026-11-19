// Pure mapping from a Daraz /products/get item to balapasa website rows. No I/O.

const SLUG_MAX = 80

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
  return { salePrice: special, startsAt, expiresAt }
}

const effectivePrice = (sku, now) => saleOf(sku, now)?.salePrice ?? Number(sku.price)

function dimension(v) {
  const n = parseFloat(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

const titleCase = key => key.replace(/_/g, ' ').trim().replace(/\S+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())

export function mapProduct(p, now) {
  if (p.status !== 'Active') return null
  const skus = (p.skus ?? []).filter(s => s.Status === 'active')
  if (skus.length === 0) return null

  const attrs = p.attributes ?? {}
  const name = String(attrs.name_en || attrs.name || '').trim()
  const base = skus.reduce((best, s) => (effectivePrice(s, now) < effectivePrice(best, now) ? s : best))
  const sale = saleOf(base, now)

  const multi = skus.length > 1
  const pricesDiffer = new Set(skus.map(s => effectivePrice(s, now))).size > 1

  const options = []
  if (multi) {
    for (const s of skus) {
      for (const [key, value] of Object.entries(s.saleProp ?? {})) {
        const optName = titleCase(key)
        let opt = options.find(o => o.name === optName)
        if (!opt) options.push(opt = { name: optName, values: [] })
        if (!opt.values.includes(String(value))) opt.values.push(String(value))
      }
    }
  }

  const variants = !multi ? [] : skus.map((s, i) => {
    const opts = Object.fromEntries(Object.entries(s.saleProp ?? {}).map(([k, v]) => [titleCase(k), String(v)]))
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
