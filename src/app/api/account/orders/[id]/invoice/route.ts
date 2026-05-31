import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderPrintDocument } from '@/lib/print/order-documents'

// Customer-facing invoice. Unlike the admin print endpoint (which takes
// arbitrary ids), this is scoped to the signed-in user's own order: we verify
// ownership before rendering, then return the print-ready A4 invoice HTML
// (auto-opens the browser print dialog → save as PDF).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await getCurrentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, userId: true },
  })
  if (!order || order.userId !== user.sub) return new Response('Not found', { status: 404 })

  const html = await renderPrintDocument([id], 'invoice-a4')
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
