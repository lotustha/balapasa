import { NextRequest } from 'next/server'
import { validateGiftCard } from '@/lib/gift-cards'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json() as { code?: string }
    if (!code || typeof code !== 'string') {
      return Response.json({ error: 'Code is required' }, { status: 400 })
    }
    const result = await validateGiftCard(code)
    if (!result.valid) {
      return Response.json({ error: result.error }, { status: result.status })
    }
    return Response.json({
      code:         result.code,
      balance:      result.balance,
      initialValue: result.initialValue,
      expiresAt:    result.expiresAt,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Validation failed'
    return Response.json({ error: msg }, { status: 500 })
  }
}
