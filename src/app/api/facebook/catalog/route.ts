import { prisma } from '@/lib/prisma'
import { STORE_NAME, STORE_URL } from '@/lib/config'

// Meta Commerce Manager crawls this URL as a scheduled data feed. It accepts
// CSV / TSV / RSS-XML / ATOM-XML / XLSX — NOT JSON. We emit RSS 2.0 with the
// Google base namespace (g:), which Meta ingests natively.

// Drop control chars that break XML 1.0 parsers (keep tab/LF/CR), then escape.
function xmlEscape(s: string): string {
  let cleaned = ''
  for (const ch of s) {
    const c = ch.charCodeAt(0)
    if (c === 9 || c === 10 || c === 13 || c >= 32) cleaned += ch
  }
  return cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Image URLs are stored as relative paths (/uploads/...). Meta requires
// absolute https URLs, so prefix the canonical store URL when needed.
function absUrl(u: string): string {
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  return `${STORE_URL}${u.startsWith('/') ? '' : '/'}${u}`
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    })

    // A product with no image is rejected by Meta (image_link is required).
    const items = products
      .filter(p => p.images.length > 0)
      .map(p => {
        const description = p.description.replace(/<[^>]+>/g, '').slice(0, 5000)
        const hasSale = p.salePrice != null && p.salePrice < p.price
        const additional = p.images
          .slice(1, 11)
          .map(img => `      <g:additional_image_link>${xmlEscape(absUrl(img))}</g:additional_image_link>`)
          .join('\n')

        return `    <item>
      <g:id>${xmlEscape(p.id)}</g:id>
      <g:title>${xmlEscape(p.name)}</g:title>
      <g:description>${xmlEscape(description)}</g:description>
      <g:availability>${p.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>
      <g:condition>new</g:condition>
      <g:price>${p.price} NPR</g:price>${hasSale ? `\n      <g:sale_price>${p.salePrice} NPR</g:sale_price>` : ''}
      <g:link>${xmlEscape(`${STORE_URL}/products/${p.slug}`)}</g:link>
      <g:image_link>${xmlEscape(absUrl(p.images[0]))}</g:image_link>${additional ? '\n' + additional : ''}
      <g:brand>${xmlEscape(p.brand ?? STORE_NAME)}</g:brand>
      <g:product_type>${xmlEscape(p.category.name)}</g:product_type>
    </item>`
      })
      .join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xmlEscape(STORE_NAME)}</title>
    <link>${xmlEscape(STORE_URL)}</link>
    <description>${xmlEscape(`${STORE_NAME} product catalog`)}</description>
${items}
  </channel>
</rss>`

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (e) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<error>${xmlEscape(String(e))}</error>`,
      { status: 500, headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
    )
  }
}
