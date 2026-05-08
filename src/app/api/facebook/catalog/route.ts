import { prisma } from '@/lib/prisma'
import { STORE_NAME, STORE_URL } from '@/lib/config'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    })

    const data = products.map(p => ({
      id:           p.id,
      title:        p.name,
      description:  p.description.replace(/<[^>]+>/g, '').slice(0, 5000),
      availability: p.stock > 0 ? 'in stock' : 'out of stock',
      condition:    'new',
      price:        `${p.salePrice ?? p.price} NPR`,
      link:         `${STORE_URL}/products/${p.slug}`,
      image_link:   p.images[0] ?? '',
      additional_image_link: p.images.slice(1, 4).join(','),
      brand:        p.brand ?? STORE_NAME,
      google_product_category: p.category.name,
    }))

    return Response.json(
      { data },
      { headers: { 'Cache-Control': 'public, max-age=3600' } },
    )
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
