import 'server-only'
import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/site-settings'
import type { OrderConfirmationData } from './order-confirmation'
import type { ShipmentEmailData }      from './shipment-update'
import type {
  MagicLinkData,
  AdminNewOrderData,
  AdminStatusChangeData,
  SignupWelcomeData,
  EmailVerificationData,
  LowStockData,
  SupplierReorderData,
  PaymentReceiptData,
  DeliveryDispatchedData,
  DeliveryExceptionData,
  PickupReadyData,
  CustomerOrderCancelledData,
  ReturnFiledData,
  ReturnRequestedAdminData,
  ReturnApprovedData,
  ReturnRejectedData,
  RefundIssuedData,
  AbandonedCartData,
  BackInStockData,
  InvoicePaidData,
} from './types'

import { orderConfirmedBranded } from './templates/order-confirmed/branded'
import { orderConfirmedMinimal } from './templates/order-confirmed/minimal'
import { orderConfirmedCompact } from './templates/order-confirmed/compact'

import { shipmentUpdateBranded } from './templates/shipment-update/branded'
import { shipmentUpdateMinimal } from './templates/shipment-update/minimal'
import { shipmentUpdateCompact } from './templates/shipment-update/compact'

import { magicLinkBranded } from './templates/magic-link/branded'
import { magicLinkMinimal } from './templates/magic-link/minimal'
import { magicLinkCompact } from './templates/magic-link/compact'

import { adminNewOrderBranded } from './templates/admin-new-order/branded'
import { adminNewOrderMinimal } from './templates/admin-new-order/minimal'
import { adminNewOrderCompact } from './templates/admin-new-order/compact'

import { adminStatusChangeBranded } from './templates/admin-status-change/branded'

import { signupWelcomeBranded } from './templates/signup-welcome/branded'
import { signupWelcomeMinimal } from './templates/signup-welcome/minimal'
import { signupWelcomeCompact } from './templates/signup-welcome/compact'

import { emailVerificationBranded } from './templates/email-verification/branded'
import { emailVerificationMinimal } from './templates/email-verification/minimal'
import { emailVerificationCompact } from './templates/email-verification/compact'

import { lowStockBranded } from './templates/low-stock/branded'
import { lowStockMinimal } from './templates/low-stock/minimal'
import { lowStockCompact } from './templates/low-stock/compact'

import { supplierReorderBranded } from './templates/supplier-reorder/branded'
import { abandonedCartBranded } from './templates/abandoned-cart/branded'

import { paymentReceiptBranded } from './templates/payment-receipt/branded'
import { paymentReceiptMinimal } from './templates/payment-receipt/minimal'
import { paymentReceiptCompact } from './templates/payment-receipt/compact'

import { deliveryDispatchedBranded } from './templates/delivery-dispatched/branded'
import { deliveryDispatchedMinimal } from './templates/delivery-dispatched/minimal'
import { deliveryDispatchedCompact } from './templates/delivery-dispatched/compact'

import { deliveryExceptionBranded } from './templates/delivery-exception/branded'
import { deliveryExceptionMinimal } from './templates/delivery-exception/minimal'
import { deliveryExceptionCompact } from './templates/delivery-exception/compact'

import { pickupReadyBranded } from './templates/pickup-ready/branded'
import { pickupReadyMinimal } from './templates/pickup-ready/minimal'
import { pickupReadyCompact } from './templates/pickup-ready/compact'

import { customerOrderCancelledBranded } from './templates/customer-order-cancelled/branded'
import { returnFiledBranded }              from './templates/return-filed/branded'
import { returnRequestedAdminBranded }     from './templates/return-requested-admin/branded'
import { returnApprovedBranded }           from './templates/return-approved/branded'
import { returnRejectedBranded }           from './templates/return-rejected/branded'
import { refundIssuedBranded }             from './templates/refund-issued/branded'
import { backInStockBranded }              from './templates/back-in-stock/branded'
import { invoicePaidBranded }              from './templates/invoice-paid/branded'

export type RenderResult = { subject: string; html: string }

export interface EmailVariant<T> {
  id:          string
  name:        string
  description: string
  /** Hex used for the gallery card accent stripe + chip. */
  accent:      string
  render:      (data: T) => RenderResult
}

export interface EmailEventDef<T> {
  id:          string
  label:       string
  description: string
  /** Sample payload used to render the variant gallery previews. */
  sampleData:  T
  variants:    EmailVariant<T>[]
  /** Whether this email is sent to customers (true) or internal/staff (false). */
  customerFacing: boolean
}

// Loose, non-generic version used internally for registry storage and lookup
// so we can index by a generic E without TS collapsing EventDataMap[E] into
// the intersection of all member shapes.
type AnyEmailEvent = {
  id:          string
  label:       string
  description: string
  sampleData:  unknown
  variants:    Array<{
    id:          string
    name:        string
    description: string
    accent:      string
    render:      (data: unknown) => RenderResult
  }>
  customerFacing: boolean
}

export interface EventDataMap {
  'order-confirmed':     OrderConfirmationData
  'shipment-update':     ShipmentEmailData
  'magic-link':          MagicLinkData
  'abandoned-cart':      AbandonedCartData
  'admin-new-order':     AdminNewOrderData
  'admin-status-change': AdminStatusChangeData
  'signup-welcome':      SignupWelcomeData
  'email-verification':  EmailVerificationData
  'low-stock':           LowStockData
  'supplier-reorder':    SupplierReorderData
  'payment-receipt':     PaymentReceiptData
  'delivery-dispatched': DeliveryDispatchedData
  'delivery-exception':  DeliveryExceptionData
  'pickup-ready':        PickupReadyData
  'customer-order-cancelled': CustomerOrderCancelledData
  'return-filed':             ReturnFiledData
  'return-requested-admin':   ReturnRequestedAdminData
  'return-approved':          ReturnApprovedData
  'return-rejected':          ReturnRejectedData
  'refund-issued':            RefundIssuedData
  'back-in-stock':            BackInStockData
  'invoice-paid':             InvoicePaidData
}

export type EventId = keyof EventDataMap

// ──────────────────────────────────────────────────────────────────────────
// Sample data — drives admin gallery previews. Keep realistic so admins can
// judge typography, item-row density, and CTA placement at a glance.
// ──────────────────────────────────────────────────────────────────────────

const SAMPLE_BRAND = {
  siteUrl:  'https://balapasa.com',
  siteName: 'Balapasa',
  tagline:  'Premium electronics, gadgets & beauty · Fast delivery',
  logoUrl:  '/logo.png',
}

const SAMPLE_ORDER_CONFIRMED: OrderConfirmationData = {
  orderId:        'previewid12345678',
  recipientName:  'Aarav Sharma',
  recipientEmail: 'aarav@example.com',
  recipientPhone: '+977 98XXXXXXXX',
  address:        'House 42, Ward 4, Maharajgunj, Kathmandu, Bagmati',
  shippingOption: 'Pick & Drop · Same-day delivery',
  subtotal:       4500,
  deliveryCharge: 0,
  couponDiscount: 450,
  autoDiscount:   null,
  total:          4050,
  paymentMethod:  'ESEWA',
  items: [
    { name: 'Wireless Earbuds Pro', quantity: 1, price: 3500 },
    { name: 'Magnetic Phone Stand',  quantity: 2, price: 500  },
  ],
  magicLinkUrl: 'https://balapasa.com/auth/magic?token=preview',
  ...SAMPLE_BRAND,
}

const SAMPLE_SHIPMENT_UPDATE: ShipmentEmailData = {
  orderId:        'previewid12345678',
  recipientName:  'Aarav Sharma',
  status:         'SHIPPED',
  trackingUrl:    null,
  shippingOption: 'Pick & Drop',
  ...SAMPLE_BRAND,
}

const SAMPLE_MAGIC_LINK: MagicLinkData = {
  recipientEmail: 'aarav@example.com',
  recipientName:  'Aarav Sharma',
  magicLinkUrl:   'https://balapasa.com/auth/magic?token=preview',
  expiresInDays:  7,
  ...SAMPLE_BRAND,
}

const SAMPLE_ADMIN_NEW_ORDER: AdminNewOrderData = {
  orderId:        'previewid12345678',
  customerName:   'Aarav Sharma',
  customerEmail:  'aarav@example.com',
  customerPhone:  '+977 98XXXXXXXX',
  total:          4050,
  itemCount:      3,
  paymentMethod:  'eSewa',
  shippingOption: 'Pick & Drop · Same-day',
  adminUrl:       'https://balapasa.com/admin/orders/previewid12345678',
  ...SAMPLE_BRAND,
}

const SAMPLE_ADMIN_STATUS_CHANGE: AdminStatusChangeData = {
  orderId:        'previewid12345678',
  orderCode:      'BLP-AIRP-123-0001',
  status:         'SHIPPED',
  source:         'Pick & Drop',
  customerName:   'Aarav Sharma',
  customerPhone:  '+977 98XXXXXXXX',
  total:          4050,
  shippingOption: 'Pick & Drop — POKHARA',
  adminUrl:       'https://balapasa.com/admin/orders/previewid12345678',
  ...SAMPLE_BRAND,
}

const SAMPLE_SIGNUP_WELCOME: SignupWelcomeData = {
  recipientName:  'Aarav Sharma',
  recipientEmail: 'aarav@example.com',
  accountUrl:     'https://balapasa.com/account',
  ...SAMPLE_BRAND,
}

const SAMPLE_EMAIL_VERIFICATION: EmailVerificationData = {
  recipientName:  'Aarav Sharma',
  recipientEmail: 'aarav@example.com',
  verifyUrl:      'https://balapasa.com/auth/verify?token=preview',
  expiresInHours: 24,
  ...SAMPLE_BRAND,
}

const SAMPLE_LOW_STOCK: LowStockData = {
  productName:    'Wireless Earbuds Pro',
  productId:      'prod_abc123xyz',
  currentStock:   3,
  threshold:      5,
  productUrl:     'https://balapasa.com/admin/products/prod_abc123xyz/edit',
  recipientEmail: 'admin@balapasa.com',
  ...SAMPLE_BRAND,
}

const SAMPLE_SUPPLIER_REORDER: SupplierReorderData = {
  kind:           'PURCHASE_ORDER',
  supplierName:   'Himalayan Imports Pvt. Ltd.',
  contactName:    'Bina Gurung',
  productName:    'Wireless Earbuds Pro',
  sku:            'AIRP-366',
  currentStock:   3,
  threshold:      10,
  quantity:       50,
  note:           'Please prioritise the matte-black variant if available.',
  storePhone:     '+977 98XXXXXXXX',
  storeEmail:     'orders@balapasa.com',
  recipientEmail: 'sales@himalayanimports.com',
  ...SAMPLE_BRAND,
}

const SAMPLE_PAYMENT_RECEIPT: PaymentReceiptData = {
  orderId:       'previewid12345678',
  orderCode:     'BLP-AIRP-123-0001',
  recipientName: 'Aarav Sharma',
  amount:        4050,
  method:        'eSewa',
  transactionId: 'TXN-7K8N2L-MQP',
  itemsSummary:  'Wireless Earbuds Pro + 2 more',
  orderUrl:      'https://balapasa.com/track-order/BLP-AIRP-123-0001',
  ...SAMPLE_BRAND,
}

const SAMPLE_DELIVERY_DISPATCHED: DeliveryDispatchedData = {
  orderId:        'previewid12345678',
  orderCode:      'BLP-AIRP-123-0001',
  recipientName:  'Aarav Sharma',
  courierName:    'Pick & Drop',
  trackingNumber: 'PND-NP-000659692',
  etaText:        'Same day, by 6 PM',
  orderUrl:       'https://balapasa.com/track-order/BLP-AIRP-123-0001',
  ...SAMPLE_BRAND,
}

const SAMPLE_DELIVERY_EXCEPTION: DeliveryExceptionData = {
  orderId:       'previewid12345678',
  orderCode:     'BLP-AIRP-123-0001',
  recipientName: 'Aarav Sharma',
  kind:          'DELIVERY_ATTEMPT_FAILED',
  comment:       'Customer not reachable',
  orderUrl:      'https://balapasa.com/track-order/BLP-AIRP-123-0001',
  ...SAMPLE_BRAND,
}

const SAMPLE_PICKUP_READY: PickupReadyData = {
  orderId:       'previewid12345678',
  orderCode:     'BLP-AIRP-123-0001',
  recipientName: 'Aarav Sharma',
  storeAddress:  'Balapasa Store, Balaju, Kathmandu',
  storeHours:    'Sun–Fri, 10 AM – 8 PM',
  pickupWindow:  'Today or tomorrow',
  orderUrl:      'https://balapasa.com/track-order/BLP-AIRP-123-0001',
  ...SAMPLE_BRAND,
}

const SAMPLE_ORDER_PREVIEW = {
  orderId:   'previewid12345678',
  orderCode: 'BLP-AIRP-123-0001',
  ...SAMPLE_BRAND,
}

const SAMPLE_CUSTOMER_ORDER_CANCELLED: CustomerOrderCancelledData = {
  ...SAMPLE_ORDER_PREVIEW,
  recipientName: 'Aarav Sharma',
  total:         4050,
  paymentMethod: 'eSewa',
  refundPending: true,
  orderUrl:      'https://balapasa.com/track-order/BLP-AIRP-123-0001',
}

const SAMPLE_ABANDONED_CART: AbandonedCartData = {
  ...SAMPLE_BRAND,
  recipientName: 'Aarav Sharma',
  cartUrl:       'https://balapasa.com/cart',
  itemCount:     2,
  subtotal:      4500,
  items: [
    { name: 'Wireless Earbuds Pro', quantity: 1, price: 3500, image: 'https://balapasa.com/placeholder.png' },
    { name: 'USB-C Fast Charger 30W', quantity: 1, price: 1000, image: 'https://balapasa.com/placeholder.png' },
  ],
}

const SAMPLE_RETURN_FILED: ReturnFiledData = {
  ...SAMPLE_ORDER_PREVIEW,
  recipientName: 'Aarav Sharma',
  refundAmount:  3500,
  items:         [{ name: 'Wireless Earbuds Pro', quantity: 1 }],
  orderUrl:      'https://balapasa.com/account/orders/previewid12345678/return',
}

const SAMPLE_RETURN_REQUESTED_ADMIN: ReturnRequestedAdminData = {
  ...SAMPLE_ORDER_PREVIEW,
  customerName: 'Aarav Sharma',
  refundAmount: 3500,
  itemCount:    1,
  reason:       'Damaged',
  adminUrl:     'https://balapasa.com/admin/returns/return_preview_id',
}

const SAMPLE_RETURN_APPROVED: ReturnApprovedData = {
  ...SAMPLE_ORDER_PREVIEW,
  recipientName: 'Aarav Sharma',
  storeAddress:  'Balapasa Store, Balaju, Kathmandu',
  adminNote:     'Bring the original packaging if possible.',
  orderUrl:      'https://balapasa.com/account/orders/previewid12345678/return',
}

const SAMPLE_RETURN_REJECTED: ReturnRejectedData = {
  ...SAMPLE_ORDER_PREVIEW,
  recipientName: 'Aarav Sharma',
  reason:        'The 7-day return window has already passed.',
  orderUrl:      'https://balapasa.com/account/orders/previewid12345678',
}

const SAMPLE_REFUND_ISSUED: RefundIssuedData = {
  ...SAMPLE_ORDER_PREVIEW,
  recipientName: 'Aarav Sharma',
  refundAmount:  3500,
  method:        'Refunded via eSewa P2P transfer.',
  orderUrl:      'https://balapasa.com/account/orders/previewid12345678',
}

// ──────────────────────────────────────────────────────────────────────────
// Registry — central map of event → variants. Adding a new event here +
// shipping its variant modules is all that's needed; the gallery, render(),
// and active-variant resolution all read from this single source.
// ──────────────────────────────────────────────────────────────────────────

// Per-entry typing is enforced by the helper `defineEvent` so each event's
// variants must match its data shape at construction. The map is then stored
// as AnyEmailEvent for generic-friendly lookups.
function defineEvent<T>(def: EmailEventDef<T>): AnyEmailEvent {
  return def as unknown as AnyEmailEvent
}

const SAMPLE_BACK_IN_STOCK: BackInStockData = {
  recipientName: 'Aarav Sharma',
  productName:   'Wireless Earbuds Pro',
  productUrl:    'https://balapasa.com/products/wireless-earbuds-pro',
  price:         3500,
  imageUrl:      null,
  productId:     'previewid12345678',
  ...SAMPLE_BRAND,
}

const SAMPLE_INVOICE_PAID: InvoicePaidData = {
  recipientName: 'Aarav Sharma',
  invoiceNumber: 'INV-2026-00042',
  amount:        1500,
  method:        'ESEWA',
  description:   'My School App — subscription',
  invoiceUrl:    'https://balapasa.com/api/account/invoices/preview/print',
  ...SAMPLE_BRAND,
}

const REGISTRY: Record<EventId, AnyEmailEvent> = {
  'order-confirmed': defineEvent<OrderConfirmationData>({
    id:          'order-confirmed',
    label:       'Order confirmed',
    description: 'Receipt sent to customer after checkout — items, totals, delivery, account-claim CTA.',
    sampleData:  SAMPLE_ORDER_CONFIRMED,
    variants:    [orderConfirmedBranded, orderConfirmedMinimal, orderConfirmedCompact],
    customerFacing: true,
  }),
  'shipment-update': defineEvent<ShipmentEmailData>({
    id:          'shipment-update',
    label:       'Shipment update',
    description: 'Status email when an order moves to SHIPPED, DELIVERED, or CANCELLED.',
    sampleData:  SAMPLE_SHIPMENT_UPDATE,
    variants:    [shipmentUpdateBranded, shipmentUpdateMinimal, shipmentUpdateCompact],
    customerFacing: true,
  }),
  'magic-link': defineEvent<MagicLinkData>({
    id:          'magic-link',
    label:       'Magic-link sign-in',
    description: 'Passwordless sign-in link sent when a customer requests one from /login.',
    sampleData:  SAMPLE_MAGIC_LINK,
    variants:    [magicLinkBranded, magicLinkMinimal, magicLinkCompact],
    customerFacing: true,
  }),
  'abandoned-cart': defineEvent<AbandonedCartData>({
    id:          'abandoned-cart',
    label:       'Abandoned cart reminder',
    description: 'Customer nudge sent by the recovery cron when a cart with contact details is left unpaid past the reminder window.',
    sampleData:  SAMPLE_ABANDONED_CART,
    variants:    [abandonedCartBranded],
    customerFacing: true,
  }),
  'admin-new-order': defineEvent<AdminNewOrderData>({
    id:          'admin-new-order',
    label:       'Admin: new order alert',
    description: 'Internal email to ORDER_NOTIFICATION_EMAIL when a new order is placed.',
    sampleData:  SAMPLE_ADMIN_NEW_ORDER,
    variants:    [adminNewOrderBranded, adminNewOrderMinimal, adminNewOrderCompact],
    customerFacing: false,
  }),
  'admin-status-change': defineEvent<AdminStatusChangeData>({
    id:          'admin-status-change',
    label:       'Admin: order status changed',
    description: 'Internal alert to ORDER_NOTIFICATION_EMAIL whenever an order status changes (manual or PnD webhook). Opt-in — off by default.',
    sampleData:  SAMPLE_ADMIN_STATUS_CHANGE,
    variants:    [adminStatusChangeBranded],
    customerFacing: false,
  }),
  'signup-welcome': defineEvent<SignupWelcomeData>({
    id:          'signup-welcome',
    label:       'Signup welcome',
    description: 'First-touch email when a customer creates an account.',
    sampleData:  SAMPLE_SIGNUP_WELCOME,
    variants:    [signupWelcomeBranded, signupWelcomeMinimal, signupWelcomeCompact],
    customerFacing: true,
  }),
  'email-verification': defineEvent<EmailVerificationData>({
    id:          'email-verification',
    label:       'Email verification',
    description: 'Confirms the email address belongs to the signup. Required to mark accounts as verified.',
    sampleData:  SAMPLE_EMAIL_VERIFICATION,
    variants:    [emailVerificationBranded, emailVerificationMinimal, emailVerificationCompact],
    customerFacing: true,
  }),
  'low-stock': defineEvent<LowStockData>({
    id:          'low-stock',
    label:       'Admin: low stock alert',
    description: 'Internal email when a product’s stock drops below the configured threshold.',
    sampleData:  SAMPLE_LOW_STOCK,
    variants:    [lowStockBranded, lowStockMinimal, lowStockCompact],
    customerFacing: false,
  }),
  'supplier-reorder': defineEvent<SupplierReorderData>({
    id:          'supplier-reorder',
    label:       'Supplier: reorder / low stock',
    description: 'Sent to a product’s supplier — a firm purchase order (admin clicks Reorder) or an automatic low-stock alert when stock crosses the threshold.',
    sampleData:  SAMPLE_SUPPLIER_REORDER,
    variants:    [supplierReorderBranded],
    customerFacing: false,
  }),
  'payment-receipt': defineEvent<PaymentReceiptData>({
    id:          'payment-receipt',
    label:       'Payment receipt',
    description: 'Fires when paymentStatus → PAID (eSewa, Khalti, or COD collected on delivery).',
    sampleData:  SAMPLE_PAYMENT_RECEIPT,
    variants:    [paymentReceiptBranded, paymentReceiptMinimal, paymentReceiptCompact],
    customerFacing: true,
  }),
  'delivery-dispatched': defineEvent<DeliveryDispatchedData>({
    id:          'delivery-dispatched',
    label:       'Delivery dispatched',
    description: 'Customer email when a courier is assigned or PnD reports successful pickup.',
    sampleData:  SAMPLE_DELIVERY_DISPATCHED,
    variants:    [deliveryDispatchedBranded, deliveryDispatchedMinimal, deliveryDispatchedCompact],
    customerFacing: true,
  }),
  'delivery-exception': defineEvent<DeliveryExceptionData>({
    id:          'delivery-exception',
    label:       'Delivery exception',
    description: 'Webhook-driven email when a delivery attempt fails, is postponed, or cancelled.',
    sampleData:  SAMPLE_DELIVERY_EXCEPTION,
    variants:    [deliveryExceptionBranded, deliveryExceptionMinimal, deliveryExceptionCompact],
    customerFacing: true,
  }),
  'pickup-ready': defineEvent<PickupReadyData>({
    id:          'pickup-ready',
    label:       'Ready for pickup',
    description: 'Sent for store-pickup orders when admin marks them ready.',
    sampleData:  SAMPLE_PICKUP_READY,
    variants:    [pickupReadyBranded, pickupReadyMinimal, pickupReadyCompact],
    customerFacing: true,
  }),
  'customer-order-cancelled': defineEvent<CustomerOrderCancelledData>({
    id:          'customer-order-cancelled',
    label:       'Order cancelled by customer',
    description: 'Customer-initiated cancellation before SHIPPED. Notes whether a refund is pending.',
    sampleData:  SAMPLE_CUSTOMER_ORDER_CANCELLED,
    variants:    [customerOrderCancelledBranded],
    customerFacing: true,
  }),
  'return-filed': defineEvent<ReturnFiledData>({
    id:          'return-filed',
    label:       'Return filed (customer)',
    description: 'Customer confirmation that the return request was received and is pending review.',
    sampleData:  SAMPLE_RETURN_FILED,
    variants:    [returnFiledBranded],
    customerFacing: true,
  }),
  'return-requested-admin': defineEvent<ReturnRequestedAdminData>({
    id:          'return-requested-admin',
    label:       'Admin: new return request',
    description: 'Internal alert when a customer files a return — surfaces refund amount + admin link.',
    sampleData:  SAMPLE_RETURN_REQUESTED_ADMIN,
    variants:    [returnRequestedAdminBranded],
    customerFacing: false,
  }),
  'return-approved': defineEvent<ReturnApprovedData>({
    id:          'return-approved',
    label:       'Return approved',
    description: 'Customer email when admin approves a return — includes the store return address.',
    sampleData:  SAMPLE_RETURN_APPROVED,
    variants:    [returnApprovedBranded],
    customerFacing: true,
  }),
  'return-rejected': defineEvent<ReturnRejectedData>({
    id:          'return-rejected',
    label:       'Return rejected',
    description: 'Customer email when admin rejects a return — communicates the reason.',
    sampleData:  SAMPLE_RETURN_REJECTED,
    variants:    [returnRejectedBranded],
    customerFacing: true,
  }),
  'refund-issued': defineEvent<RefundIssuedData>({
    id:          'refund-issued',
    label:       'Refund issued',
    description: 'Customer email confirming the refund has been paid out via the method admin recorded.',
    sampleData:  SAMPLE_REFUND_ISSUED,
    variants:    [refundIssuedBranded],
    customerFacing: true,
  }),
  'back-in-stock': defineEvent<BackInStockData>({
    id:          'back-in-stock',
    label:       'Back in stock',
    description: 'Customer alert when a product they subscribed to (via "Notify me when available") is restocked. Sent by the back-in-stock cron.',
    sampleData:  SAMPLE_BACK_IN_STOCK,
    variants:    [backInStockBranded],
    customerFacing: true,
  }),
  'invoice-paid': defineEvent<InvoicePaidData>({
    id:          'invoice-paid',
    label:       'Invoice paid',
    description: 'Customer receipt when a subscription-cycle or one-off invoice is paid — amount, method, and a download-invoice link.',
    sampleData:  SAMPLE_INVOICE_PAID,
    variants:    [invoicePaidBranded],
    customerFacing: true,
  }),
}

export const EMAIL_EVENTS = REGISTRY

export function getEvent(id: EventId): AnyEmailEvent {
  return REGISTRY[id]
}

/**
 * Lightweight event summaries for the admin /emails listing — strips sampleData
 * and renderer functions, which are heavy and aren't serialisable.
 */
export interface EventSummary {
  id:             string
  label:          string
  description:    string
  variantCount:   number
  customerFacing: boolean
}

export function listEventSummaries(): EventSummary[] {
  return Object.values(REGISTRY).map(e => ({
    id:             e.id,
    label:          e.label,
    description:    e.description,
    variantCount:   e.variants.length,
    customerFacing: e.customerFacing,
  }))
}

export function isEventId(id: string): id is EventId {
  return id in REGISTRY
}

// ──────────────────────────────────────────────────────────────────────────
// Active-variant resolution. The admin pick is stored in app_settings under
// EMAIL_TEMPLATE_<EVENT_ID>. Cached for 30s, busted on save.
// ──────────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000
let activeCache: { values: Record<string, string>; expiresAt: number } | null = null

export function activeVariantKey(eventId: EventId): string {
  return 'EMAIL_TEMPLATE_' + eventId.toUpperCase().replace(/-/g, '_')
}

async function loadActiveVariants(): Promise<Record<string, string>> {
  const now = Date.now()
  if (activeCache && activeCache.expiresAt > now) return activeCache.values
  let rows: { key: string; value: string }[] = []
  try {
    rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM app_settings WHERE key LIKE 'EMAIL_TEMPLATE_%'
    `
  } catch (e) {
    console.warn('[email-registry] active variant read failed:', e)
  }
  const values = Object.fromEntries(rows.map(r => [r.key, r.value]))
  activeCache = { values, expiresAt: now + CACHE_TTL_MS }
  return values
}

export function invalidateActiveVariantCache(): void {
  activeCache = null
}

export async function getActiveVariantId(eventId: EventId): Promise<string> {
  const values  = await loadActiveVariants()
  const event   = REGISTRY[eventId]
  const stored  = values[activeVariantKey(eventId)]
  if (stored && event.variants.some(v => v.id === stored)) return stored
  return event.variants[0].id
}

export async function setActiveVariant(eventId: EventId, variantId: string): Promise<void> {
  const event = REGISTRY[eventId]
  if (!event.variants.some(v => v.id === variantId)) {
    throw new Error(`Unknown variant "${variantId}" for event "${eventId}"`)
  }
  const key = activeVariantKey(eventId)
  await prisma.$executeRaw`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${key}, ${variantId}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${variantId}, updated_at = NOW()
  `
  invalidateActiveVariantCache()
}

// ──────────────────────────────────────────────────────────────────────────
// Render entry points
// ──────────────────────────────────────────────────────────────────────────

export async function render<E extends EventId>(
  eventId: E,
  data:    EventDataMap[E],
): Promise<RenderResult> {
  const event    = REGISTRY[eventId]
  const activeId = await getActiveVariantId(eventId)
  const variant  = event.variants.find(v => v.id === activeId) ?? event.variants[0]
  // Inject the configured store logo so every template header renders it,
  // unless the caller already supplied one. The layout resolves it absolute.
  const withLogo = (data as { logoUrl?: string }).logoUrl
    ? data
    : { ...data, logoUrl: (await getSiteSettings()).logoUrl }
  return variant.render(withLogo as unknown)
}

/**
 * Variant-specific render. Used by the admin preview and test-send routes
 * where the variant id comes from a query string (not statically known), so
 * the data parameter is untyped — the caller is responsible for passing a
 * shape compatible with the event.
 */
export function renderWithVariant(
  eventId:   EventId,
  variantId: string,
  data:      unknown,
): RenderResult | null {
  const event   = REGISTRY[eventId]
  const variant = event.variants.find(v => v.id === variantId)
  if (!variant) return null
  return variant.render(data)
}
