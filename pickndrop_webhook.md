Pick & Drop Webhook Integration 📡
Official URL https://pickndrop.apidog.io/pick-drop-webhook-integration-1375447m0

1. Goto Integration > Webhook Integration
   Webhook Connect Process
   Screenshot 2025-08-18 at 13.11.46.png
2. Set Webhook Url and Webhook Secrect
   Screenshot 2026-01-01 at 18.30.02.png
   Note: Select any status or select All to get all status information
   Payload on Webhook
   {
   "comments": "Customer instruct to postpone",
   "epod": "https://pickndropnepal.com/files/794f9500-ca7f-496d-b114-da7d70c79d86_signature.png",
   "package_type": "Regular",
   "status": "package_reattempts_failed",
   "timestamp": "02-16-2026 14:19:53",
   "tracking_number": "PND-NP-000659692"
   }
   Package Workflow Statuses List
   Status Explanation
   package_pickup_assigned A rider has been assigned to pick up the package from the shipper.
   package_pickup_1st_attempt_failed The first attempt to pick up the package failed.
   package_pickup_reattempt_failed Multiple pickup attempts have failed.
   package_pickup_success The package has been successfully picked up from the shipper.
   waiting_for_drop_off The package is waiting to be dropped off at the last mile station.
   package_arrived_at_hub The package has arrived at the central hub.
   package_received_at_hub The package has been received and scanned at the hub.
   received_at_lastmile_station The package has reached the last mile station for delivery.
   package_ready_to_dispatch_last_mile_station The package is prepared to be dispatched from the last mile station.
   package_dispatched_to_last_mile_station_transporter The package has been dispatched to the last mile station via transporter.
   package_stationed_in_from_transporter The package has been stationed in after arrival from transporter.
   ready_for_dispatched_last_mile_hero The package is ready to be assigned to a delivery hero (rider).
   out_for_delivery The package is out with the rider for delivery to the customer.
   about_to_deliver The rider is close to the customer’s location and about to deliver.
   1st_attempt_failed The first delivery attempt failed.
   package_redelivery The package has been scheduled for re-delivery.
   package_reattempts_failed Multiple delivery attempts have failed.
   delivered The package has been successfully delivered to the customer.
   delivery_failed_and_cancelled Delivery failed, and the package has been canceled.
   return_at_transit_hub The returned package has reached the transit hub.
   package_returned_from_transit_hub_to_transporter The returned package has been dispatched from the transit hub to the transporter.
   received_from_transporter_to_dispatched_hub The returned package has been received at the hub from the transporter.
   fd_package_ready_to_return_to_shipper The package is ready to be returned to the shipper.
   package_returned The package has been returned to the shipper.
   package_returned_from_lastmile_sation_to_transporter The package has been returned from the last mile station to the transporter.
   cr_package_ready_to_delivered_to_qcc The returned/failed package is ready to be delivered to the Quality Check Center (QCC).
   Delivery Exception / Failure Reasons / Comments
   Customer already received same package
   Customer not order
   Customer cancel before Delivery
   Customer checked and canceled the order
   Customer instruct to postpone
   Customer has no cash available
   Package Damage
   Wrong Product
   Customer not reachable
   Customer mobile switch Off
   Phone Number does not exist
   Always call forwarded
   Customer number is hanging up after 2/3 ring
   Customer does not pick call
   Wrong Phone Number
   Customer Out of home
   Customer out of valley
   Delivery Person Change
   Customer Busy
   Wrong Location
   Customer change delivery location
   Customer out of service area
   Vehicle breakdown
   Delivery Person had an accident at the time of delivery, so postponed for tomorrow. Sorry for Inconvenience.
   Rider tried to deliver but couldn't be due to a busy schedule
   The package cannot be delivered due to weather conditions
   Fake order
   COD Issue
   Late Delivery Process
   Note: There may be additional comments as well.

   Create / Update Webhook API URL
   POST
   /api/v2/create_webhook
   Endpoint
   POST https://pickndropnepal.com/api/v2/create_webhook
   Request
   Body Params
   application/json
   Required
   request_url
   string
   required
   webhook_secret
   string
   required
   enabled
   boolean
   required
   Examples
   Responses
   🟢200
   Success
   application/json
   data
   object
   required
   status
   string
   required
   message
   string
   required
