/**
 * Copies product, variant and category images that are still loaded from Daraz onto this server,
 * and points the database at the local copies. Safe to re-run: it only touches images that are
 * still remote, and an image that fails to download keeps its Daraz address for the next run.
 *
 *   node scripts/daraz/localize-images.mjs [--dry-run] [--limit <products>]
 *
 * Files go to <cwd>/uploads/images/ and are served at /uploads/images/<file>, the same place and
 * naming the admin uploader uses (src/lib/upload.ts).
 */
import { useUtc } from './utc.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { config } from 'dotenv'
import pg from 'pg'
import { createId } from '@paralleldrive/cuid2'
import { loadControls } from './controls.mjs'

config({ path: '.env.local', quiet: true })

const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT = process.argv.includes('--limit') ? Number(process.argv[process.argv.indexOf('--limit') + 1]) : Infinity
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'images')
const REMOTE = /^https?:\/\/[^/]*(daraz|slatic|lazcdn)\./i
const MAX_BYTES = 10 * 1024 * 1024
const CONCURRENCY = 4
const EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/pjpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' }

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
const isRemote = u => typeof u === 'string' && REMOTE.test(u)

const url = (process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '').replace(/\?.*$/, '')
if (!url) { console.error('DIRECT_URL / DATABASE_URL not set'); process.exit(2) }
const db = new pg.Client({ connectionString: url })
await db.connect()
await useUtc(db)

if (!DRY_RUN && !(await loadControls(db)).copyImages) {
  console.log('image copy skipped: switched off in Settings → Daraz')
  await db.end()
  process.exit(0)
}

// One download per distinct address, however many products share the picture.
const done = new Map()
let downloaded = 0, failed = 0, bytes = 0
// Copies made by parallel downloads, written to media_assets one at a time (one shared connection).
const newAssets = []
async function recordAssets() {
  for (const row of newAssets.splice(0)) {
    await db.query(
      `INSERT INTO media_assets (id, url, filename, mime_type, size_bytes, kind, source, tags, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,'image','external','{}',now(),now()) ON CONFLICT (url) DO NOTHING`, row)
  }
}

async function localize(remoteUrl, baseName) {
  if (done.has(remoteUrl)) return done.get(remoteUrl)
  const job = (async () => {
    try {
      const res = await fetch(remoteUrl, {
        headers: { Referer: 'https://www.daraz.com.np/', 'User-Agent': 'Mozilla/5.0 (compatible; balapasa-image-copy)' },
        signal: AbortSignal.timeout(30_000),
      })
      const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
      if (!res.ok || !EXT[type]) throw new Error(`HTTP ${res.status} ${type || 'no content type'}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length === 0 || buf.length > MAX_BYTES) throw new Error(`unusable size ${buf.length}`)
      const file = `${slugify(baseName) || 'image'}-${createId().slice(0, 10)}.${EXT[type]}`
      const publicUrl = `/uploads/images/${file}`
      if (!DRY_RUN) {
        writeFileSync(path.join(UPLOAD_DIR, file), buf)
        newAssets.push([createId(), publicUrl, file, EXT[type] === 'jpg' ? 'image/jpeg' : type, buf.length])
      }
      downloaded++; bytes += buf.length
      return publicUrl
    } catch (err) {
      failed++
      console.log(`  could not copy ${remoteUrl.slice(-48)}: ${err.message}`)
      return remoteUrl
    }
  })()
  done.set(remoteUrl, job)
  return job
}

async function inBatches(items, fn) {
  const out = []
  for (let i = 0; i < items.length; i += CONCURRENCY) out.push(...await Promise.all(items.slice(i, i + CONCURRENCY).map(fn)))
  return out
}

if (!DRY_RUN) mkdirSync(UPLOAD_DIR, { recursive: true })

const products = (await db.query(`SELECT id, name, images FROM products ORDER BY created_at DESC`)).rows
  .filter(p => p.images.some(isRemote))
const todo = products.slice(0, LIMIT)
console.log(`products with Daraz-hosted images: ${products.length}${todo.length < products.length ? ` (doing ${todo.length})` : ''}`)

let touched = 0
for (const p of todo) {
  const images = await inBatches(p.images, u => (isRemote(u) ? localize(u, p.name) : u))
  const variants = (await db.query(`SELECT id, image FROM product_variants WHERE product_id = $1`, [p.id])).rows
  const variantImages = await inBatches(variants, async v => ({ id: v.id, from: v.image, to: isRemote(v.image) ? await localize(v.image, p.name) : v.image }))
  if (!DRY_RUN) {
    await db.query('BEGIN')
    try {
      await recordAssets()
      await db.query(`UPDATE products SET images = $1 WHERE id = $2`, [images, p.id])
      for (const v of variantImages) if (v.to !== v.from) await db.query(`UPDATE product_variants SET image = $1 WHERE id = $2`, [v.to, v.id])
      await db.query('COMMIT')
    } catch (err) {
      await db.query('ROLLBACK')
      throw err
    }
  }
  touched++
  if (touched % 50 === 0) console.log(`  ... ${touched} products, ${downloaded} images`)
}

// Category pictures are product pictures; reuse the copies made above where there is one.
const categories = (await db.query(`SELECT id, name, image FROM categories`)).rows.filter(c => isRemote(c.image))
for (const c of categories) {
  if (todo.length < products.length && !done.has(c.image)) continue
  const local = await localize(c.image, c.name)
  if (!DRY_RUN) await recordAssets()
  if (!DRY_RUN && local !== c.image) await db.query(`UPDATE categories SET image = $1 WHERE id = $2`, [local, c.id])
}

const left = DRY_RUN ? products.length : (await db.query(`SELECT count(*) AS n FROM products WHERE images::text ~* 'daraz|slatic|lazcdn'`)).rows[0].n
console.log(`${DRY_RUN ? 'would copy' : 'copied'} ${downloaded} images (${(bytes / 1048576).toFixed(1)} MB) for ${touched} products; ${failed} failed; products still on Daraz images: ${left}`)
await db.end()
process.exit(failed > 0 && downloaded === 0 ? 1 : 0)
