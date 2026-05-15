import 'server-only'
import type { EmailVariant } from '../../registry'
import { renderOrderConfirmation, type OrderConfirmationData } from '../../order-confirmation'

export const orderConfirmedBranded: EmailVariant<OrderConfirmationData> = {
  id:          'branded',
  name:        'Branded',
  description: 'Full Balapasa identity. Gradient header, color accents, account-claim block with 10% off CTA.',
  accent:      '#16A34A',
  render:      renderOrderConfirmation,
}
