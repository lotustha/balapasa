// Some sellers list each variant of one product as its own Daraz item, named "Base : Variant".
// mergeFamilies folds those into a single Daraz-shaped product with one SKU per original item,
// so mapProduct turns them into one website product with variants. Pure; inputs are not mutated.

const SEPARATOR = ' : '
const DEFAULT_PROP = 'color_family'

const activeSkus = p => (p.skus ?? []).filter(s => s.Status === 'active')
const nameOf = p => String(p.attributes?.name_en || p.attributes?.name || '')

function familyBase(p) {
  if (p.status !== 'Active' || activeSkus(p).length !== 1) return null
  const name = nameOf(p)
  const i = name.indexOf(SEPARATOR)
  return i > 0 ? name.slice(0, i).trim() : null
}

export function mergeFamilies(products) {
  const groups = new Map()
  for (const p of products) {
    const base = familyBase(p)
    if (!base) continue
    if (!groups.has(base)) groups.set(base, [])
    groups.get(base).push(p)
  }

  const merged = new Set()
  const families = []
  for (const [base, members] of groups) {
    if (members.length < 2) continue
    members.sort((a, b) => Number(a.item_id) - Number(b.item_id))
    members.forEach(m => merged.add(m))

    const props = members.map(m => Object.entries(activeSkus(m)[0].saleProp ?? {})[0] ?? [])
    const labels = props.map(([, value]) => String(value ?? '').trim())
    const distinct = labels.every(Boolean) && new Set(labels.map(l => l.toLowerCase())).size === labels.length
    const propKey = props[0][0] ?? DEFAULT_PROP

    const first = members[0]
    families.push({
      ...first,
      attributes: { ...first.attributes, name: base, name_en: base },
      images: [...new Set([...members.map(m => m.images?.[0]).filter(Boolean), ...members.flatMap(m => m.images ?? [])])],
      skus: members.map((m, i) => {
        const sku = activeSkus(m)[0]
        const label = distinct ? labels[i] : nameOf(m).slice(nameOf(m).indexOf(SEPARATOR) + SEPARATOR.length).trim()
        return { ...sku, saleProp: { [propKey]: label }, Images: sku.Images?.length ? sku.Images : [m.images?.[0]].filter(Boolean) }
      }),
    })
  }

  return [...products.filter(p => !merged.has(p)), ...families]
}
