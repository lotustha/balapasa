/**
 * Trending Products Algorithm
 * ───────────────────────────────────────────────────────────────────────────
 * Score formula:
 *
 *   score =
 *     sales_7d       * W_SALES_7D    // recent purchase velocity
 *     sales_30d      * W_SALES_30D   // sustained momentum
 *     quality        * W_QUALITY     // rating × ln(reviews+1)
 *     conversion     * W_CONVERSION  // Bayesian-smoothed (sold ÷ viewed)
 *     ln(views+1)    * W_VIEWS       // total exposure signal
 *     recency_decay  * W_RECENCY     // new product bonus, decays over ~15 days
 *     has_deal       * W_DEAL        // discount conversion boost
 *
 * Conversion rate uses Bayesian smoothing (prior = 5% at 100 views) so
 * a product with 1 view + 1 sale doesn't outrank one with 1000 views + 400 sales.
 */

import { prisma } from '@/lib/prisma'

const W_SALES_7D    = 3.0   // 7-day velocity — strongest signal
const W_SALES_30D   = 1.2   // 30-day momentum
const W_QUALITY     = 2.0   // rating × ln(reviews+1)
const W_CONVERSION  = 5.0   // Bayesian conversion rate — highest weight (efficiency signal)
const W_VIEWS       = 1.5   // ln(views+1) — exposure/interest
const W_RECENCY     = 1.8   // new product decay (halves every ~15 days)
const W_DEAL        = 1.5   // discount boost

// Bayesian prior: assume 5% baseline CR over 100 impressions
const CR_PRIOR_VIEWS = 100
const CR_PRIOR_SALES = 5

const TOP_N = 5

// Mock trending data (used when DB is not connected)
import type { Product } from '@/components/ui/ProductCard'

const MOCK_TRENDING: Product[] = [
  { id: '2',  name: 'Smart Watch Series X',       slug: 'smart-watch-x',        price: 12000, salePrice: null, images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop'], rating: 4.7, reviewCount: 189, isNew: true,  brand: 'WearTech',      stock: 8  },
  { id: '6',  name: 'Vitamin C Serum 30ml',        slug: 'vitamin-c-serum',      price: 1800,  salePrice: null, images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop'], rating: 4.8, reviewCount: 445, isNew: true,  brand: 'GlowLab',       stock: 25 },
  { id: '1',  name: 'AirPods Pro Max Clone',        slug: 'airpods-pro-max',      price: 8500,  salePrice: 6800,images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'], rating: 4.5, reviewCount: 234, isNew: false, brand: 'SoundX',        stock: 15 },
  { id: '3',  name: 'CeraVe Foaming Cleanser',     slug: 'cerave-cleanser',      price: 1200,  salePrice: 980, images: ['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop'], rating: 4.9, reviewCount: 512, isNew: false, brand: 'CeraVe',        stock: 42 },
  { id: '12', name: 'Retinol Night Cream',          slug: 'retinol-cream',        price: 2200,  salePrice: 1650,images: ['https://images.unsplash.com/photo-1617897903246-719242758050?w=400&h=400&fit=crop'], rating: 4.7, reviewCount: 334, isNew: false, brand: 'SkinFix',       stock: 22 },
]

export async function GET() {
  try {
    const now      = new Date()
    const day7ago  = new Date(now.getTime() - 7  * 86400000)
    const day30ago = new Date(now.getTime() - 30 * 86400000)

    // OrderItem has no Prisma relation back to Product (intentional — no FK constraint)
    // so we query sales counts separately via raw SQL
    const [products, sales7dRows, sales30dRows, salesAllRows] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, stock: { gt: 0 } },
        include: { category: { select: { name: true } } },
      }),

      prisma.$queryRaw<{ product_id: string; qty: bigint }[]>`
        SELECT oi.product_id, SUM(oi.quantity) AS qty
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.created_at >= ${day7ago}
        GROUP BY oi.product_id
      `,

      prisma.$queryRaw<{ product_id: string; qty: bigint }[]>`
        SELECT oi.product_id, SUM(oi.quantity) AS qty
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.created_at >= ${day30ago}
        GROUP BY oi.product_id
      `,

      // All-time sales — needed for conversion rate
      prisma.$queryRaw<{ product_id: string; qty: bigint }[]>`
        SELECT product_id, SUM(quantity) AS qty
        FROM order_items
        GROUP BY product_id
      `,
    ])

    const sales7d   = new Map(sales7dRows.map(r   => [r.product_id, Number(r.qty)]))
    const sales30d  = new Map(sales30dRows.map(r  => [r.product_id, Number(r.qty)]))
    const salesAll  = new Map(salesAllRows.map(r  => [r.product_id, Number(r.qty)]))

    const scored = products.map(p => {
      const totalSold = salesAll.get(p.id) ?? 0

      // Bayesian-smoothed conversion rate: prevents 1-view/1-sale = 100% CR
      // Prior belief: 5% CR over 100 views (industry-typical for e-commerce)
      const smoothedCR = (totalSold + CR_PRIOR_SALES) / (p.viewCount + CR_PRIOR_VIEWS)

      const quality  = p.rating * Math.log(p.reviewCount + 1)
      const exposure = Math.log(p.viewCount + 1)
      const daysSinceCreated = (now.getTime() - p.createdAt.getTime()) / 86400000
      const recency  = Math.exp(-0.046 * daysSinceCreated)
      const hasDeal  = p.salePrice !== null ? 1 : 0

      const score =
        (sales7d.get(p.id) ?? 0) * W_SALES_7D   +
        (sales30d.get(p.id) ?? 0) * W_SALES_30D +
        quality     * W_QUALITY     +
        smoothedCR  * W_CONVERSION  +
        exposure    * W_VIEWS       +
        recency     * W_RECENCY     +
        hasDeal     * W_DEAL

      return { ...p, _score: score }
    })

    const trending = scored
      .sort((a, b) => b._score - a._score)
      .slice(0, TOP_N)
      .map(({ _score, ...p }) => p)

    return Response.json({ products: trending, source: 'live' })
  } catch {
    // DB not available — fall back to mock ranking
    const mockScored = MOCK_TRENDING.map(p => ({
      ...p,
      _score: p.rating * Math.log(p.reviewCount + 1) + (p.salePrice ? 1.5 : 0) + (p.isNew ? 1.8 : 0),
    }))
    const trending = mockScored.sort((a, b) => b._score - a._score).slice(0, TOP_N)
    return Response.json({ products: trending.map(({ _score, ...p }) => p), source: 'mock' })
  }
}
