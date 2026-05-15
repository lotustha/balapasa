import 'server-only'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── DB-backed config ─────────────────────────────────────────────────────────
// Payment provider credentials live in app_settings. The previous version read
// them via process.env at module-startup which meant DB saves didn't take
// effect until the next deploy. Cached 30s; busted on settings save.

interface PaymentConfig {
  esewa: {
    merchantId: string
    secretKey:  string
    baseUrl:    string  // used to derive ESEWA_PAYMENT_URL
    statusUrl:  string
  }
  khalti: {
    secretKey:  string
    baseUrl:    string
    publicKey:  string  // exposed to client via /api/checkout/payment-config
  }
}

// Sensible static defaults so dev environments work without DB rows yet. Live
// credentials (merchantId, secretKey, etc.) MUST come from app_settings.
const DEFAULTS = {
  esewaMerchantId: 'EPAYTEST',
  esewaSecretKey:  '8gBm/:&EnhH.1/q',
  esewaBaseUrl:    'https://rc-epay.esewa.com.np',
  esewaStatusUrl:  'https://rc.esewa.com.np/api/epay/transaction/status/',
  khaltiSecretKey: 'test_secret_key_dc74e0fd57cb46cd93832aee0a390234',
  khaltiBaseUrl:   'https://dev.khalti.com',
  khaltiPublicKey: 'test_public_key_dc74e0fd57cb46cd93832aee0a390234',
}

const CACHE_TTL_MS = 30_000
let cache: { value: PaymentConfig; expiresAt: number } | null = null

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.value

  let rows: { key: string; value: string }[] = []
  try {
    rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM app_settings
      WHERE key IN (
        'ESEWA_MERCHANT_ID', 'ESEWA_SECRET_KEY', 'ESEWA_BASE_URL', 'ESEWA_STATUS_URL',
        'KHALTI_SECRET_KEY', 'KHALTI_BASE_URL', 'KHALTI_PUBLIC_KEY'
      )
    `
  } catch (e) {
    console.warn('[payment] config DB read failed, using defaults:', e)
  }
  const db = Object.fromEntries(rows.map(r => [r.key, r.value]))

  const config: PaymentConfig = {
    esewa: {
      merchantId: db.ESEWA_MERCHANT_ID || DEFAULTS.esewaMerchantId,
      secretKey:  db.ESEWA_SECRET_KEY  || DEFAULTS.esewaSecretKey,
      baseUrl:    db.ESEWA_BASE_URL    || DEFAULTS.esewaBaseUrl,
      statusUrl:  db.ESEWA_STATUS_URL  || DEFAULTS.esewaStatusUrl,
    },
    khalti: {
      secretKey:  db.KHALTI_SECRET_KEY || DEFAULTS.khaltiSecretKey,
      baseUrl:    db.KHALTI_BASE_URL   || DEFAULTS.khaltiBaseUrl,
      publicKey:  db.KHALTI_PUBLIC_KEY || DEFAULTS.khaltiPublicKey,
    },
  }
  cache = { value: config, expiresAt: now + CACHE_TTL_MS }
  return config
}

export function invalidatePaymentConfigCache(): void {
  cache = null
}

// ── eSewa ─────────────────────────────────────────────────────────────────────
// Docs: https://developer.esewa.com.np/pages/Epay#transactionflow

function esewaHmac(secret: string, message: string): string {
  return crypto.createHmac('sha256', secret).update(message).digest('base64')
}

/** Returns the URL that the eSewa form POSTs to. */
export async function getEsewaPaymentUrl(): Promise<string> {
  const cfg = await getPaymentConfig()
  return `${cfg.esewa.baseUrl}/api/epay/main/v2/form`
}

/** Build the hidden form fields POSTed to eSewa */
export async function esewaFormData(orderId: string, amount: number, deliveryCharge: number) {
  const cfg          = await getPaymentConfig()
  const totalAmount  = Math.round(amount + deliveryCharge)
  const productCode  = cfg.esewa.merchantId
  const message      = `total_amount=${totalAmount},transaction_uuid=${orderId},product_code=${productCode}`
  return {
    amount:                  String(Math.round(amount)),
    tax_amount:              '0',
    total_amount:            String(totalAmount),
    transaction_uuid:        orderId,
    product_code:            productCode,
    product_service_charge:  '0',
    product_delivery_charge: String(Math.round(deliveryCharge)),
    success_url:             `${APP_URL}/checkout/verify?method=esewa`,
    failure_url:             `${APP_URL}/checkout/failed`,
    signed_field_names:      'total_amount,transaction_uuid,product_code',
    signature:               esewaHmac(cfg.esewa.secretKey, message),
  }
}

/**
 * Verify the Base64-encoded callback response from eSewa.
 * 1. Decodes the `data` query param
 * 2. Re-computes HMAC over the signed fields
 * 3. Compares signatures (prevents tampering)
 */
export async function esewaVerifyCallback(dataB64: string): Promise<{
  valid:   boolean
  decoded: Record<string, string>
}> {
  let decoded: Record<string, string>
  try {
    decoded = JSON.parse(Buffer.from(dataB64, 'base64').toString('utf-8'))
  } catch {
    return { valid: false, decoded: {} }
  }

  const { signed_field_names, signature } = decoded
  if (!signed_field_names || !signature) return { valid: false, decoded }

  const cfg     = await getPaymentConfig()
  const message = signed_field_names
    .split(',')
    .map(k => `${k}=${decoded[k]}`)
    .join(',')

  const expected = esewaHmac(cfg.esewa.secretKey, message)
  const valid    = crypto.timingSafeEqual(
    Buffer.from(signature, 'base64'),
    Buffer.from(expected, 'base64'),
  )
  return { valid, decoded }
}

/**
 * Double-check with eSewa's status API (call AFTER signature verification).
 */
export async function esewaStatusCheck(
  transactionUuid: string,
  totalAmount:     number,
): Promise<{ status: string; ref_id?: string }> {
  const cfg = await getPaymentConfig()
  const url = new URL(cfg.esewa.statusUrl)
  url.searchParams.set('product_code',     cfg.esewa.merchantId)
  url.searchParams.set('transaction_uuid', transactionUuid)
  url.searchParams.set('total_amount',     String(totalAmount))

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) return { status: 'ERROR' }
  return res.json()
}

// ── Khalti ────────────────────────────────────────────────────────────────────
// Docs: https://docs.khalti.com/khalti-epayment/

/** Initiate a Khalti payment and return the payment_url to redirect the user to */
export async function khaltiInitiate(params: {
  orderId:       string
  orderName:     string
  amount:        number   // in NPR — converted to paisa internally
  customerName:  string
  customerEmail: string
  customerPhone: string
}): Promise<{ payment_url: string; pidx: string; error?: string }> {
  const cfg = await getPaymentConfig()
  const res = await fetch(`${cfg.khalti.baseUrl}/api/v2/epayment/initiate/`, {
    method: 'POST',
    headers: {
      Authorization:  `Key ${cfg.khalti.secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      return_url:           `${APP_URL}/checkout/verify?method=khalti`,
      website_url:           APP_URL,
      amount:                Math.round(params.amount * 100),
      purchase_order_id:     params.orderId,
      purchase_order_name:   params.orderName,
      customer_info: {
        name:  params.customerName,
        email: params.customerEmail,
        phone: params.customerPhone,
      },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    return { payment_url: '', pidx: '', error: err }
  }
  return res.json()
}

export async function khaltiLookup(pidx: string): Promise<{
  pidx:           string
  total_amount:   number
  status:         string
  transaction_id: string
  fee:            number
  refunded:       boolean
}> {
  const cfg = await getPaymentConfig()
  const res = await fetch(`${cfg.khalti.baseUrl}/api/v2/epayment/lookup/`, {
    method: 'POST',
    headers: {
      Authorization:  `Key ${cfg.khalti.secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pidx }),
    cache: 'no-store',
  })
  return res.json()
}
