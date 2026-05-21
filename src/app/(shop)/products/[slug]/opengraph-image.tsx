import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/prisma'

// Dynamic Open Graph image for product detail pages. Generated per-product
// and cached aggressively (Next attaches a hash so links revalidate cleanly
// when the source product changes). 1200×630 is the standard "summary_large_image".

export const runtime = 'nodejs'
export const size    = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt     = 'Product preview'

type Params = { slug: string }

function formatNpr(n: number): string {
  return 'Rs. ' + Math.round(n).toLocaleString('en-IN')
}

export default async function OgImage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const { STORE_NAME } = await import('@/lib/config')

  const product = await prisma.product.findUnique({
    where:  { slug },
    select: {
      name: true, price: true, salePrice: true, images: true, brand: true,
      category: { select: { name: true } },
    },
  }).catch(() => null)

  // Fallback card when the product can't be loaded — keeps social previews
  // showing the brand instead of a broken-image icon.
  if (!product) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#EEF2FF 0%,#FAF5FF 40%,#FFF0F9 70%,#F0FDF4 100%)', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ fontSize: 96, fontWeight: 900, color: '#16A34A' }}>{STORE_NAME}</div>
        </div>
      ),
      { ...size },
    )
  }

  const image     = product.images[0] ?? null
  const hasSale   = product.salePrice != null && product.salePrice < product.price
  const showPrice = hasSale ? product.salePrice! : product.price
  const off       = hasSale ? Math.round(((product.price - product.salePrice!) / product.price) * 100) : 0

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex',
          background: 'linear-gradient(135deg,#EEF2FF 0%,#FAF5FF 40%,#FFF0F9 70%,#F0FDF4 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Aurora blob accents */}
        <div style={{ position: 'absolute', top: -120, left: -120, width: 420, height: 420, borderRadius: 9999, background: '#8B5CF6', opacity: 0.18, filter: 'blur(30px)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -100, right: -100, width: 360, height: 360, borderRadius: 9999, background: '#06B6D4', opacity: 0.15, filter: 'blur(30px)', display: 'flex' }} />
        <div style={{ position: 'absolute', top: 200, right: 280, width: 260, height: 260, borderRadius: 9999, background: '#EC4899', opacity: 0.12, filter: 'blur(30px)', display: 'flex' }} />

        {/* Product image — square card on the left, ~530px */}
        <div style={{
          width: 530, height: 530, margin: '50px 0 50px 50px',
          borderRadius: 36, background: '#FFFFFF', display: 'flex',
          alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 24px 64px rgba(15,23,42,0.10)',
        }}>
          {image
            ? <img src={image} alt="" width={530} height={530} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ fontSize: 96, color: '#CBD5E1', display: 'flex' }}>•</div>}
        </div>

        {/* Right column — brand, name, price, store mark */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          padding: '70px 60px 60px 56px', justifyContent: 'space-between',
        }}>
          {/* Top: store + category */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{
                fontSize: 18, fontWeight: 900, color: '#FFFFFF',
                background: '#16A34A', padding: '6px 14px', borderRadius: 999,
                letterSpacing: 1, display: 'flex',
              }}>
                {STORE_NAME.toUpperCase()}
              </div>
              {product.category?.name && (
                <div style={{ fontSize: 18, fontWeight: 700, color: '#64748B', display: 'flex' }}>
                  · {product.category.name}
                </div>
              )}
            </div>

            {product.brand && (
              <div style={{ fontSize: 22, fontWeight: 700, color: '#16A34A', marginBottom: 10, display: 'flex', letterSpacing: 1 }}>
                {product.brand.toUpperCase()}
              </div>
            )}

            {/* Product name — clamp via maxHeight + line clamp via overflow */}
            <div style={{
              fontSize: 56, fontWeight: 900, color: '#0F172A',
              lineHeight: 1.1, letterSpacing: -1,
              maxHeight: 260, overflow: 'hidden', display: 'flex',
            }}>
              {product.name}
            </div>
          </div>

          {/* Bottom: price block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <div style={{ fontSize: 64, fontWeight: 900, color: '#16A34A', display: 'flex' }}>
                {formatNpr(showPrice)}
              </div>
              {hasSale && (
                <div style={{ fontSize: 28, color: '#94A3B8', textDecoration: 'line-through', display: 'flex' }}>
                  {formatNpr(product.price)}
                </div>
              )}
              {off > 0 && (
                <div style={{
                  fontSize: 22, fontWeight: 900, color: '#FFFFFF',
                  background: '#F97316', padding: '6px 14px', borderRadius: 12,
                  display: 'flex',
                }}>
                  -{off}%
                </div>
              )}
            </div>
            <div style={{ fontSize: 22, color: '#475569', display: 'flex' }}>
              Free fast delivery in Nepal · Tap to shop →
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
