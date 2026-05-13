import 'server-only'
import { prisma } from '@/lib/prisma'

export interface GiftCardValidationOk {
  valid:    true
  id:       string
  code:     string
  balance:  number   // current remaining balance on the card
  initialValue: number
  expiresAt: Date | null
}

export interface GiftCardValidationFail {
  valid:    false
  status:   number  // HTTP status the API route should return
  error:    string
}

export type GiftCardValidation = GiftCardValidationOk | GiftCardValidationFail

export async function validateGiftCard(rawCode: string): Promise<GiftCardValidation> {
  const code = rawCode.trim().toUpperCase()
  if (!code) return { valid: false, status: 400, error: 'Enter a gift card code' }

  const card = await prisma.giftCard.findUnique({ where: { code } })
  if (!card) return { valid: false, status: 404, error: 'Gift card not found' }
  if (!card.isActive) return { valid: false, status: 410, error: 'This gift card is no longer active' }
  if (card.expiresAt && card.expiresAt < new Date()) {
    return { valid: false, status: 410, error: 'This gift card has expired' }
  }
  if (card.balance <= 0) {
    return { valid: false, status: 410, error: 'This gift card has no balance remaining' }
  }

  return {
    valid:        true,
    id:           card.id,
    code:         card.code,
    balance:      card.balance,
    initialValue: card.initialValue,
    expiresAt:    card.expiresAt,
  }
}

/**
 * Generate a friendly gift-card code. Pattern: GC-XXXX-XXXX (14 chars, easy to read on a card).
 * Uses only unambiguous chars (no 0/O, no 1/I/L).
 */
export function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  function block() {
    let s = ''
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)]
    return s
  }
  return `GC-${block()}-${block()}`
}
