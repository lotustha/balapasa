import crypto from 'crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── eSewa ─────────────────────────────────────────────────────────────────────
// Docs: https://developer.esewa.com.np/pages/Epay#transactionflow

const ESEWA_MERCHANT_ID = process.env.ESEWA_MERCHANT_ID ?? 'EPAYTEST'
const ESEWA_SECRET_KEY  = process.env.ESEWA_SECRET_KEY  ?? '8gBm/:&EnhH.1/q'

// Payment form endpoint
export const ESEWA_PAYMENT_URL =
  process.env.NEXT_PUBLIC_ESEWA_BASE_URL
    ? `${process.env.NEXT_PUBLIC_ESEWA_BASE_URL}/api/epay/main/v2/form`
    : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'

// Transaction status check endpoint (different subdomain!)
const ESEWA_STATUS_URL =
  process.env.ESEWA_STATUS_URL ?? 'https://rc.esewa.com.np/api/epay/transaction/status/'

/** Generate HMAC-SHA256 signature for the payment form */
function esewaHmac(message: string): string {
  return crypto.createHmac('sha256', ESEWA_SECRET_KEY).update(message).digest('base64')
}

/** Build the hidden form fields POSTed to eSewa */
export function esewaFormData(orderId: string, amount: number, deliveryCharge: number) {
  const totalAmount  = Math.round(amount + deliveryCharge)
  const productCode  = ESEWA_MERCHANT_ID
  // Signature message: fields joined as "key=value,key=value,..."
  const message  = `total_amount=${totalAmount},transaction_uuid=${orderId},product_code=${productCode}`
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
    signature:               esewaHmac(message),
  }
}

/**
 * Verify the Base64-encoded callback response from eSewa.
 * 1. Decodes the `data` query param
 * 2. Re-computes HMAC over the signed fields
 * 3. Compares signatures (prevents tampering)
 * Returns { valid, decoded } — never trust status without valid=true.
 */
export function esewaVerifyCallback(dataB64: string): {
  valid: boolean
  decoded: Record<string, string>
} {
  let decoded: Record<string, string>
  try {
    decoded = JSON.parse(Buffer.from(dataB64, 'base64').toString('utf-8'))
  } catch {
    return { valid: false, decoded: {} }
  }

  const { signed_field_names, signature, ...rest } = decoded
  if (!signed_field_names || !signature) return { valid: false, decoded }

  // Re-build the message from the signed field names in their original order
  const message = signed_field_names
    .split(',')
    .map(k => `${k}=${decoded[k]}`)
    .join(',')

  const expected = esewaHmac(message)
  const valid    = crypto.timingSafeEqual(
    Buffer.from(signature, 'base64'),
    Buffer.from(expected, 'base64'),
  )
  return { valid, decoded }
}

/**
 * Double-check with eSewa's status API (call AFTER signature verification).
 * Only COMPLETE should be treated as success.
 */
export async function esewaStatusCheck(
  transactionUuid: string,
  totalAmount: number,
): Promise<{ status: string; ref_id?: string }> {
  const url = new URL(ESEWA_STATUS_URL)
  url.searchParams.set('product_code',     ESEWA_MERCHANT_ID)
  url.searchParams.set('transaction_uuid', transactionUuid)
  url.searchParams.set('total_amount',     String(totalAmount))

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) return { status: 'ERROR' }
  return res.json()
}

// ── Khalti ────────────────────────────────────────────────────────────────────
// Docs: https://docs.khalti.com/khalti-epayment/

// Sandbox: https://dev.khalti.com  |  Production: https://khalti.com
const KHALTI_BASE_URL  = process.env.KHALTI_BASE_URL  ?? 'https://dev.khalti.com'
const KHALTI_SECRET    = process.env.KHALTI_SECRET_KEY ?? 'test_secret_key_dc74e0fd57cb46cd93832aee0a390234'

/** Initiate a Khalti payment and return the payment_url to redirect the user to */
export async function khaltiInitiate(params: {
  orderId:       string
  orderName:     string
  amount:        number   // in NPR — converted to paisa internally
  customerName:  string
  customerEmail: string
  customerPhone: string
}): Promise<{ payment_url: string; pidx: string; error?: string }> {
  const res = await fetch(`${KHALTI_BASE_URL}/api/v2/epayment/initiate/`, {
    method: 'POST',
    headers: {
      Authorization:  `Key ${KHALTI_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      return_url:           `${APP_URL}/checkout/verify?method=khalti`,
      website_url:           APP_URL,
      amount:                Math.round(params.amount * 100),  // paisa (min 1000 = Rs 10)
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

/**
 * Lookup a Khalti payment by pidx.
 * ONLY 'Completed' status means success — verify before fulfilling orders.
 */
export async function khaltiLookup(pidx: string): Promise<{
  pidx:           string
  total_amount:   number   // in paisa
  status:         string   // 'Completed' | 'Pending' | 'Refunded' | 'Expired' | 'User canceled'
  transaction_id: string
  fee:            number
  refunded:       boolean
}> {
  const res = await fetch(`${KHALTI_BASE_URL}/api/v2/epayment/lookup/`, {
    method: 'POST',
    headers: {
      Authorization:  `Key ${KHALTI_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pidx }),
    cache: 'no-store',
  })
  return res.json()
}
