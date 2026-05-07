/**
 * Re-upload all product images from Daraz CDN → Supabase Storage
 * Updates products in-place with the new Supabase URLs.
 *
 * Run: node scripts/reupload-product-images.mjs
 */
import { config }       from 'dotenv'
import pg               from 'pg'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key || key === 'your-service-role-key') {
  console.error('❌  Supabase not configured'); process.exit(1)
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

// Ensure bucket
const { data: buckets } = await admin.storage.listBuckets()
if (!buckets?.find(b => b.name === 'product-images')) {
  await admin.storage.createBucket('product-images', { public: true, fileSizeLimit: 10 * 1024 * 1024 })
}

async function uploadOne(imgUrl) {
  try {
    const res = await fetch(imgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        'Referer':    'https://www.daraz.com.np/',
        'Accept':     'image/webp,image/avif,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return imgUrl

    const ct   = res.headers.get('content-type') ?? 'image/jpeg'
    const ext  = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg'
    const buf  = await res.arrayBuffer()
    const path = `imports/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await admin.storage.from('product-images').upload(path, buf, { contentType: ct })
    if (error) return imgUrl

    const { data: { publicUrl } } = admin.storage.from('product-images').getPublicUrl(path)
    return publicUrl
  } catch { return imgUrl }
}

// Fetch all products with non-Supabase images
const { rows: products } = await pool.query(`
  SELECT id, name, images FROM products
  WHERE images IS NOT NULL AND array_length(images, 1) > 0
  AND NOT (images::text LIKE '%supabase%')
  ORDER BY created_at DESC
`)

console.log(`📦 ${products.length} products need image re-upload\n`)

let updated = 0, failed = 0

for (let i = 0; i < products.length; i++) {
  const p = products[i]
  process.stdout.write(`[${i+1}/${products.length}] ${p.name.slice(0,45)}… `)

  const newImages = await Promise.all(p.images.map(uploadOne))
  const uploadedCount = newImages.filter(u => u.includes('supabase')).length

  if (uploadedCount > 0) {
    await pool.query('UPDATE products SET images = $1 WHERE id = $2', [newImages, p.id])
    console.log(`✓ ${uploadedCount}/${p.images.length} uploaded`)
    updated++
  } else {
    console.log(`✗ 0/${p.images.length} (CDN blocked — kept original URLs)`)
    failed++
  }
}

await pool.end()
console.log(`\n✅ Updated: ${updated} | ⚠️ Unchanged: ${failed}`)
