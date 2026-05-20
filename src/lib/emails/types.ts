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

export interface PaymentReceiptData extends BrandFields {
  orderId:       string
  orderCode:     string | null
  recipientName: string
  amount:        number
  method:        string                  // 'COD' | 'ESEWA' | 'KHALTI' (display label)
  transactionId: string | null
  itemsSummary:  string                  // short line, e.g. "Wireless Earbuds Pro + 2 more"
  orderUrl:      string                  // link back to /track-order/<code>
}

export interface DeliveryDispatchedData extends BrandFields {
  orderId:        string
  orderCode:      string | null
  recipientName:  string
  courierName:    string                 // 'Pick & Drop' | 'Pathao' | 'Store Rider' | etc.
  trackingNumber: string | null
  etaText:        string | null          // friendly window, e.g. "Same day, by 6 PM"
  orderUrl:       string
}

export type DeliveryExceptionKind =
  | 'PICKUP_FAILED'
  | 'DELIVERY_ATTEMPT_FAILED'
  | 'REDELIVERY'
  | 'REATTEMPTS_FAILED'
  | 'CANCELLED'

export interface DeliveryExceptionData extends BrandFields {
  orderId:       string
  orderCode:     string | null
  recipientName: string
  kind:          DeliveryExceptionKind
  comment:       string | null           // PnD `comments` field verbatim
  orderUrl:      string
}

export interface PickupReadyData extends BrandFields {
  orderId:       string
  orderCode:     string | null
  recipientName: string
  storeAddress:  string
  storeHours:    string | null
  pickupWindow:  string | null
  orderUrl:      string
}
