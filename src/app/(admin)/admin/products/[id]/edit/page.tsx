'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ProductForm, { type ProductData } from '@/components/admin/ProductForm'
import SupplierReorderCard from '@/components/admin/SupplierReorderCard'
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
          salePriceStartsAt:  p.salePriceStartsAt  ? new Date(p.salePriceStartsAt).toISOString()  : '',
          salePriceExpiresAt: p.salePriceExpiresAt ? new Date(p.salePriceExpiresAt).toISOString() : '',
          maxPerCustomerOnSale: p.maxPerCustomerOnSale != null ? String(p.maxPerCustomerOnSale) : '',
          isDealOfTheDay:    p.isDealOfTheDay ?? false,
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
          freeDelivery:      p.freeDelivery ?? false,
          videoUrl:          p.videoUrl    ?? '',
          boughtTogetherIds: p.boughtTogetherIds ?? [],
          kind:              p.kind              ?? 'PHYSICAL',
          planId:            p.planId            ?? '',
          bundleComponents:  p.bundleComponents  ?? [],
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

  return (
    <>
      <ProductForm mode="edit" productId={id} initial={data ?? undefined} />
      {/* Reorder card lives under the form's main column — same max-width,
          padding, grid and card chrome so it reads as another form section. */}
      <div className="max-w-5xl px-8 pb-8 -mt-1">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SupplierReorderCard productId={id} />
          </div>
        </div>
      </div>
    </>
  )
}
