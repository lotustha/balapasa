import { NextRequest } from 'next/server'
import { renderPrintDocument } from '@/lib/print/order-documents'

export async function POST(req: NextRequest) {
  try {
    const { ids, type = 'shipping' } = await req.json() as { ids: string[]; type?: string }
    if (!ids?.length) return Response.json({ error: 'ids required' }, { status: 400 })

    const html = await renderPrintDocument(ids, type)
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
