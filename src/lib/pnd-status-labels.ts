// Friendly labels for the raw PnD status strings — displayed on the
// /track-order timeline. Kept colocated with the data so a new PnD status
// only needs one edit.

export const PND_STATUS_LABELS: Record<string, { label: string; icon: string }> = {
  package_pickup_assigned:                          { label: 'Pickup assigned to a rider', icon: '📋' },
  package_pickup_1st_attempt_failed:                { label: 'First pickup attempt missed', icon: '⚠️' },
  package_pickup_reattempt_failed:                  { label: 'Pickup retries failed',     icon: '⚠️' },
  package_pickup_success:                           { label: 'Picked up from store',      icon: '✅' },
  waiting_for_drop_off:                             { label: 'Heading to drop-off',       icon: '🚚' },
  package_arrived_at_hub:                           { label: 'Arrived at hub',            icon: '🏬' },
  package_received_at_hub:                          { label: 'Received at hub',           icon: '📦' },
  received_at_lastmile_station:                     { label: 'Reached your area',         icon: '📍' },
  package_ready_to_dispatch_last_mile_station:      { label: 'Ready for last-mile dispatch', icon: '📤' },
  package_dispatched_to_last_mile_station_transporter: { label: 'Dispatched to last-mile transporter', icon: '🚛' },
  package_stationed_in_from_transporter:            { label: 'Arrived at last-mile station', icon: '🏪' },
  ready_for_dispatched_last_mile_hero:              { label: 'Ready to assign rider',     icon: '🛵' },
  out_for_delivery:                                 { label: 'Out for delivery',          icon: '🛵' },
  about_to_deliver:                                 { label: 'Rider is nearby',           icon: '🔔' },
  '1st_attempt_failed':                             { label: 'First delivery attempt missed', icon: '⚠️' },
  package_redelivery:                               { label: 'Redelivery scheduled',      icon: '🔁' },
  package_reattempts_failed:                        { label: 'Delivery attempts failed',  icon: '❌' },
  delivered:                                        { label: 'Delivered',                 icon: '🎉' },
  delivery_failed_and_cancelled:                    { label: 'Delivery cancelled',        icon: '❌' },
  return_at_transit_hub:                            { label: 'Returning to us',           icon: '↩️' },
  package_returned_from_transit_hub_to_transporter: { label: 'Returning to transporter',  icon: '↩️' },
  received_from_transporter_to_dispatched_hub:      { label: 'Returning via hub',         icon: '↩️' },
  fd_package_ready_to_return_to_shipper:            { label: 'Ready to return to shipper', icon: '↩️' },
  package_returned:                                 { label: 'Package returned',          icon: '↩️' },
  package_returned_from_lastmile_sation_to_transporter: { label: 'Returned via transporter', icon: '↩️' },
  cr_package_ready_to_delivered_to_qcc:             { label: 'Returning via quality-check', icon: '↩️' },
}

// Internal sources (admin clicks, system inserts) get the raw event name
// rendered with Title Case.
export function friendlyStatusLabel(rawStatus: string): { label: string; icon: string } {
  const pnd = PND_STATUS_LABELS[rawStatus]
  if (pnd) return pnd
  const pretty = rawStatus
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
  return { label: pretty, icon: '•' }
}
