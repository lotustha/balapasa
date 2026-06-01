import { prisma } from '@/lib/prisma'
import SuppliersBoard, { type SupplierCardData } from '@/components/admin/SuppliersBoard'

// Low-stock predicate is a column-to-column compare (stock <= low_stock_threshold)
// which Prisma's `where` can't express — raw SQL. The SAME predicate feeds both
// the per-supplier list and the header count so they can never disagree.
async function getData(): Promise<SupplierCardData[]> {
  try {
    const [suppliers, lowStock] = await Promise.all([
      prisma.supplier.findMany({
        include: { _count: { select: { products: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.$queryRaw<Array<{ id: string; name: string; sku: string | null; stock: number; lowStockThreshold: number; supplierId: string }>>`
        SELECT id, name, sku, stock, low_stock_threshold AS "lowStockThreshold", supplier_id AS "supplierId"
        FROM products
        WHERE supplier_id IS NOT NULL AND is_active = true AND track_inventory = true AND stock <= low_stock_threshold
        ORDER BY stock ASC
      `,
    ])

    const lowBySupplier = new Map<string, Array<{ id: string; name: string; sku: string | null; stock: number; lowStockThreshold: number }>>()
    for (const p of lowStock) {
      const list = lowBySupplier.get(p.supplierId) ?? []
      list.push({ id: p.id, name: p.name, sku: p.sku, stock: p.stock, lowStockThreshold: p.lowStockThreshold })
      lowBySupplier.set(p.supplierId, list)
    }

    return suppliers.map(s => ({
      id: s.id, name: s.name, contactName: s.contactName, email: s.email,
      phone: s.phone, address: s.address, notes: s.notes, isActive: s.isActive,
      productCount: s._count.products,
      lowStock: lowBySupplier.get(s.id) ?? [],
    }))
  } catch {
    return []
  }
}

export default async function SuppliersPage() {
  const suppliers = await getData()
  return <SuppliersBoard suppliers={suppliers} />
}
