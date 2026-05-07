import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { esewaVerifyCallback, esewaStatusCheck, khaltiLookup } from '@/lib/payment'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const method = searchParams.get('method')

  // ── eSewa ────────────────────────────────────────────────────────────────────
  if (method === 'esewa') {
    const dataB64 = searchParams.get('data')
    if (!dataB64) {
      return Response.redirect(new URL('/checkout/failed?reason=missing_data', APP_URL))
    }

    // Step 1: Verify HMAC signature (prevents tampered callbacks)
    const { valid, decoded } = esewaVerifyCallback(dataB64)
    if (!valid) {
      console.error('[eSewa] Signature mismatch — possible tampering', decoded)
      return Response.redirect(new URL('/checkout/failed?reason=invalid_signature', APP_URL))
    }

    const { transaction_uuid, total_amount, status, transaction_code } = decoded

    // Step 2: Check callback status
    if (status !== 'COMPLETE') {
      return Response.redirect(new URL(`/checkout/failed?reason=${status}`, APP_URL))
    }

    // Step 3: Double-verify with eSewa's status API (don't trust callback alone)
    let statusCheck: { status: string; ref_id?: string } = { status: 'UNKNOWN' }
    try {
      statusCheck = await esewaStatusCheck(transaction_uuid, Number(total_amount))
    } catch (e) {
      console.warn('[eSewa] Status check failed, relying on callback signature only', e)
    }

    // Accept if callback is valid AND (status API confirms COMPLETE OR status API unreachable)
    const confirmed = statusCheck.status === 'COMPLETE' || statusCheck.status === 'UNKNOWN'
    if (!confirmed) {
      console.error('[eSewa] Status API returned non-COMPLETE:', statusCheck)
      return Response.redirect(new URL(`/checkout/failed?reason=${statusCheck.status}`, APP_URL))
    }

    // Step 4: Update order in DB
    try {
      await prisma.order.update({
        where: { id: transaction_uuid },
        data: {
          paymentStatus: 'PAID',
          transactionId: transaction_code ?? statusCheck.ref_id ?? transaction_uuid,
        },
      })
    } catch (e) {
      console.error('[eSewa] Failed to update order:', e)
    }

    return Response.redirect(new URL(`/account/orders?payment=success&method=esewa`, APP_URL))
  }

  // ── Khalti ───────────────────────────────────────────────────────────────────
  if (method === 'khalti') {
    const pidx             = searchParams.get('pidx')
    const callbackStatus   = searchParams.get('status')
    const purchaseOrderId  = searchParams.get('purchase_order_id')

    if (!pidx) {
      return Response.redirect(new URL('/checkout/failed?reason=missing_pidx', APP_URL))
    }

    // Step 1: Check redirect status — user may have cancelled
    if (callbackStatus === 'User canceled') {
      return Response.redirect(new URL('/checkout/failed?reason=user_canceled', APP_URL))
    }

    // Step 2: Call Khalti Lookup API — ONLY 'Completed' is success
    let lookup: { status: string; transaction_id?: string; total_amount?: number }
    try {
      lookup = await khaltiLookup(pidx)
    } catch (e) {
      console.error('[Khalti] Lookup failed:', e)
      return Response.redirect(new URL('/checkout/failed?reason=lookup_failed', APP_URL))
    }

    if (lookup.status !== 'Completed') {
      console.warn('[Khalti] Non-completed status:', lookup.status)
      return Response.redirect(new URL(`/checkout/failed?reason=${lookup.status}`, APP_URL))
    }

    // Step 3: Update order in DB
    try {
      if (purchaseOrderId) {
        await prisma.order.update({
          where: { id: purchaseOrderId },
          data: {
            paymentStatus: 'PAID',
            transactionId: lookup.transaction_id ?? pidx,
          },
        })
      }
    } catch (e) {
      console.error('[Khalti] Failed to update order:', e)
    }

    return Response.redirect(new URL(`/account/orders?payment=success&method=khalti`, APP_URL))
  }

  return Response.redirect(new URL('/checkout/failed?reason=unknown_method', APP_URL))
}
