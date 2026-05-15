import 'server-only'
import { prisma } from '@/lib/prisma'
import type { OrderConfirmationData } from './order-confirmation'
import type { ShipmentEmailData }      from './shipment-update'
import type {
  MagicLinkData,
  AdminNewOrderData,
  SignupWelcomeData,
  EmailVerificationData,
  LowStockData,
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

import { signupWelcomeBranded } from './templates/signup-welcome/branded'
import { signupWelcomeMinimal } from './templates/signup-welcome/minimal'
import { signupWelcomeCompact } from './templates/signup-welcome/compact'

import { emailVerificationBranded } from './templates/email-verification/branded'
import { emailVerificationMinimal } from './templates/email-verification/minimal'
import { emailVerificationCompact } from './templates/email-verification/compact'

import { lowStockBranded } from './templates/low-stock/branded'
import { lowStockMinimal } from './templates/low-stock/minimal'
import { lowStockCompact } from './templates/low-stock/compact'

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
  'order-confirmed':    OrderConfirmationData
  'shipment-update':    ShipmentEmailData
  'magic-link':         MagicLinkData
  'admin-new-order':    AdminNewOrderData
  'signup-welcome':     SignupWelcomeData
  'email-verification': EmailVerificationData
  'low-stock':          LowStockData
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
  'admin-new-order': defineEvent<AdminNewOrderData>({
    id:          'admin-new-order',
    label:       'Admin: new order alert',
    description: 'Internal email to ORDER_NOTIFICATION_EMAIL when a new order is placed.',
    sampleData:  SAMPLE_ADMIN_NEW_ORDER,
    variants:    [adminNewOrderBranded, adminNewOrderMinimal, adminNewOrderCompact],
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
  return variant.render(data as unknown)
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
