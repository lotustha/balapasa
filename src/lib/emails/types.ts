import 'server-only'

export interface BrandFields {
  siteUrl:  string
  siteName: string
  tagline?: string
}

export interface MagicLinkData extends BrandFields {
  recipientEmail: string
  recipientName?: string
  magicLinkUrl:   string
  expiresInDays:  number
}

export interface AdminNewOrderData extends BrandFields {
  orderId:        string
  customerName:   string
  customerEmail:  string
  customerPhone:  string
  total:          number
  itemCount:      number
  paymentMethod:  string
  shippingOption: string
  adminUrl:       string
}

export interface SignupWelcomeData extends BrandFields {
  recipientName:  string
  recipientEmail: string
  accountUrl:     string
}

export interface EmailVerificationData extends BrandFields {
  recipientName?: string
  recipientEmail: string
  verifyUrl:      string
  expiresInHours: number
}

export interface LowStockData extends BrandFields {
  productName:    string
  productId:      string
  currentStock:   number
  threshold:      number
  productUrl:     string
  recipientEmail: string
}
