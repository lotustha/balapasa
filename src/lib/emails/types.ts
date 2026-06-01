import 'server-only'

export interface BrandFields {
  siteUrl:  string
  siteName: string
  tagline?: string
  /** Store logo. Absolute URL, or a path relative to siteUrl. Injected centrally
   *  by render(); the email layout resolves it to an absolute src. */
  logoUrl?: string
}

export interface MagicLinkData extends BrandFields {
  recipientEmail: string
  recipientName?: string
  magicLinkUrl:   string
  expiresInDays:  number
}

export interface AbandonedCartItem {
  name:     string
  quantity: number
  price:    number
  image?:   string
}

export interface AbandonedCartData extends BrandFields {
  recipientName: string
  cartUrl:       string
  items:         AbandonedCartItem[]
  itemCount:     number
  subtotal:      number
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

// Internal email to the store's notification address whenever an order's status
// changes — manually (admin) or automatically (PnD webhook). Opt-in.
export interface AdminStatusChangeData extends BrandFields {
  orderId:        string
  orderCode:      string | null
  status:         string                 // new status (PENDING…DELIVERED/CANCELLED)
  source:         string | null          // 'Admin' | 'Pick & Drop' | etc.
  customerName:   string
  customerPhone:  string
  total:          number
  shippingOption: string | null
  adminUrl:       string
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

// Sent to a product's SUPPLIER — either a firm purchase order (admin clicks
// "Reorder" on the product page, quantity set) or an automatic low-stock alert
// (stock crossed the threshold, quantity may be null = "please prepare to
// restock"). One template handles both via `kind`.
export interface SupplierReorderData extends BrandFields {
  kind:           'PURCHASE_ORDER' | 'LOW_STOCK_ALERT'
  supplierName:   string
  contactName:    string | null
  productName:    string
  sku:            string | null
  currentStock:   number
  threshold:      number
  quantity:       number | null         // requested units (null for a bare alert)
  note:           string | null         // optional message from admin
  storePhone:     string | null         // so the supplier can confirm the order
  storeEmail:     string | null
  recipientEmail: string                // supplier email (logging/context)
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
