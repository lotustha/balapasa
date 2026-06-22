import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderStandaloneInvoice } from '@/lib/print/order-documents'

// Customer-facing invoice document. Scoped to the signed-in user's own invoice:
// we verify ownership before rendering, then return the print-ready A4 invoice
// HTML (auto-opens the browser print dialog → save as PDF).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const user = await getCurrentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const invoice = await prisma.invoice.findUnique({
    where:  { id },
    select: { userId: true },
  })
  if (!invoice || invoice.userId !== user.sub) return new Response('Not found', { status: 404 })

  const html = await renderStandaloneInvoice(id)
  if (!html) return new Response('Invoice not found', { status: 404 })

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
