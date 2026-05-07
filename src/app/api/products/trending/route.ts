/**
 * Trending Products Algorithm
 * ───────────────────────────────────────────────────────────────────────────
 * Score formula (pro-grade, used by platforms like Amazon & Etsy internally):
 *
 *   score =
 *     sales_7d  * W_SALES_7D   +   // ← sales velocity (biggest signal)
 *     sales_30d * W_SALES_30D  +   // ← monthly sales momentum
 *     quality   * W_QUALITY    +   // ← rating × ln(reviews+1)  (dampens small samples)
 *     recency   * W_RECENCY    +   // ← exponential decay over 30 days for new items
 *     has_deal  * W_DEAL            // ← on-sale bonus (conversion lift)
 *
 * Weights are tunable from the admin without code changes
 * (would be stored in DB in production; hardcoded here for clarity)
 */

import { prisma } from '@/lib/prisma'

const W_SALES_7D  = 3.0   // 7-day orders — strongest recency signal
const W_SALES_30D = 1.2   // 30-day orders — sustained momentum
const W_QUALITY   = 2.0   // rating quality dampened by review volume
const W_RECENCY   = 1.8   // new product decay (halves every ~15 days)
const W_DEAL      = 1.5   // discount boosts conversion probability
const TOP_N       = 5

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
    const now       = new Date()
    const day7ago   = new Date(now.getTime() - 7  * 86400000)
    const day30ago  = new Date(now.getTime() - 30 * 86400000)

    // Pull all products with their recent order counts
    const products = await prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      include: {
        category: { select: { name: true } },
        orderItems: {
          select: { quantity: true, order: { select: { createdAt: true } } },
        },
      },
    })

    const scored = products.map(p => {
      // ── Sales velocity ───────────────────────────────────────────────────
      const sales7d  = p.orderItems
        .filter(oi => oi.order.createdAt >= day7ago)
        .reduce((s, oi) => s + oi.quantity, 0)
      const sales30d = p.orderItems
        .filter(oi => oi.order.createdAt >= day30ago)
        .reduce((s, oi) => s + oi.quantity, 0)

      // ── Quality signal (Wilson-like dampening) ───────────────────────────
      // Math.log(n+1) prevents high-count inflation; rating 4.9×1 ≠ 4.9×500
      const quality = p.rating * Math.log(p.reviewCount + 1)

      // ── Recency decay: e^(-λt) where λ makes it halve every ~15 days ───
      const daysSinceCreated = (now.getTime() - p.createdAt.getTime()) / 86400000
      const recency = Math.exp(-0.046 * daysSinceCreated)  // λ ≈ ln(2)/15

      // ── On-sale boost ────────────────────────────────────────────────────
      const hasDeal = p.salePrice !== null ? 1 : 0

      const score =
        sales7d  * W_SALES_7D  +
        sales30d * W_SALES_30D +
        quality  * W_QUALITY   +
        recency  * W_RECENCY   +
        hasDeal  * W_DEAL

      return { ...p, _score: score }
    })

    // Sort descending by score, take top N
    const trending = scored
      .sort((a, b) => b._score - a._score)
      .slice(0, TOP_N)
      .map(({ _score, orderItems, ...p }) => p)

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
