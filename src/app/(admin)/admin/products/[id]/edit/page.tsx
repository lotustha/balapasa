'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ProductForm, { type ProductData } from '@/components/admin/ProductForm'
import { Loader2 } from 'lucide-react'

export default function EditProductPage() {
  const params  = useParams()
  const id      = params.id as string
  const [data,    setData]    = useState<Partial<ProductData> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(r => r.json())
      .then(p => {
        if (p.error) { setError(p.error); return }
        setData({
          name:              p.name,
          slug:              p.slug,
          sku:               p.sku   ?? '',
          description:       p.description,
          images:            p.images ?? [],
          price:             String(p.price),
          salePrice:         p.salePrice  ? String(p.salePrice)  : '',
          costPrice:         p.costPrice  ? String(p.costPrice)  : '',
          isTaxable:         p.isTaxable  ?? true,
          trackInventory:    p.trackInventory ?? true,
          stock:             String(p.stock   ?? 0),
          lowStockThreshold: String(p.lowStockThreshold ?? 10),
          barcode:           p.barcode ?? '',
          weight:            p.weight  ? String(p.weight)  : '',
          categoryId:        p.categoryId  ?? '',
          supplierId:        p.supplierId  ?? '',
          brand:             p.brand       ?? '',
          tags:              p.tags        ?? [],
          isActive:          p.isActive    ?? true,
          isFeatured:        p.isFeatured  ?? false,
          isNew:             p.isNew       ?? false,
        })
      })
      .catch(() => setError('Failed to load product'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-primary" />
    </div>
  )

  if (error) return (
    <div className="p-8 text-center text-red-500 font-semibold">{error}</div>
  )

  return <ProductForm mode="edit" productId={id} initial={data ?? undefined} />
}
