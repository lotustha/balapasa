'use client'

import { createContext, useContext, useState, useEffect } from 'react'

export interface ProductContextValue {
  name:  string
  price: number
  slug:  string
}

interface Ctx {
  product: ProductContextValue | null
  setProduct: (p: ProductContextValue | null) => void
  stickyBarVisible: boolean
  setStickyBarVisible: (v: boolean) => void
}

const ProductCtx = createContext<Ctx>({
  product: null,
  setProduct: () => {},
  stickyBarVisible: false,
  setStickyBarVisible: () => {},
})

export function ProductContextProvider({ children }: { children: React.ReactNode }) {
  const [product, setProduct] = useState<ProductContextValue | null>(null)
  const [stickyBarVisible, setStickyBarVisible] = useState(false)
  return (
    <ProductCtx.Provider value={{ product, setProduct, stickyBarVisible, setStickyBarVisible }}>
      {children}
    </ProductCtx.Provider>
  )
}

export function useProductContext() {
  return useContext(ProductCtx)
}

// Helper hook for product detail pages — registers the product on mount and clears on unmount.
// Takes primitives (not an object) so the effect dep array is stable across renders.
export function useRegisterProduct(name: string | null, price: number | null, slug: string | null) {
  const { setProduct } = useContext(ProductCtx)
  useEffect(() => {
    if (!name || price == null || !slug) return
    setProduct({ name, price, slug })
    return () => setProduct(null)
  }, [name, price, slug, setProduct])
}
