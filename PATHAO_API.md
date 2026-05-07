Pathao Enterprise Instant Delivery API Documentation
Summary
Pathao API uses OAuth 2.0. There are 2 requests being sent here. 1st request is for getting the access token. This access token should be saved in the database (or any persistent store) for future use. 2nd request is for creating a new order. This uses the access token previously saved.
For understanding these APIs, we are providing Test Environment Credentials here. And later you can easily integrate for Production/Live Environment by using your Live Credentials
Generate API Credentials
Client ID
dev_5e5612b011f438ca5b30a2d6
Client Secret
F62z4qB1IazJzzgMYhKyBpdRWWRoAiikbQdR-SDrYdI
Test Environment Credentials
Field Name	Value
base_url	https://enterprise-api.pathao.com
client_id	dev_5e5612b011f438ca5b30a2d6
client_secret	F62z4qB1IazJzzgMYhKyBpdRWWRoAiikbQdR-SDrYdI
Authorization Token
Endpoint: /api/v1/auth/generate-access-token
Generate a new API access token using the client credentials. This token is required for all subsequent API requests.
curl \
  --location '{{base_url}}/api/v1/auth/generate-access-token' \
  --header 'Content-Type: application/json' \
  --data '{
  "client_id": "{{client_id}}",
  "client_secret": "{{client_secret}}"
}'
Success Response: Status Code 200
{
   data: {
      access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkwiYnVzaW5lc3NfaWQiOjgsImJ19nZW5liOnRydWUsImNsaWVudF . . .",
      expires_at: "2026-05-05T17:03:31.740738+06:00"
   }
}
Response Data
Field Name	Field Type	Description
data	object	Assumed from sample response for data
data.access_token	string	Assumed from sample response for data.access_token
data.expires_at	string	Assumed from sample response for data.expires_at
Parcel Estimation
Endpoint: /api/v1/ondemand/parcels/estimation
Get estimated delivery charge and service options for a parcel based on pickup and receiver locations.
curl \
  --location '{{base_url}}/api/v1/ondemand/parcels/estimation?lang=en' \
  --header 'Authorization: Bearer {{access_token}}' \
  --header 'Content-Type: application/json' \
  --data '{
  "city_id": 1,
  "country_id": 1,
  "is_cod_active": false,
  "will_pay": "receiver",
  "total_value": 1000,
  "is_creator_receiver": false,
  "external_store_id": "MROQI3O9",
  "pickup": {
    "address": "Concord Silvy Height, 73/A, Gulshan 1",
    "address_notes": "",
    "name": "Hasin Junayed ",
    "phone_number": "01772793058",
    "latitude": 23.784519208568934,
    "longitude": 90.4169082847168,
    "source": "USER_LOCATION",
    "total_item_value": 1000
  },
  "receiver": [
    {
      "address": "Dhaka College, Dhaka",
      "address_notes": "",
      "delivery_notes": "",
      "house": "12",
      "item_price": 1000,
      "total_item_value": 1000,
      "latitude": 23.73547839871336,
      "longitude": 90.38390121513216,
      "name": "shawon",
      "parcel_type": 104,
      "phone_number": "01991796098",
      "road": "",
      "source": "USER_LOCATION"
    }
  ]
}'
Request Parameters
Field Name	Field Type	Required	Description
city_id	integer	Yes	ID of the city for delivery
country_id	integer	Yes	ID of the country
is_cod_active	boolean	Yes	Whether Cash on Delivery is active
will_pay	string	Yes	Who will pay - 'receiver' or 'sender'
total_value	number	Yes	Total value of the parcel
is_creator_receiver	boolean	Yes	Is the creator also the receiver
external_store_id	string	No	External store identifier
pickup.address	string	Yes	Pickup street address
pickup.address_notes	string	No	Additional notes for pickup address
pickup.name	string	Yes	Pickup person name
pickup.phone_number	string	Yes	Pickup person phone number
pickup.latitude	number	Yes	Pickup location latitude
pickup.longitude	number	Yes	Pickup location longitude
pickup.source	string	No	Source of pickup location (e.g., 'USER_LOCATION')
pickup.total_item_value	number	Yes	Total value of items at pickup
receiver[].address	string	Yes	Receiver street address
receiver[].address_notes	string	No	Additional notes for receiver address
receiver[].delivery_notes	string	No	Special delivery instructions
receiver[].house	string	No	House number or building name
receiver[].item_price	number	No	Price of individual items
receiver[].total_item_value	number	Yes	Total value of items for receiver
receiver[].latitude	number	Yes	Receiver location latitude
receiver[].longitude	number	Yes	Receiver location longitude
receiver[].name	string	Yes	Receiver person name
receiver[].parcel_type	integer	Yes	Type/category ID of the parcel
receiver[].phone_number	string	Yes	Receiver person phone number
receiver[].road	string	No	Road name or street name
receiver[].source	string	No	Source of receiver location
Success Response: Status Code 200
{
   status: true,
   data: {
      sid: "a051a627-4d5e-4e9e-bc41-9d6d7075a47e",
      is_cod_active: false,
      server_time: 1777799089,
      estimation_ttl: 300,
      total_value: 1000,
      service_options: [
         {
            id: 1,
            name: "Instant Delivery",
            distance: 9957,
            polyline: "gldpC{pzfPy@?s@@?[zCApA@xIj@hAFxAHADj@?",
            charge: 4200,
            discount: 0,
            charge_after_discount: 4200,
            dropoff_eta: 6000,
            pickup_eta: 3000,
            dropoff_deadline: 0
         }
      ]
   }
}
Response Data
Field Name	Field Type	Description
status	boolean	Assumed from sample response for status
data	object	Assumed from sample response for data
data.sid	string	Assumed from sample response for data.sid
data.is_cod_active	boolean	Assumed from sample response for data.is_cod_active
data.server_time	integer	Assumed from sample response for data.server_time
data.estimation_ttl	integer	Assumed from sample response for data.estimation_ttl
data.total_value	integer	Assumed from sample response for data.total_value
data.service_options	array	Assumed from sample response for data.service_options
data.service_options[]	object	Assumed from sample response for data.service_options[]
data.service_options[].id	integer	Assumed from sample response for data.service_options[].id
data.service_options[].name	string	Assumed from sample response for data.service_options[].name
data.service_options[].distance	integer	Assumed from sample response for data.service_options[].distance
data.service_options[].polyline	string	Assumed from sample response for data.service_options[].polyline
data.service_options[].charge	integer	Assumed from sample response for data.service_options[].charge
data.service_options[].discount	integer	Assumed from sample response for data.service_options[].discount
data.service_options[].charge_after_discount	integer	Assumed from sample response for data.service_options[].charge_after_discount
data.service_options[].dropoff_eta	integer	Assumed from sample response for data.service_options[].dropoff_eta
data.service_options[].pickup_eta	integer	Assumed from sample response for data.service_options[].pickup_eta
data.service_options[].dropoff_deadline	integer	Assumed from sample response for data.service_options[].dropoff_deadline
Parcel Categories
Endpoint: /api/v1/ondemand/parcels/categories
Get list of available parcel categories/types that can be used when creating a parcel.
curl \
  --location '{{base_url}}/api/v1/ondemand/parcels/categories?lang=bn' \
  --header 'Authorization: Bearer {{access_token}}'
Success Response: Status Code 200
{
   categories: [
      {
         id: 103,
         name: "ডকুমেন্ট",
         description: "কোন পাসপোর্ট বা ব্যাংক চেক পাঠানো যাবেনা",
         icon: "/service/icons/parcel/ic_Documents.png",
         limit: 0
      },
      {
         id: 102,
         name: "জামাকাপড়",
         description: "সুন্দরভাবে ভাঁজ করুন এবং সুরক্ষিতভাবে প্যাক করুন",
         icon: "/service/icons/parcel/ic_Cloths.png",
         limit: 2500
      },
      {
         id: 104,
         name: "উপহার",
         description: "ফুল, কার্ড, চকলেট এবং অন্যান্য",
         icon: "/service/icons/parcel/ic_Gifts.png",
         limit: 2500
      },
      {
         id: 105,
         name: "কসমেটিকস",
         description: "মেকআপ, স্কিন কেয়ার, বা হাইজিন প্রোডাক্টস। লিকেজ এড়াতে তরল পদার্থ শক্তভাবে সিল এবং প্যাক করে পাঠাবেন",
         icon: "/service/icons/parcel/ic_Cosmetics.png",
         limit: 2500
      },
      {
         id: 106,
         name: "ওষুধ",
         description: "প্রেসক্রিপশন বা ওভার-দ্য-কাউন্টার ওষুধ, স্পষ্ট লেভেলসহ নিরাপদে সিল করা। কোন অবৈধ বা নিষিদ্ধ ড্রাগ পাঠানো যাবেনা",
         icon: "/service/icons/parcel/ic_Medicine.png",
         limit: 2500
      },
      {
         id: 107,
         name: "আনুষঙ্গিক জিনিসপত্র",
         description: "ঘড়ি, গহনা, ব্যাগ, জুতা ইত্যাদি, ভঙ্গুর মালপত্র হলে ডেলিভারি ম্যানকে জানান",
         icon: "/service/icons/parcel/ic_Accessories.png",
         limit: 2500
      },
      {
         id: 108,
         name: "পচনশীল পন্য",
         description: "ফল, সবজি, মাছ, ফ্রোজেন ফুড ইত্যাদি",
         icon: "/service/icons/parcel/ic_Perishable Goods.png",
         limit: 2500
      },
      {
         id: 109,
         name: "ইলেকট্রনিক",
         description: "বাবল মোড়ক দিয়ে মোড়ানো, ভঙ্গুর মালপত্র হলে ডেলিভারি ম্যানকে জানান",
         icon: "/service/icons/parcel/ic_Electronics.png",
         limit: 2500
      },
      {
         id: 110,
         name: "অন্যান্য আইটেম",
         description: "শিল্প সামগ্রী, খেলনা, স্টেশনারি, ছোট সরঞ্জাম, বা গৃহস্থালীর জিনিসপত্র। কোন অবৈধ বা নিষিদ্ধ ড্রাগ পাঠানো যাবেনা",
         icon: "/service/icons/parcel/ic_Other Items.png",
         limit: 2500
      },
      {
         id: 101,
         name: "হোম মেড ফুড",
         description: "ঘরে রান্না করা খাবার আইটেম",
         icon: "/service/icons/parcel/ic_Homemade Food.png",
         limit: 2500
      }
   ]
}
Response Data
Field Name	Field Type	Description
categories	array	Assumed from sample response for categories
categories[]	object	Assumed from sample response for categories[]
categories[].id	integer	Assumed from sample response for categories[].id
categories[].name	string	Assumed from sample response for categories[].name
categories[].description	string	Assumed from sample response for categories[].description
categories[].icon	string	Assumed from sample response for categories[].icon
categories[].limit	integer	Assumed from sample response for categories[].limit
Parcel Create
Endpoint: /api/v1/ondemand/parcels
Create a new on-demand delivery order with the provided details.
curl \
  --location '{{base_url}}/api/v1/ondemand/parcels?lang=en|bn|ne' \
  --header 'Authorization: Bearer {{access_token}}' \
  --header 'Content-Type: application/json' \
  --data '{
  "sid": "b1e117fe-a3f5-417a-8c69-f26203d3b744",
  "service_option_id": 1,
  "external_ref_id": "external-ref-dummy",
  "is_payment_on_delivery": false,
  "will_pay": "sender",
  "total_value": 100,
  "is_creator_receiver": false,
  "external_store_id": "LO7OSNBG",
  "pickup": {
    "address": "Nikunja Convention Hall, Nikunja 2",
    "address_notes": "my home",
    "pickup_notes": "",
    "latitude": 23.8355622220921,
    "longitude": 90.4184727900181,
    "house": "133",
    "road": "10",
    "name": "Hasin Junayed",
    "phone_number": "01772793058",
    "parcel_type": 104,
    "total_item_value": 100,
    "items": []
  },
  "receiver": [
    {
      "address": "Hawa Rooftop Restaurant, Eastern Pallabi, Mirpur 11.5",
      "address_notes": "delivered house",
      "delivery_notes": "in front of my room",
      "latitude": 23.8282164436205,
      "longitude": 90.3637719593914,
      "house": "143",
      "road": "13",
      "phone_number": "01991796279",
      "name": "shawon",
      "parcel_type": 104,
      "item_price": 0,
      "total_item_value": 100,
      "items": []
    }
  ]
}'
Request Parameters
Field Name	Field Type	Required	Description
sid	string	No	Service ID from estimation response
service_option_id	integer	Yes	Selected service option ID
external_ref_id	string	No	External reference ID
is_payment_on_delivery	boolean	No	Whether payment is on delivery
will_pay	string	Yes	Who will pay - 'receiver' or 'sender'
total_value	number	Yes	Total value of the parcel
is_creator_receiver	boolean	Yes	Is the creator also the receiver
external_store_id	string	No	External store identifier
pickup.address	string	Yes	Pickup street address
pickup.address_notes	string	No	Additional notes for pickup
pickup.pickup_notes	string	No	Special pickup notes
pickup.latitude	number	Yes	Pickup location latitude
pickup.longitude	number	Yes	Pickup location longitude
pickup.house	string	No	Pickup house number
pickup.road	string	No	Pickup road/street name
pickup.name	string	Yes	Pickup person name
pickup.phone_number	string	Yes	Pickup person phone
pickup.parcel_type	integer	No	Parcel type ID at pickup
pickup.total_item_value	number	Yes	Total value of items
pickup.items	array	No	Array of items being picked up
receiver[].address	string	Yes	Receiver street address
receiver[].address_notes	string	No	Notes for receiver address
receiver[].delivery_notes	string	No	Special delivery instructions
receiver[].latitude	number	Yes	Receiver latitude
receiver[].longitude	number	Yes	Receiver longitude
receiver[].house	string	No	Receiver house number
receiver[].road	string	No	Receiver road/street name
receiver[].phone_number	string	Yes	Receiver phone number
receiver[].name	string	Yes	Receiver person name
receiver[].parcel_type	integer	Yes	Parcel type ID
receiver[].item_price	number	No	Item price at receiver
receiver[].total_item_value	number	Yes	Total item value
receiver[].items	array	No	Array of items for receiver
Success Response: Status Code 201
{
   data: {
      hashed_id: "z1ci99jixrem",
      order_id: "4LHV8CX",
      charge: 6000,
      payable_charge: 6000,
      distance: 11802,
      created_at: 1777802190,
      server_time: 1777802190,
      total_value: 0,
      pickup: {
         pickup_eta: 0,
         pickup_ready: 0,
         pickup_deadline: 0
      },
      receiver: [
         {
            dropoff_eta: 0,
            dropoff_ready: 0,
            dropoff_deadline: 0
         }
      ],
      tracking_url: "https://pages.p-stageenv.xyz/receiver-tracking/SbV39AvrvbepUMOMILfM0A=="
   }
}
Response Data
Field Name	Field Type	Description
data	object	Assumed from sample response for data
data.hashed_id	string	Assumed from sample response for data.hashed_id
data.order_id	string	Assumed from sample response for data.order_id
data.charge	integer	Assumed from sample response for data.charge
data.payable_charge	integer	Assumed from sample response for data.payable_charge
data.distance	integer	Assumed from sample response for data.distance
data.created_at	integer	Assumed from sample response for data.created_at
data.server_time	integer	Assumed from sample response for data.server_time
data.total_value	integer	Assumed from sample response for data.total_value
data.pickup	object	Assumed from sample response for data.pickup
data.pickup.pickup_eta	integer	Assumed from sample response for data.pickup.pickup_eta
data.pickup.pickup_ready	integer	Assumed from sample response for data.pickup.pickup_ready
data.pickup.pickup_deadline	integer	Assumed from sample response for data.pickup.pickup_deadline
data.receiver	array	Assumed from sample response for data.receiver
data.receiver[]	object	Assumed from sample response for data.receiver[]
data.receiver[].dropoff_eta	integer	Assumed from sample response for data.receiver[].dropoff_eta
data.receiver[].dropoff_ready	integer	Assumed from sample response for data.receiver[].dropoff_ready
data.receiver[].dropoff_deadline	integer	Assumed from sample response for data.receiver[].dropoff_deadline
data.tracking_url	string	Assumed from sample response for data.tracking_url
Parcel Cancellation
Endpoint: /api/v1/ondemand/parcels/:hash_id/cancel
Cancel an existing parcel delivery order with optional cancellation reason.
curl \
  --location '{{base_url}}/api/v1/ondemand/parcels/{{hash_id}}' \
  --header 'Authorization: Bearer {{access_token}}' \
  --header 'Content-Type: application/json' \
  --data '{
  "status": "CANCELLED",
  "cancellation_reason": {
    "slug": "customer-cancelled-order",
    "additional_text": ""
  }
}'
Request Parameters
Field Name	Field Type	Required	Description
id	string	Yes	Unique identifier of the parcel to cancel (path parameter)
reason_slug	string	No	Cancellation reason slug
additional_text	string	No	Additional text for cancellation reason
Success Response: Status Code 200
{
   parcel: {
      parcel_status: "CANCELLED"
   }
}
Response Data
Field Name	Field Type	Description
parcel	object	Assumed from sample response for parcel
parcel.parcel_status	string	Assumed from sample response for parcel.parcel_status
Parcel Details
Endpoint: /api/v1/ondemand/parcels/:hashed_id
Retrieve detailed information about a specific parcel including its current status, tracking information, and delivery details.
curl \
  --location '{{base_url}}/api/v1/ondemand/parcels/{{hashed_id}}?user_type=user&localization=en' \
  --header 'Authorization: Bearer {{access_token}}'
Request Parameters
Field Name	Field Type	Required	Description
hashed_id	string	Yes	Unique identifier of the parcel (path parameter)
Success Response: Status Code 200
{
   parcel: {
      hashed_id: "z1ci99jixxix",
      order_id: "4LHV7SW",
      parcel_status: "CANCELLED",
      charge: 6000,
      distance: 3205,
      duration: 824,
      is_paid: 0,
      created_at: 1777468379,
      accepted_at: null,
      picked_at: null,
      started_at: null,
      completed_at: null,
      pickup: {
         address: "Corner View, Sornali Road, South Kafrul",
         address_notes: "",
         delivery_notes: "",
         house: "iqwsyui",
         latitude: 23.785775858076526,
         longitude: 90.3872108665039,
         name: "Md. Mahedi Hasan",
         parcel_type: 105,
         phone_number: "01303609014",
         items: [],
         total_value: 0,
         pickup_ready_dt: null,
         pickup_deadline_dt: null
      },
      receiver: [
         {
            address: "Dhamalkot Bazar, Bhashantek",
            address_notes: "",
            delivery_notes: "",
            house: "wedwed",
            item_price: 0,
            latitude: 23.803710439213578,
            longitude: 90.39148422709398,
            name: "shawon",
            parcel_type: 105,
            phone_number: "01772793058",
            road: "",
            items: [],
            total_item_value: 0,
            dropoff_ready_dt: null,
            dropoff_deadline_dt: null
         }
      ],
      rider: null,
      support_number: "09678100800"
   }
}
Response Data
Field Name	Field Type	Description
parcel	object	Assumed from sample response for parcel
parcel.hashed_id	string	Assumed from sample response for parcel.hashed_id
parcel.order_id	string	Assumed from sample response for parcel.order_id
parcel.parcel_status	string	Assumed from sample response for parcel.parcel_status
parcel.charge	integer	Assumed from sample response for parcel.charge
parcel.distance	integer	Assumed from sample response for parcel.distance
parcel.duration	integer	Assumed from sample response for parcel.duration
parcel.is_paid	integer	Assumed from sample response for parcel.is_paid
parcel.created_at	integer	Assumed from sample response for parcel.created_at
parcel.accepted_at	null	Assumed from sample response for parcel.accepted_at
parcel.picked_at	null	Assumed from sample response for parcel.picked_at
parcel.started_at	null	Assumed from sample response for parcel.started_at
parcel.completed_at	null	Assumed from sample response for parcel.completed_at
parcel.pickup	object	Assumed from sample response for parcel.pickup
parcel.pickup.address	string	Assumed from sample response for parcel.pickup.address
parcel.pickup.address_notes	string	Assumed from sample response for parcel.pickup.address_notes
parcel.pickup.delivery_notes	string	Assumed from sample response for parcel.pickup.delivery_notes
parcel.pickup.house	string	Assumed from sample response for parcel.pickup.house
parcel.pickup.latitude	number	Assumed from sample response for parcel.pickup.latitude
parcel.pickup.longitude	number	Assumed from sample response for parcel.pickup.longitude
parcel.pickup.name	string	Assumed from sample response for parcel.pickup.name
parcel.pickup.parcel_type	integer	Assumed from sample response for parcel.pickup.parcel_type
parcel.pickup.phone_number	string	Assumed from sample response for parcel.pickup.phone_number
parcel.pickup.items	array	Assumed from sample response for parcel.pickup.items
parcel.pickup.total_value	integer	Assumed from sample response for parcel.pickup.total_value
parcel.pickup.pickup_ready_dt	null	Assumed from sample response for parcel.pickup.pickup_ready_dt
parcel.pickup.pickup_deadline_dt	null	Assumed from sample response for parcel.pickup.pickup_deadline_dt
parcel.receiver	array	Assumed from sample response for parcel.receiver
parcel.receiver[]	object	Assumed from sample response for parcel.receiver[]
parcel.receiver[].address	string	Assumed from sample response for parcel.receiver[].address
parcel.receiver[].address_notes	string	Assumed from sample response for parcel.receiver[].address_notes
parcel.receiver[].delivery_notes	string	Assumed from sample response for parcel.receiver[].delivery_notes
parcel.receiver[].house	string	Assumed from sample response for parcel.receiver[].house
parcel.receiver[].item_price	integer	Assumed from sample response for parcel.receiver[].item_price
parcel.receiver[].latitude	number	Assumed from sample response for parcel.receiver[].latitude
parcel.receiver[].longitude	number	Assumed from sample response for parcel.receiver[].longitude
parcel.receiver[].name	string	Assumed from sample response for parcel.receiver[].name
parcel.receiver[].parcel_type	integer	Assumed from sample response for parcel.receiver[].parcel_type
parcel.receiver[].phone_number	string	Assumed from sample response for parcel.receiver[].phone_number
parcel.receiver[].road	string	Assumed from sample response for parcel.receiver[].road
parcel.receiver[].items	array	Assumed from sample response for parcel.receiver[].items
parcel.receiver[].total_item_value	integer	Assumed from sample response for parcel.receiver[].total_item_value
parcel.receiver[].dropoff_ready_dt	null	Assumed from sample response for parcel.receiver[].dropoff_ready_dt
parcel.receiver[].dropoff_deadline_dt	null	Assumed from sample response for parcel.receiver[].dropoff_deadline_dt
parcel.rider	null	Assumed from sample response for parcel.rider
parcel.support_number	string	Assumed from sample response for parcel.support_number
Active Parcels List
Endpoint: /api/v1/ondemand/parcels/active
Retrieve list of active parcels with current status and basic information.
curl \
  --location '{{base_url}}/api/v1/ondemand/parcels/active?user_type=user' \
  --header 'Authorization: Bearer {{access_token}}'
Request Parameters
Field Name	Field Type	Required	Description
user_type	string	Yes	Type of user - 'user'
page	integer	No	Page number for pagination
limit	integer	No	Number of records per page
Success Response: Status Code 200
{
   parcel: [
      {
         hashed_id: "z1ci99jixrem",
         order_id: "4LHV8CX",
         parcel_status: "ASSIGNED",
         charge: 6000,
         distance: 11802,
         duration: 1564,
         is_paid: 0,
         will_pay: "sender",
         created_at: 1777802191,
         accepted_at: null,
         picked_at: null,
         started_at: null,
         completed_at: null,
         pickup: {
            address: "Nikunja Convention Hall, Nikunja 2",
            address_notes: "my home",
            delivery_notes: "",
            house: "133",
            latitude: 23.8355622220921,
            longitude: 90.4184727900181,
            name: "Md. Mahedi Hasan",
            parcel_type: 104,
            phone_number: "01303609014",
            items: [],
            total_value: 0,
            pickup_ready_dt: null,
            pickup_deadline_dt: null
         },
         receiver: [
            {
               address: "Hawa Rooftop Restaurant, Eastern Pallabi, Mirpur 11.5",
               address_notes: "delivered house",
               delivery_notes: "in front of my room",
               house: "143",
               item_price: 100,
               latitude: 23.8282164436205,
               longitude: 90.3637719593914,
               name: "shawon",
               parcel_type: 104,
               phone_number: "01991796279",
               road: "13",
               items: [],
               total_item_value: 0,
               dropoff_ready_dt: null,
               dropoff_deadline_dt: null
            }
         ],
         rider: {
            name: "Asibul Hasan",
            number: "01767191651",
            profile_picture: "/uploads/img/profile/7PqrFI1722490453.png",
            type: "bike",
            registration_number: "DHK METRO HA 55-5956"
         },
         support_number: "09678100800"
      }
   ]
}
Response Data
Field Name	Field Type	Description
parcel	array	Assumed from sample response for parcel
parcel[]	object	Assumed from sample response for parcel[]
parcel[].hashed_id	string	Assumed from sample response for parcel[].hashed_id
parcel[].order_id	string	Assumed from sample response for parcel[].order_id
parcel[].parcel_status	string	Assumed from sample response for parcel[].parcel_status
parcel[].charge	integer	Assumed from sample response for parcel[].charge
parcel[].distance	integer	Assumed from sample response for parcel[].distance
parcel[].duration	integer	Assumed from sample response for parcel[].duration
parcel[].is_paid	integer	Assumed from sample response for parcel[].is_paid
parcel[].will_pay	string	Assumed from sample response for parcel[].will_pay
parcel[].created_at	integer	Assumed from sample response for parcel[].created_at
parcel[].accepted_at	null	Assumed from sample response for parcel[].accepted_at
parcel[].picked_at	null	Assumed from sample response for parcel[].picked_at
parcel[].started_at	null	Assumed from sample response for parcel[].started_at
parcel[].completed_at	null	Assumed from sample response for parcel[].completed_at
parcel[].pickup	object	Assumed from sample response for parcel[].pickup
parcel[].pickup.address	string	Assumed from sample response for parcel[].pickup.address
parcel[].pickup.address_notes	string	Assumed from sample response for parcel[].pickup.address_notes
parcel[].pickup.delivery_notes	string	Assumed from sample response for parcel[].pickup.delivery_notes
parcel[].pickup.house	string	Assumed from sample response for parcel[].pickup.house
parcel[].pickup.latitude	number	Assumed from sample response for parcel[].pickup.latitude
parcel[].pickup.longitude	number	Assumed from sample response for parcel[].pickup.longitude
parcel[].pickup.name	string	Assumed from sample response for parcel[].pickup.name
parcel[].pickup.parcel_type	integer	Assumed from sample response for parcel[].pickup.parcel_type
parcel[].pickup.phone_number	string	Assumed from sample response for parcel[].pickup.phone_number
parcel[].pickup.items	array	Assumed from sample response for parcel[].pickup.items
parcel[].pickup.total_value	integer	Assumed from sample response for parcel[].pickup.total_value
parcel[].pickup.pickup_ready_dt	null	Assumed from sample response for parcel[].pickup.pickup_ready_dt
parcel[].pickup.pickup_deadline_dt	null	Assumed from sample response for parcel[].pickup.pickup_deadline_dt
parcel[].receiver	array	Assumed from sample response for parcel[].receiver
parcel[].receiver[]	object	Assumed from sample response for parcel[].receiver[]
parcel[].receiver[].address	string	Assumed from sample response for parcel[].receiver[].address
parcel[].receiver[].address_notes	string	Assumed from sample response for parcel[].receiver[].address_notes
parcel[].receiver[].delivery_notes	string	Assumed from sample response for parcel[].receiver[].delivery_notes
parcel[].receiver[].house	string	Assumed from sample response for parcel[].receiver[].house
parcel[].receiver[].item_price	integer	Assumed from sample response for parcel[].receiver[].item_price
parcel[].receiver[].latitude	number	Assumed from sample response for parcel[].receiver[].latitude
parcel[].receiver[].longitude	number	Assumed from sample response for parcel[].receiver[].longitude
parcel[].receiver[].name	string	Assumed from sample response for parcel[].receiver[].name
parcel[].receiver[].parcel_type	integer	Assumed from sample response for parcel[].receiver[].parcel_type
parcel[].receiver[].phone_number	string	Assumed from sample response for parcel[].receiver[].phone_number
parcel[].receiver[].road	string	Assumed from sample response for parcel[].receiver[].road
parcel[].receiver[].items	array	Assumed from sample response for parcel[].receiver[].items
parcel[].receiver[].total_item_value	integer	Assumed from sample response for parcel[].receiver[].total_item_value
parcel[].receiver[].dropoff_ready_dt	null	Assumed from sample response for parcel[].receiver[].dropoff_ready_dt
parcel[].receiver[].dropoff_deadline_dt	null	Assumed from sample response for parcel[].receiver[].dropoff_deadline_dt
parcel[].rider	object	Assumed from sample response for parcel[].rider
parcel[].rider.name	string	Assumed from sample response for parcel[].rider.name
parcel[].rider.number	string	Assumed from sample response for parcel[].rider.number
parcel[].rider.profile_picture	string	Assumed from sample response for parcel[].rider.profile_picture
parcel[].rider.type	string	Assumed from sample response for parcel[].rider.type
parcel[].rider.registration_number	string	Assumed from sample response for parcel[].rider.registration_number
parcel[].support_number	string	Assumed from sample response for parcel[].support_number
Parcel History
Endpoint: /api/v1/ondemand/parcels/history
Retrieve history of completed and cancelled parcels with their final status and details.
curl \
  --location '{{base_url}}/api/v1/ondemand/parcels/history?user_type=user&status=COMPLETED&page=1&localization=en' \
  --header 'Authorization: Bearer {{access_token}}'
Request Parameters
Field Name	Field Type	Required	Description
user_type	string	Yes	Type of user - 'user'
status	string	Yes	Filter by status - 'COMPLETED' or 'CANCELLED'
page	integer	Yes	Page number for pagination
localization	string	No	Language/localization code (e.g., 'en', 'bn')
Success Response: Status Code 200
{
   parcel: [
      {
         hashed_id: "z1ci99jiy9wf",
         order_id: "4LHV6OE",
         parcel_status: "COMPLETED",
         charge: 345,
         distance: 0,
         duration: 0,
         is_paid: 1,
         will_pay: "sender",
         created_at: 1776592430,
         accepted_at: null,
         picked_at: null,
         started_at: null,
         completed_at: null,
         pickup: {
            address: "Gulshan 2, Dhaka",
            address_notes: "dl;ajdfajf",
            delivery_notes: "",
            house: "10/D",
            latitude: 23.79475,
            longitude: 90.41438,
            name: "",
            parcel_type: 102,
            phone_number: "",
            items: [],
            total_value: 0,
            pickup_ready_dt: null,
            pickup_deadline_dt: null
         },
         receiver: [
            {
               address: "Saguphta New Road, Mirpur DOHS, Mirpur 12",
               address_notes: "alasjdk",
               delivery_notes: "alsdfkajs",
               house: "12/A",
               item_price: 120,
               latitude: 23.8317617,
               longitude: 90.37662,
               name: "maruf hasan",
               parcel_type: 102,
               phone_number: "01991230987",
               road: "15",
               items: [],
               total_item_value: 0,
               dropoff_ready_dt: null,
               dropoff_deadline_dt: null
            }
         ],
         rider: {
            name: "Bike Test",
            number: "01889091081",
            profile_picture: "/uploads/img/profile/oNX7mJ1746641514.png",
            type: "",
            registration_number: ""
         }
      }
   ],
   total: 4,
   paginate: {
      current_page: 1,
      per_page: 10,
      total_in_page: 4,
      total_page: 1,
      total: 4,
      next_page: ""
   }
}
Response Data
Field Name	Field Type	Description
parcel	array	Assumed from sample response for parcel
parcel[]	object	Assumed from sample response for parcel[]
parcel[].hashed_id	string	Assumed from sample response for parcel[].hashed_id
parcel[].order_id	string	Assumed from sample response for parcel[].order_id
parcel[].parcel_status	string	Assumed from sample response for parcel[].parcel_status
parcel[].charge	integer	Assumed from sample response for parcel[].charge
parcel[].distance	integer	Assumed from sample response for parcel[].distance
parcel[].duration	integer	Assumed from sample response for parcel[].duration
parcel[].is_paid	integer	Assumed from sample response for parcel[].is_paid
parcel[].will_pay	string	Assumed from sample response for parcel[].will_pay
parcel[].created_at	integer	Assumed from sample response for parcel[].created_at
parcel[].accepted_at	null	Assumed from sample response for parcel[].accepted_at
parcel[].picked_at	null	Assumed from sample response for parcel[].picked_at
parcel[].started_at	null	Assumed from sample response for parcel[].started_at
parcel[].completed_at	null	Assumed from sample response for parcel[].completed_at
parcel[].pickup	object	Assumed from sample response for parcel[].pickup
parcel[].pickup.address	string	Assumed from sample response for parcel[].pickup.address
parcel[].pickup.address_notes	string	Assumed from sample response for parcel[].pickup.address_notes
parcel[].pickup.delivery_notes	string	Assumed from sample response for parcel[].pickup.delivery_notes
parcel[].pickup.house	string	Assumed from sample response for parcel[].pickup.house
parcel[].pickup.latitude	number	Assumed from sample response for parcel[].pickup.latitude
parcel[].pickup.longitude	number	Assumed from sample response for parcel[].pickup.longitude
parcel[].pickup.name	string	Assumed from sample response for parcel[].pickup.name
parcel[].pickup.parcel_type	integer	Assumed from sample response for parcel[].pickup.parcel_type
parcel[].pickup.phone_number	string	Assumed from sample response for parcel[].pickup.phone_number
parcel[].pickup.items	array	Assumed from sample response for parcel[].pickup.items
parcel[].pickup.total_value	integer	Assumed from sample response for parcel[].pickup.total_value
parcel[].pickup.pickup_ready_dt	null	Assumed from sample response for parcel[].pickup.pickup_ready_dt
parcel[].pickup.pickup_deadline_dt	null	Assumed from sample response for parcel[].pickup.pickup_deadline_dt
parcel[].receiver	array	Assumed from sample response for parcel[].receiver
parcel[].receiver[]	object	Assumed from sample response for parcel[].receiver[]
parcel[].receiver[].address	string	Assumed from sample response for parcel[].receiver[].address
parcel[].receiver[].address_notes	string	Assumed from sample response for parcel[].receiver[].address_notes
parcel[].receiver[].delivery_notes	string	Assumed from sample response for parcel[].receiver[].delivery_notes
parcel[].receiver[].house	string	Assumed from sample response for parcel[].receiver[].house
parcel[].receiver[].item_price	integer	Assumed from sample response for parcel[].receiver[].item_price
parcel[].receiver[].latitude	number	Assumed from sample response for parcel[].receiver[].latitude
parcel[].receiver[].longitude	number	Assumed from sample response for parcel[].receiver[].longitude
parcel[].receiver[].name	string	Assumed from sample response for parcel[].receiver[].name
parcel[].receiver[].parcel_type	integer	Assumed from sample response for parcel[].receiver[].parcel_type
parcel[].receiver[].phone_number	string	Assumed from sample response for parcel[].receiver[].phone_number
parcel[].receiver[].road	string	Assumed from sample response for parcel[].receiver[].road
parcel[].receiver[].items	array	Assumed from sample response for parcel[].receiver[].items
parcel[].receiver[].total_item_value	integer	Assumed from sample response for parcel[].receiver[].total_item_value
parcel[].receiver[].dropoff_ready_dt	null	Assumed from sample response for parcel[].receiver[].dropoff_ready_dt
parcel[].receiver[].dropoff_deadline_dt	null	Assumed from sample response for parcel[].receiver[].dropoff_deadline_dt
parcel[].rider	object	Assumed from sample response for parcel[].rider
parcel[].rider.name	string	Assumed from sample response for parcel[].rider.name
parcel[].rider.number	string	Assumed from sample response for parcel[].rider.number
parcel[].rider.profile_picture	string	Assumed from sample response for parcel[].rider.profile_picture
parcel[].rider.type	string	Assumed from sample response for parcel[].rider.type
parcel[].rider.registration_number	string	Assumed from sample response for parcel[].rider.registration_number
total	integer	Assumed from sample response for total
paginate	object	Assumed from sample response for paginate
paginate.current_page	integer	Assumed from sample response for paginate.current_page
paginate.per_page	integer	Assumed from sample response for paginate.per_page
paginate.total_in_page	integer	Assumed from sample response for paginate.total_in_page
paginate.total_page	integer	Assumed from sample response for paginate.total_page
paginate.total	integer	Assumed from sample response for paginate.total
paginate.next_page	string	Assumed from sample response for paginate.next_page


Webhook Integration
You can choose to integrate webhook for status updates of your individual delivery. You only need to provide us with a Callback URL and Webhook secret, where you will receive a POST request containing event details.
Your URL should be reachable.
URL should resolve within 3 redirects.
HTTPS SSL certificate should be valid.
URL should respond within 10 seconds.
URL must return status code 202 for webhook integration event.
To integrate webhook, your endpoint receives body:
{
  event: "webhook_integration"
}
Callback URL
Secret
Events (all locked)

Select all

Parcel Order Updated
Webhook integration documentation
Headers you will receive
Header name	Header value
X-PATHAO-Signature	Secret you provided during webhook integration.
Content-Type	application/json
Parcel Order Updated
This event is triggered when there is an update on the parcel order. You will receive this webhook for any update on the order, including status updates.
Your URL should be reachable.
URL should resolve within 3 redirects.
HTTPS SSL certificate should be valid.
URL should respond within 10 seconds.
URL must return status code 202 for webhook integration event.
Sample Payload
{
   event: "parcel_updated",
   data: {
      parcel: {
         hashed_id: "z1ci99jizevc",
         order_id: "4LHV2YB",
         parcel_status: "CANCELLED",
         charge: 114.26,
         distance: 4584,
         duration: 632,
         is_paid: 0,
         created_at: 1773209184,
         accepted_at: null,
         picked_at: null,
         started_at: null,
         completed_at: null,
         rider: {
            name: "asibul H Hasan",
            number: "01767191651",
            profile_picture: "/uploads/img/profile/7PqrFI1722490453.png",
            type: "bike",
            registration_number: "DHK METRO HA 55-5956"
         },
         support_number: "09678100800",
         pickup_proof_img: "https://cdn.pathao.com/parcel/abc.jpg",
         dropoff_proof_img: "https://cdn.pathao.com/parcel/bcd.jpg"
      }
   }
}