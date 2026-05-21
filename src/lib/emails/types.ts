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

export interface CustomerOrderCancelledData extends BrandFields {
  orderId:        string
  orderCode:      string | null
  recipientName:  string
  total:          number
  paymentMethod:  string
  refundPending:  boolean              // true when a wallet refund is owed
  orderUrl:       string
}

export interface ReturnFiledData extends BrandFields {
  orderId:       string
  orderCode:     string | null
  recipientName: string
  refundAmount:  number
  items:         Array<{ name: string; quantity: number }>
  orderUrl:      string
}

export interface ReturnRequestedAdminData extends BrandFields {
  orderId:       string
  orderCode:     string | null
  customerName:  string
  refundAmount:  number
  itemCount:     number
  reason:        string
  adminUrl:      string
}

export interface ReturnApprovedData extends BrandFields {
  orderId:       string
  orderCode:     string | null
  recipientName: string
  storeAddress:  string                 // where to ship the items back
  adminNote:     string | null
  orderUrl:      string
}

export interface ReturnRejectedData extends BrandFields {
  orderId:       string
  orderCode:     string | null
  recipientName: string
  reason:        string                 // admin's stated reason
  orderUrl:      string
}

export interface RefundIssuedData extends BrandFields {
  orderId:       string
  orderCode:     string | null
  recipientName: string
  refundAmount:  number
  method:        string                 // free-text from adminNote ("via eSewa P2P", "in cash on pickup", etc.)
  orderUrl:      string
}
