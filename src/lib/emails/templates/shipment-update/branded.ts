import 'server-only'
import type { EmailVariant } from '../../registry'
import { renderShipmentUpdate, type ShipmentEmailData } from '../../shipment-update'

export const shipmentUpdateBranded: EmailVariant<ShipmentEmailData> = {
  id:          'branded',
  name:        'Branded',
  description: 'Status-aware messaging with emoji headline, accent color per status, tracking button.',
  accent:      '#0EA5E9',
  render:      renderShipmentUpdate,
}
