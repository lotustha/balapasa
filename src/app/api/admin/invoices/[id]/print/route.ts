import { requireRole } from '@/lib/auth'
import { renderStandaloneInvoice } from '@/lib/print/order-documents'

// GET /api/admin/invoices/[id]/print
// Returns the print-ready A4 invoice HTML (auto-opens the browser print dialog →
// save as PDF). Works for subscription-cycle and one-off invoices alike.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireRole('MANAGER')
  if ('error' in guard) return guard.error

  const { id } = await ctx.params
  const html = await renderStandaloneInvoice(id)
  if (!html) return new Response('Invoice not found', { status: 404 })

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
