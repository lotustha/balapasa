export interface ClientProduct {
  id: string; name: string; slug: string; description: string
  price: number; salePrice: number | null; stock: number
  images: string[]; brand: string | null; sku: string | null
  rating: number; reviewCount: number; isNew: boolean; isTaxable: boolean
  videoUrl: string | null; salePriceExpiresAt: string | null; tags: string[]
  category: { id: string; name: string; slug: string; color: string; icon: string | null; image: string | null }
  options: { id: string; name: string; values: string[]; position: number }[]
  variants: { id: string; title: string; price: number | null; stock: number; image: string | null; options: Record<string, string>; sku: string | null }[]
}

export interface ClientReview {
  id: string; rating: number; comment: string | null; createdAt: string
  user: { name: string | null; avatar: string | null }
}

export interface ClientSlimProduct {
  id: string; name: string; slug: string
  price: number; salePrice: number | null
  images: string[]; rating: number; reviewCount: number
}
