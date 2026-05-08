import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { esewaFormData, ESEWA_PAYMENT_URL } from '@/lib/payment'

// Returns an auto-submitting HTML form for eSewa — used by the Flutter WebView
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId')
  if (!orderId) return new Response('Missing orderId', { status: 400 })

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, subtotal: true, deliveryCharge: true, paymentStatus: true },
    })
    if (!order) return new Response('Order not found', { status: 404 })
    if (order.paymentStatus === 'PAID') return new Response('Already paid', { status: 400 })

    const fields = esewaFormData(order.id, order.subtotal, order.deliveryCharge)
    const inputs = Object.entries(fields)
      .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`)
      .join('\n')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Redirecting to eSewa…</title>
  <style>
    body { display:flex; align-items:center; justify-content:center; min-height:100vh;
           font-family:system-ui,sans-serif; background:#f0fdf4; margin:0; }
    .card { background:#fff; border-radius:16px; padding:32px; text-align:center;
            box-shadow:0 4px 24px rgba(0,0,0,.08); max-width:340px; width:100%; }
    .logo { font-size:24px; font-weight:800; color:#16A34A; margin-bottom:8px; }
    p { color:#64748b; font-size:14px; margin:0 0 24px; }
    .spinner { width:32px; height:32px; border:3px solid #dcfce7; border-top-color:#16A34A;
               border-radius:50%; animation:spin .7s linear infinite; margin:0 auto; }
    @keyframes spin { to { transform:rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Balapasa</div>
    <p>Redirecting to eSewa payment…</p>
    <div class="spinner"></div>
    <form id="f" method="POST" action="${ESEWA_PAYMENT_URL}" style="display:none">
      ${inputs}
    </form>
  </div>
  <script>document.getElementById('f').submit();</script>
</body>
</html>`

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    console.error('[mobile/esewa-redirect]', e)
    return new Response('Server error', { status: 500 })
  }
}
