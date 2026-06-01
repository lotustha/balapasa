export interface ClientProduct {
  id: string; name: string; slug: string; description: string
  price: number; salePrice: number | null; stock: number
  images: string[]; brand: string | null; sku: string | null
  rating: number; reviewCount: number; isNew: boolean; isTaxable: boolean
  videoUrl: string | null
  salePriceStartsAt:    string | null
  salePriceExpiresAt:   string | null
  saleInitialStock:     number | null
  maxPerCustomerOnSale: number | null
  isDealOfTheDay:       boolean
  tags: string[]
  weight: number | null
  length: number | null
  width:  number | null
  height: number | null
  faqs:   Array<{ q: string; a: string }> | null
  kind:   string
  planId: string | null
  plan: {
    id: string; name: string; description: string | null; image: string | null
    amount: number; interval: string; intervalCount: number; trialDays: number
  } | null
  category: { id: string; name: string; slug: string; color: string; icon: string | null; image: string | null }
  options: { id: string; name: string; values: string[]; position: number }[]
  variants: { id: string; title: string; price: number | null; stock: number; image: string | null; options: Record<string, string>; sku: string | null }[]
  // Set only for kind === 'BUNDLE'. The items included in the kit; `stock` above
  // is the derived bundle availability (whole bundles fulfillable). `inStock`
  // per component reflects whether its share is currently coverable.
  bundleComponents: Array<{
    id: string; name: string; slug: string
    price: number; salePrice: number | null
    image: string | null; quantity: number; inStock: boolean
  }> | null
}

export interface ClientReview {
  id: string; rating: number; comment: string | null; createdAt: string
  user: { name: string | null; avatar: string | null }
}

export interface ClientSlimProduct {
  id: string; name: string; slug: string
  price: number; salePrice: number | null
  images: string[]; rating: number; reviewCount: number
  brand?: string | null
}

export interface ClientAnswer {
  id: string; body: string; authorName: string; isOfficial: boolean; createdAt: string
}

export interface ClientQuestion {
  id: string; body: string; authorName: string; createdAt: string
  answers: ClientAnswer[]
}
