// Catalog importer: sastogadgets.com (WooCommerce Store API) -> balapasa.
// Run FROM the app dir so cwd resolves node_modules, .env.local and uploads/:
//   cd /www/wwwroot/balapasa && node import-sastogadgets.mjs [flags]
//
// Flags:
//   --dry-run         no DB writes, no image downloads — just report
//   --limit N         stop after N products (test batch)
//   --category SLUG   only import products in this sastogadgets category slug
//   --active          create products as isActive:true (default: false for review)
//
// Safety/idempotency:
//   * every imported product carries the tag `src:sastogadgets`
//   * a product is only UPDATED if it already carries that tag — an existing
//     SKU WITHOUT the tag is a real product and is left untouched
//   * resumable: a tagged SKU that already has images is skipped
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

config({ path: '.env.local' })

const API          = 'https://sastogadgets.com/wp-json/wc/store/v1'
const SRC          = 'sastogadgets'
// Internal provenance marker. The "_" prefix marks it as an internal tag that
// the storefront filters out of all display/SEO surfaces (see products/[slug]).
// Enables precise rollback: delete where '_import_sastogadgets' = ANY(tags).
const TAG          = '_import_sastogadgets'
const STORE_NAME   = (process.env.NEXT_PUBLIC_STORE_NAME || 'Balapasa').trim()
const STORE_DOMAIN = 'balapasa.com.np'
const UA           = 'Mozilla/5.0 (compatible; balapasa-catalog-import/1.0)'
const IMG_CONC     = 5
const MAX_IMAGES   = 6

const argv     = process.argv.slice(2)
const hasFlag  = f => argv.includes(f)
const optVal   = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : undefined }
const DRY      = hasFlag('--dry-run')
const ACTIVE   = hasFlag('--active')
const LIMIT    = Number(optVal('limit')) || 0
const ONLY_CAT = optVal('category') || ''

if (!process.env.DATABASE_URL) { console.error('No DATABASE_URL — run from the app dir'); process.exit(1) }
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

// ── helpers ───────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

function decodeEntities(s = '') {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&#8217;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#8211;|&ndash;|&#8212;|&mdash;/g, '-').replace(/&hellip;/g, '...')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim()
}
function slugify(s = '') { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') }
function slugStem(s = '') { return slugify(s).slice(0, 60) }

// Replace every trace of the source store with ours.
function sanitizeDesc(html = '') {
  let h = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
  // unwrap anchors that point at the source domain (keep the inner text)
  h = h.replace(/<a\b[^>]*href=["'][^"']*sastogadgets[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, '$1')
  // any bare source URL -> our domain
  h = h.replace(/https?:\/\/(www\.)?sastogadgets\.com[^\s"'<>)]*/gi, `https://${STORE_DOMAIN}`)
  // brand name, spaced or joined, any case
  h = h.replace(/sasto\s*-?\s*gadgets/gi, STORE_NAME)
  // contact details that belong to them
  h = h.replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '')
  h = h.replace(/(\+?977[-\s]?)?9[78]\d{8}/g, '').replace(/\b01[-\s]?\d{6,8}\b/g, '')
  return h.trim()
}

function pickExt(ct = '') {
  if (ct.includes('png')) return 'png'; if (ct.includes('webp')) return 'webp'
  if (ct.includes('gif')) return 'gif'; if (ct.includes('svg')) return 'svg'
  return 'jpg'
}

async function fetchJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) })
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`)
  return { data: await r.json(), total: Number(r.headers.get('x-wp-total') || 0) }
}

async function saveImage(buf, ct, baseName) {
  const ext = pickExt(ct)
  const stem = slugStem(baseName)
  const uniq = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const filename = stem ? `${stem}-${uniq}.${ext}` : `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const dir = join(process.cwd(), 'uploads', 'images')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), Buffer.from(buf))
  const saved = { url: `/uploads/images/${filename}`, filename, mimeType: ct, sizeBytes: buf.byteLength, kind: 'image' }
  try {
    await prisma.mediaAsset.create({ data: { ...saved, source: 'upload', uploadedBy: null } })
  } catch { /* media table optional — file + URL still valid */ }
  return saved.url
}

async function downloadImage(srcUrl, baseName) {
  const r = await fetch(srcUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error(`img HTTP ${r.status}`)
  const ct = r.headers.get('content-type') || 'image/jpeg'
  if (!ct.startsWith('image/')) throw new Error(`not image: ${ct}`)
  return saveImage(await r.arrayBuffer(), ct, baseName)
}

async function pMap(items, fn, conc) {
  const out = []; let i = 0
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, async () => {
    while (i < items.length) { const idx = i++; try { out[idx] = await fn(items[idx]) } catch { out[idx] = null } }
  }))
  return out
}

// ── categories ────────────────────────────────────────────────────────────
const byId = new Map()        // wcId -> { id, name, slug, parent }
const catCache = new Map()    // wcId -> balapasa categoryId

async function loadCategories() {
  let page = 1, total = Infinity
  while (byId.size < total) {
    const { data, total: t } = await fetchJson(`${API}/products/categories?per_page=100&page=${page}`)
    if (t) total = t
    if (!data.length) break
    for (const c of data) byId.set(c.id, { id: c.id, name: decodeEntities(c.name), slug: c.slug, parent: c.parent })
    page++
  }
  console.log(`[cats] loaded ${byId.size} source categories`)
}
function catDepth(id) { let d = 0, c = byId.get(id); const seen = new Set(); while (c && c.parent && !seen.has(c.id)) { seen.add(c.id); d++; c = byId.get(c.parent) } return d }

async function ensureCategory(wc) {
  if (catCache.has(wc.id)) return catCache.get(wc.id)
  let catId
  const mapping = await prisma.categoryMapping.findUnique({
    where: { source_externalName: { source: SRC, externalName: wc.name } },
  }).catch(() => null)
  if (mapping) catId = mapping.categoryId
  else {
    let cat = await prisma.category.findUnique({ where: { slug: wc.slug } }).catch(() => null)
    if (!cat) cat = await prisma.category.create({ data: { name: wc.name, slug: wc.slug, color: '#16A34A' } })
    await prisma.categoryMapping.create({ data: { source: SRC, externalName: wc.name, externalId: String(wc.id), categoryId: cat.id } }).catch(() => {})
    catId = cat.id
  }
  catCache.set(wc.id, catId)
  return catId
}

let uncategorisedId = null
async function ensureUncategorised() {
  if (uncategorisedId) return uncategorisedId
  let cat = await prisma.category.findUnique({ where: { slug: 'uncategorised' } }).catch(() => null)
  if (!cat) cat = await prisma.category.create({ data: { name: 'Uncategorised', slug: 'uncategorised', color: '#16A34A' } })
  uncategorisedId = cat.id
  return cat.id
}

// pick the deepest (most specific) source category attached to a product
function leafCategory(p) {
  const cats = (p.categories || []).map(c => byId.get(c.id)).filter(Boolean)
  if (!cats.length) return null
  return cats.slice().sort((a, b) => catDepth(b.id) - catDepth(a.id))[0]
}

// ── product import ──────────────────────────────────────────────────────────
const counts = { created: 0, updated: 0, skipDone: 0, skipReal: 0, err: 0, imgs: 0, cats: 0 }

async function importProduct(p) {
  const sku = String(p.sku || '').trim() || null
  let existing = null
  if (sku) {
    existing = await prisma.product.findUnique({ where: { sku } }).catch(() => null)
    if (existing) {
      const tagged = (existing.tags || []).includes(TAG)
      if (!tagged) { counts.skipReal++; return }                 // never clobber a real product
      if ((existing.images || []).length > 0) { counts.skipDone++; return } // resume: already done
    }
  }

  const leaf = leafCategory(p)
  const categoryId = DRY ? 'dry' : (leaf ? await ensureCategory(leaf) : await ensureUncategorised())

  const name = decodeEntities(p.name)
  const description = sanitizeDesc(p.description || p.short_description || '') || name
  const reg  = Number(p.prices?.regular_price) || Number(p.prices?.price) || 0
  const sale = Number(p.prices?.sale_price) || 0
  const salePrice = (sale > 0 && sale < reg) ? sale : null
  const wcCatNames = (p.categories || []).map(c => decodeEntities(c.name))

  let images = []
  if (!DRY) {
    images = (await pMap((p.images || []).slice(0, MAX_IMAGES).map(i => i.src), u => downloadImage(u, name), IMG_CONC)).filter(Boolean)
    counts.imgs += images.length
  }

  const data = {
    name,
    description,
    price: reg,
    salePrice,
    stock: p.is_in_stock ? 100 : 0,
    images,
    categoryId,
    tags: [TAG, ...wcCatNames],
    isActive: ACTIVE,
    isFeatured: false,
    isNew: false,
    sku,
    kind: 'PHYSICAL',
  }

  if (DRY) {
    if (counts.created < 5) console.log(`[dry] ${name}  | Rs${reg}${salePrice ? '/' + salePrice : ''} | cat=${leaf?.name || 'Uncategorised'} | imgs=${(p.images || []).length} | sku=${sku}`)
    counts.created++
    return
  }

  if (existing) {
    await prisma.product.update({ where: { id: existing.id }, data })   // existing is tag-verified above
    counts.updated++
  } else {
    await prisma.product.create({ data: { ...data, slug: `${slugStem(name)}-${p.id}` } })
    counts.created++
  }
}

// ── main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== sastogadgets import ${DRY ? '(DRY RUN)' : ''} active=${ACTIVE} limit=${LIMIT || '∞'} cat=${ONLY_CAT || 'all'} ===`)
  await loadCategories()

  let catFilter = ''
  if (ONLY_CAT) {
    const wc = [...byId.values()].find(c => c.slug === ONLY_CAT)
    if (!wc) { console.error(`category slug "${ONLY_CAT}" not found`); process.exit(1) }
    catFilter = `&category=${wc.id}`
    console.log(`[filter] ${wc.name} (id ${wc.id})`)
  }

  let page = 1, total = Infinity, processed = 0
  const t0 = Date.now()
  while (processed < total) {
    const { data, total: t } = await fetchJson(`${API}/products?per_page=100&page=${page}${catFilter}`)
    if (t) total = t
    if (!data.length) break
    for (const p of data) {
      if (LIMIT && processed >= LIMIT) { total = processed; break }
      processed++
      try { await importProduct(p) } catch (e) { counts.err++; console.warn(`[err] ${p.sku || p.id}: ${e.message}`) }
      if (processed % 25 === 0) console.log(`[${processed}/${total}] created=${counts.created} updated=${counts.updated} skipDone=${counts.skipDone} skipReal=${counts.skipReal} imgs=${counts.imgs} err=${counts.err}`)
    }
    page++
    await sleep(250)
  }

  console.log(`\n=== DONE in ${Math.round((Date.now() - t0) / 1000)}s ===`)
  console.log(counts)
  await prisma.$disconnect()
}
main().catch(async e => { console.error('FATAL', e); await prisma.$disconnect(); process.exit(1) })
