import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function yn(v: unknown): boolean {
  return String(v).toLowerCase() === 'yes' || v === true || v === 1
}

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return Response.json({ error: 'No file uploaded' }, { status: 400 })

  const buf  = await file.arrayBuffer()
  const wb   = XLSX.read(buf, { type: 'array' })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

  if (!rows.length) return Response.json({ error: 'Spreadsheet is empty' }, { status: 400 })

  const results = { created: 0, updated: 0, skipped: 0, errors: [] as string[] }

  for (const row of rows) {
    const name = String(row['Name'] ?? '').trim()
    if (!name) { results.skipped++; continue }

    const categoryName = String(row['Category'] ?? 'Uncategorised').trim()
    const supplierName = String(row['Supplier'] ?? '').trim()

    // Find or create category
    let category = await prisma.category.findFirst({ where: { name: categoryName } })
    if (!category) {
      try {
        category = await prisma.category.create({
          data: { name: categoryName, slug: slugify(categoryName), color: '#16A34A' },
        })
      } catch { results.errors.push(`Could not create category "${categoryName}"`); results.skipped++; continue }
    }

    // Find or create supplier
    let supplierId: string | null = null
    if (supplierName) {
      let supplier = await prisma.supplier.findFirst({ where: { name: supplierName } })
      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: {
            name:        supplierName,
            email:       String(row['Supplier Email'] ?? '').trim() || null,
            phone:       String(row['Supplier Phone'] ?? '').trim() || null,
          },
        })
      }
      supplierId = supplier.id
    }

    const sku  = String(row['SKU'] ?? '').trim() || null
    const data = {
      name,
      slug:              slugify(name) + '-' + Date.now(),
      description:       String(row['Description'] ?? name),
      price:             Number(row['Price']) || 0,
      salePrice:         row['Sale Price']  ? Number(row['Sale Price'])  : null,
      costPrice:         row['Cost Price']  ? Number(row['Cost Price'])  : null,
      stock:             Number(row['Stock']) || 0,
      lowStockThreshold: Number(row['Low Stock Alert']) || 10,
      brand:             String(row['Brand'] ?? '').trim() || null,
      barcode:           String(row['Barcode'] ?? '').trim() || null,
      weight:            row['Weight (kg)'] ? Number(row['Weight (kg)']) : null,
      isTaxable:         yn(row['Is Taxable'] ?? true),
      isActive:          yn(row['Is Active']  ?? true),
      isFeatured:        yn(row['Is Featured'] ?? false),
      isNew:             yn(row['Is New']      ?? false),
      tags:              String(row['Tags'] ?? '').split(',').map((t: string) => t.trim()).filter(Boolean),
      images:            [],
      categoryId:        category.id,
      supplierId,
    }

    try {
      if (sku) {
        // Try upsert by SKU
        const existing = await prisma.product.findUnique({ where: { sku } })
        if (existing) {
          await prisma.product.update({ where: { sku }, data: { ...data, slug: existing.slug } })
          results.updated++
        } else {
          await prisma.product.create({ data: { ...data, sku, slug: slugify(name) + '-' + Date.now() } })
          results.created++
        }
      } else {
        // Create without SKU
        await prisma.product.create({ data })
        results.created++
      }
    } catch (e: unknown) {
      results.errors.push(`"${name}": ${e instanceof Error ? e.message : String(e)}`)
      results.skipped++
    }
  }

  return Response.json({ success: true, ...results, total: rows.length })
}
