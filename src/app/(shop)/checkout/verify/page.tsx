import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { esewaVerifyCallback, esewaStatusCheck, khaltiLookup } from '@/lib/payment'
import { pushOrderEvent } from '@/lib/push'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function sp(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? '' : v ?? ''
}

export default async function CheckoutVerifyPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const method = sp(params.method)

  // ── eSewa ──────────────────────────────────────────────────────────────────
  if (method === 'esewa') {
    const dataB64 = sp(params.data)
    if (!dataB64) redirect('/checkout/failed?reason=missing_data')

    const { valid, decoded } = await esewaVerifyCallback(dataB64)
    if (!valid) redirect('/checkout/failed?reason=invalid_signature')

    const { transaction_uuid, total_amount, status, transaction_code } = decoded

    if (status !== 'COMPLETE') redirect(`/checkout/failed?reason=${status}`)

    // Double-check with eSewa status API
    let statusCheck: { status: string; ref_id?: string } = { status: 'UNKNOWN' }
    try { statusCheck = await esewaStatusCheck(transaction_uuid, Number(total_amount)) }
    catch { /* rely on HMAC alone */ }

    if (statusCheck.status !== 'COMPLETE' && statusCheck.status !== 'UNKNOWN') {
      redirect(`/checkout/failed?reason=${statusCheck.status}`)
    }

    try {
      const order = await prisma.order.update({
        where: { id: transaction_uuid },
        data: {
          paymentStatus: 'PAID',
          transactionId: transaction_code ?? statusCheck.ref_id ?? transaction_uuid,
        },
      })
      // Fire FCM push (fire-and-forget)
      pushOrderEvent({
        userId:  order.userId,
        orderId: order.id,
        title:   '💳 eSewa Payment Confirmed',
        body:    `Rs. ${Math.round(order.total).toLocaleString('en-IN')} received for order #${order.id.slice(0, 8).toUpperCase()}`,
      }).catch(() => {})
    } catch { /* already paid or order not found — don't block redirect */ }

    redirect(`/account/orders?payment=success&method=esewa&id=${transaction_uuid}`)
  }

  // ── Khalti ─────────────────────────────────────────────────────────────────
  if (method === 'khalti') {
    const pidx            = sp(params.pidx)
    const callbackStatus  = sp(params.status)
    const purchaseOrderId = sp(params.purchase_order_id)

    if (!pidx) redirect('/checkout/failed?reason=missing_pidx')
    if (callbackStatus === 'User canceled') redirect('/checkout/failed?reason=user_canceled')

    let lookup: { status: string; transaction_id?: string }
    try { lookup = await khaltiLookup(pidx) }
    catch { redirect('/checkout/failed?reason=lookup_failed') }

    if (lookup!.status !== 'Completed') redirect(`/checkout/failed?reason=${lookup!.status}`)

    try {
      if (purchaseOrderId) {
        const order = await prisma.order.update({
          where: { id: purchaseOrderId },
          data: { paymentStatus: 'PAID', transactionId: lookup!.transaction_id ?? pidx },
        })
        pushOrderEvent({
          userId:  order.userId,
          orderId: order.id,
          title:   '💳 Khalti Payment Confirmed',
          body:    `Rs. ${Math.round(order.total).toLocaleString('en-IN')} received for order #${order.id.slice(0, 8).toUpperCase()}`,
        }).catch(() => {})
      }
    } catch { /* non-fatal */ }

    redirect(`/account/orders?payment=success&method=khalti&id=${purchaseOrderId}`)
  }

  redirect('/checkout/failed?reason=unknown_method')
}
