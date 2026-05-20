import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { config } from 'dotenv'

config({ path: '.env.local' })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL not set in .env.local')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
}
function sku(name) {
  const code = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase().padEnd(4, 'X')
  return `BLP-${code}-${Math.floor(Math.random() * 900) + 100}`
}

const PRODUCTS = [
  // ── Mobiles & Accessories ────────────────────────────────────────────────
  {
    categorySlug: 'mobiles-accessories',
    name: 'iPhone 15 Pro Case — Clear MagSafe',
    description: 'Crystal-clear case with MagSafe magnets aligned for wireless charging. Drop-tested to 3m. Yellowing-resistant polycarbonate back, anti-slip TPU bumper.',
    price: 1800, salePrice: 1450, brand: 'Spigen', stock: 45,
    image: 'photo-1592286130293-7ce7e08e3b07',
    isFeatured: true, isNew: true, freeDelivery: false,
    weight: 0.1, length: 16, width: 8.5, height: 1.5,
  },
  {
    categorySlug: 'mobiles-accessories',
    name: 'Anker PowerCore 20000mAh Power Bank',
    description: 'Charge your iPhone 15 over 4 times. 22.5W PowerIQ 3.0 fast charging, USB-C in/out, dual ports. Includes USB-C cable and travel pouch.',
    price: 4500, salePrice: 3800, brand: 'Anker', stock: 28,
    image: 'photo-1609091839311-d5365f9ff1c5',
    isFeatured: true, isNew: false, freeDelivery: true,
    weight: 0.45, length: 16, width: 7.5, height: 2,
  },
  {
    categorySlug: 'mobiles-accessories',
    name: 'USB-C to Lightning Cable 1.5m',
    description: 'MFi-certified braided nylon cable. 30W power delivery, supports iPhone fast charging. 10,000-bend tested.',
    price: 950, salePrice: 750, brand: 'Belkin', stock: 80,
    image: 'photo-1558618666-fcd25c85cd64',
    isNew: false, freeDelivery: false,
    weight: 0.08, length: 150, width: 1, height: 1,
  },

  // ── Audio & Wearables ────────────────────────────────────────────────────
  {
    categorySlug: 'audio-wearables',
    name: 'Sony WH-1000XM5 Wireless Headphones',
    description: 'Industry-leading noise cancellation with 8 microphones. 30-hour battery life, 3-minute quick charge gives 3 hours of playback. Adaptive sound control.',
    price: 48000, salePrice: 42500, brand: 'Sony', stock: 12,
    image: 'photo-1505740420928-5e560c06d30e',
    isFeatured: true, isNew: true, freeDelivery: true,
    weight: 0.25, length: 20, width: 18, height: 8,
  },
  {
    categorySlug: 'audio-wearables',
    name: 'Apple AirPods Pro (2nd Gen)',
    description: 'Active Noise Cancellation, Adaptive Transparency, Personalized Spatial Audio. Up to 6 hours of listening with ANC on. USB-C charging case.',
    price: 36000, salePrice: 32500, brand: 'Apple', stock: 18,
    image: 'photo-1606220588913-b3aacb4d2f46',
    isFeatured: true, isNew: true, freeDelivery: true,
    weight: 0.06, length: 6, width: 5, height: 2.5,
  },
  {
    categorySlug: 'audio-wearables',
    name: 'Apple Watch Series 9 — 45mm GPS',
    description: 'S9 chip with 4-core Neural Engine. Always-on Retina display, blood oxygen, ECG. New double-tap gesture. Aluminum case with sport band.',
    price: 58000, salePrice: null, brand: 'Apple', stock: 8,
    image: 'photo-1546868871-7041f2a55e12',
    isFeatured: true, isNew: true, freeDelivery: true,
    weight: 0.05, length: 4.5, width: 4, height: 1,
  },
  {
    categorySlug: 'audio-wearables',
    name: 'Mi Band 8 Fitness Tracker',
    description: '1.62" AMOLED display, 150+ sport modes, blood-oxygen tracking, sleep monitoring. 16-day battery life. 5 ATM water resistance.',
    price: 5500, salePrice: 4200, brand: 'Xiaomi', stock: 35,
    image: 'photo-1523275335684-37898b6baf30',
    isNew: true, freeDelivery: false,
    weight: 0.03, length: 4.7, width: 2, height: 1.1,
  },

  // ── Computers & Laptops ──────────────────────────────────────────────────
  {
    categorySlug: 'computers-laptops',
    name: 'MacBook Air M3 13" — 8GB / 256GB',
    description: 'Apple M3 chip with 8-core CPU and 10-core GPU. 13.6" Liquid Retina display, 18-hour battery. 1080p FaceTime HD camera. Midnight finish.',
    price: 195000, salePrice: 184000, brand: 'Apple', stock: 5,
    image: 'photo-1517336714731-489689fd1ca8',
    isFeatured: true, isNew: true, freeDelivery: true,
    weight: 1.24, length: 30, width: 21, height: 1.1,
  },
  {
    categorySlug: 'computers-laptops',
    name: 'Logitech MX Master 3S Wireless Mouse',
    description: 'Ultra-quiet clicks, 8K DPI sensor on any surface including glass. MagSpeed scroll wheel — 1,000 lines/sec. USB-C charging, 70-day battery.',
    price: 14500, salePrice: 11800, brand: 'Logitech', stock: 22,
    image: 'photo-1527864550417-7fd91fc51a46',
    isFeatured: false, isNew: false, freeDelivery: false,
    weight: 0.14, length: 13, width: 8, height: 5,
  },
  {
    categorySlug: 'computers-laptops',
    name: 'Mechanical Keyboard — Hot-swap RGB',
    description: 'Tri-mode (Bluetooth 5.0 / 2.4G / USB-C), 75% layout, hot-swappable Gateron switches, per-key RGB, gasket-mounted PCB.',
    price: 11500, salePrice: 9200, brand: 'Keychron', stock: 16,
    image: 'photo-1587829741301-dc798b83add3',
    isNew: true, freeDelivery: false,
    weight: 0.9, length: 32, width: 13, height: 4,
  },
  {
    categorySlug: 'computers-laptops',
    name: 'Laptop Stand — Aluminum Adjustable',
    description: 'Ergonomic riser raises your laptop screen to eye level. Adjustable height + tilt. Anti-slip silicone pads. Fits 10–17" laptops.',
    price: 3200, salePrice: 2400, brand: 'Rain Design', stock: 30,
    image: 'photo-1593642632559-0c6d3fc62b89',
    freeDelivery: true,
    weight: 0.95, length: 26, width: 24, height: 5,
  },

  // ── Cameras ──────────────────────────────────────────────────────────────
  {
    categorySlug: 'cameras',
    name: 'GoPro Hero 12 Black',
    description: '5.3K60 video, HyperSmooth 6.0 stabilization. Waterproof to 10m without housing. HDR video, Enduro battery for cold-weather shoots.',
    price: 75000, salePrice: 68500, brand: 'GoPro', stock: 6,
    image: 'photo-1516035069371-29a1b244cc32',
    isFeatured: true, isNew: true, freeDelivery: true,
    weight: 0.15, length: 7, width: 5, height: 3,
  },
  {
    categorySlug: 'cameras',
    name: 'DJI Mini 4 Pro Drone',
    description: 'Under 249g, no registration needed. 4K/100fps HDR, omnidirectional obstacle sensing, 34-min flight time. ActiveTrack 360°.',
    price: 145000, salePrice: null, brand: 'DJI', stock: 4,
    image: 'photo-1473968512647-3e447244af8f',
    isFeatured: true, isNew: true, freeDelivery: true,
    weight: 0.25, length: 14.8, width: 9, height: 5.7,
  },
  {
    categorySlug: 'cameras',
    name: 'Webcam 1080p Full HD with Privacy Cover',
    description: 'Full HD 1080p at 30fps. Auto-focus, dual omnidirectional mics with noise reduction. Plug-and-play USB. Privacy shutter included.',
    price: 4800, salePrice: 3650, brand: 'Logitech', stock: 25,
    image: 'photo-1525373698358-041e3a460346',
    isNew: false, freeDelivery: false,
    weight: 0.16, length: 9.5, width: 4.5, height: 5,
  },

  // ── Beauty & Personal Care ───────────────────────────────────────────────
  {
    categorySlug: 'beauty-personal-care',
    name: 'CeraVe Foaming Facial Cleanser 236ml',
    description: 'Developed with dermatologists. Removes oil and makeup without disrupting the skin barrier. Ceramides + hyaluronic acid + niacinamide.',
    price: 1450, salePrice: 1180, brand: 'CeraVe', stock: 50,
    image: 'photo-1556228578-8c89e6adf883',
    isFeatured: false, isNew: false, freeDelivery: false,
    weight: 0.3, length: 18, width: 6, height: 4,
  },
  {
    categorySlug: 'beauty-personal-care',
    name: 'The Ordinary Niacinamide 10% + Zinc 1%',
    description: 'High-strength vitamin and mineral blemish formula. Reduces appearance of blemishes and congestion. 30ml.',
    price: 1100, salePrice: 850, brand: 'The Ordinary', stock: 60,
    image: 'photo-1608248543803-ba4f8c70ae0b',
    isFeatured: true, isNew: false, freeDelivery: false,
    weight: 0.05, length: 8, width: 3, height: 3,
  },
  {
    categorySlug: 'beauty-personal-care',
    name: 'Vitamin C Brightening Serum 30ml',
    description: '20% L-ascorbic acid + ferulic acid + vitamin E. Brightens dull skin and evens out tone. Amber glass bottle protects from light.',
    price: 2200, salePrice: 1680, brand: 'GlowLab', stock: 40,
    image: 'photo-1620916566398-39f1143ab7be',
    isNew: true, freeDelivery: false,
    weight: 0.08, length: 9, width: 3, height: 3,
  },
  {
    categorySlug: 'beauty-personal-care',
    name: 'Matte Liquid Lipstick — Velvet Plum',
    description: 'Long-lasting up to 8 hours, transfer-proof, non-drying matte finish. Vegan, cruelty-free.',
    price: 950, salePrice: 720, brand: 'Maybelline', stock: 75,
    image: 'photo-1585771724684-38269d6639fd',
    freeDelivery: false,
    weight: 0.03, length: 10, width: 2, height: 2,
  },

  // ── Home & Kitchen ───────────────────────────────────────────────────────
  {
    categorySlug: 'home-kitchen',
    name: 'Smart LED Desk Lamp with Wireless Charger',
    description: 'Touch-control brightness, 5 color temperatures, USB-A port + wireless Qi charging base. Eye-care no-flicker.',
    price: 4500, salePrice: 3400, brand: 'Xiaomi', stock: 20,
    image: 'photo-1507473885765-e6ed057f782c',
    isNew: true, freeDelivery: false,
    weight: 0.7, length: 22, width: 18, height: 40,
  },
  {
    categorySlug: 'home-kitchen',
    name: 'Stainless Steel Insulated Bottle 750ml',
    description: 'Keeps cold for 24h, hot for 12h. Double-wall vacuum. BPA-free, leakproof flip-top.',
    price: 1800, salePrice: 1380, brand: 'Hydro Flask', stock: 38,
    image: 'photo-1602143407151-7111542de6e8',
    freeDelivery: false,
    weight: 0.4, length: 28, width: 8, height: 8,
  },
  {
    categorySlug: 'home-kitchen',
    name: 'Coffee French Press 600ml',
    description: 'Borosilicate glass with stainless steel mesh filter. Heat-resistant, easy to clean.',
    price: 2200, salePrice: 1750, brand: 'Bodum', stock: 25,
    image: 'photo-1495474472287-4d71bcdd2085',
    freeDelivery: false,
    weight: 0.65, length: 17, width: 12, height: 22,
  },

  // ── Fashion & Lifestyle ──────────────────────────────────────────────────
  {
    categorySlug: 'fashion-lifestyle',
    name: 'Minimalist Leather Wallet — Slim Bifold',
    description: 'Top-grain leather, hand-stitched. RFID-blocking. Holds 8 cards + cash. Develops a natural patina over time.',
    price: 3500, salePrice: 2650, brand: 'Bellroy', stock: 30,
    image: 'photo-1627123424574-724758594e93',
    isFeatured: true, freeDelivery: true,
    weight: 0.08, length: 11, width: 9, height: 1,
  },
  {
    categorySlug: 'fashion-lifestyle',
    name: 'Canvas Backpack — Vintage Olive',
    description: 'Waxed canvas with leather trim. 25L capacity with padded 15" laptop sleeve. Water-resistant.',
    price: 4800, salePrice: 3800, brand: 'Herschel', stock: 22,
    image: 'photo-1553062407-98eeb64c6a62',
    isNew: false, freeDelivery: false,
    weight: 1.1, length: 45, width: 30, height: 15,
  },

  // ── Sports & Fitness ─────────────────────────────────────────────────────
  {
    categorySlug: 'sports-fitness',
    name: 'Yoga Mat — TPE Non-Slip 6mm',
    description: 'Eco-friendly TPE foam, 6mm thick for joint comfort. Double-sided textured grip. Includes carry strap.',
    price: 1800, salePrice: 1380, brand: 'Liforme', stock: 42,
    image: 'photo-1592432678016-e910b452f9a2',
    freeDelivery: false,
    weight: 0.95, length: 173, width: 61, height: 0.6,
  },
  {
    categorySlug: 'sports-fitness',
    name: 'Adjustable Dumbbell Set 2.5–12.5kg (pair)',
    description: 'Space-saving quick-adjust dumbbells. Cast iron plates with rubber coating. Replaces 10 individual dumbbells.',
    price: 18500, salePrice: 15800, brand: 'PowerBlock', stock: 8,
    image: 'photo-1583454110551-21f2fa2afe61',
    isFeatured: true, isNew: false, freeDelivery: false,
    weight: 25, length: 38, width: 18, height: 18,
  },

  // ── Toys & Baby ──────────────────────────────────────────────────────────
  {
    categorySlug: 'toys-baby',
    name: 'Wooden Building Blocks Set — 100 pieces',
    description: 'FSC-certified beech wood, non-toxic water-based paints. Encourages creativity and motor skills. Ages 2+.',
    price: 2800, salePrice: 2150, brand: 'Hape', stock: 18,
    image: 'photo-1558877385-81a1c7e67d72',
    isNew: false, freeDelivery: false,
    weight: 1.5, length: 28, width: 22, height: 10,
  },
]

async function main() {
  console.log(`Seeding ${PRODUCTS.length} products…`)

  const cats = await prisma.category.findMany({ select: { id: true, slug: true } })
  const catMap = new Map(cats.map(c => [c.slug, c.id]))

  const missing = [...new Set(PRODUCTS.map(p => p.categorySlug))].filter(s => !catMap.has(s))
  if (missing.length) {
    console.error(`Missing categories: ${missing.join(', ')}`)
    process.exit(1)
  }

  let created = 0, skipped = 0
  for (const p of PRODUCTS) {
    const slug = slugify(p.name)
    const existing = await prisma.product.findUnique({ where: { slug } })
    if (existing) {
      skipped++
      console.log(`  → skip (exists): ${p.name}`)
      continue
    }
    await prisma.product.create({
      data: {
        name: p.name,
        slug,
        description: p.description,
        price: p.price,
        salePrice: p.salePrice ?? null,
        stock: p.stock,
        lowStockThreshold: 5,
        images: [`https://images.unsplash.com/${p.image}?w=900&h=900&fit=crop&q=80`],
        categoryId: catMap.get(p.categorySlug),
        tags: [p.brand?.toLowerCase() ?? '', p.categorySlug].filter(Boolean),
        isActive: true,
        isFeatured: p.isFeatured ?? false,
        isNew: p.isNew ?? false,
        isTaxable: true,
        trackInventory: true,
        freeDelivery: p.freeDelivery ?? false,
        brand: p.brand ?? null,
        sku: sku(p.name),
        weight: p.weight ?? null,
        length: p.length ?? null,
        width: p.width ?? null,
        height: p.height ?? null,
      },
    })
    created++
    console.log(`  ✓ ${p.name}`)
  }

  console.log(`\nDone — created ${created}, skipped ${skipped}.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
