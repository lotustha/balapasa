import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET() {
  const products = await prisma.product.findMany({
    include: { category: true, supplier: true },
    orderBy: { createdAt: 'desc' },
  })

  const rows = products.map(p => ({
    SKU:                 p.sku ?? '',
    Name:                p.name,
    Slug:                p.slug,
    Description:         p.description,
    Category:            p.category.name,
    Brand:               p.brand ?? '',
    Supplier:            p.supplier?.name ?? '',
    'Supplier Email':    p.supplier?.email ?? '',
    'Supplier Phone':    p.supplier?.phone ?? '',
    Price:               p.price,
    'Sale Price':        p.salePrice ?? '',
    'Cost Price':        p.costPrice ?? '',
    Stock:               p.stock,
    'Low Stock Alert':   p.lowStockThreshold,
    Barcode:             p.barcode ?? '',
    'Weight (kg)':       p.weight ?? '',
    Tags:                p.tags.join(', '),
    'Is Active':         p.isActive ? 'Yes' : 'No',
    'Is Featured':       p.isFeatured ? 'Yes' : 'No',
    'Is New':            p.isNew ? 'Yes' : 'No',
    'Is Taxable':        p.isTaxable ? 'Yes' : 'No',
    Rating:              p.rating,
    'Review Count':      p.reviewCount,
    'Created At':        p.createdAt.toISOString().slice(0, 10),
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 30 }, { wch: 25 }, { wch: 50 }, { wch: 15 },
    { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 8  }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 25 }, { wch: 8  }, { wch: 10 }, { wch: 8  },
    { wch: 10 }, { wch: 8  }, { wch: 12 }, { wch: 12 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Products')

  // Also add a Suppliers reference sheet
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } })
  const suppRows = suppliers.map(s => ({
    Name: s.name, 'Contact': s.contactName ?? '', Email: s.email ?? '',
    Phone: s.phone ?? '', Address: s.address ?? '', Notes: s.notes ?? '',
    Active: s.isActive ? 'Yes' : 'No',
  }))
  const wsSupp = XLSX.utils.json_to_sheet(suppRows.length ? suppRows : [{ Name: 'No suppliers yet' }])
  XLSX.utils.book_append_sheet(wb, wsSupp, 'Suppliers')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const date = new Date().toISOString().slice(0, 10)
  return new Response(buf, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="balapasa-products-${date}.xlsx"`,
    },
  })
}
