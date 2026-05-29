import type { Metadata } from 'next'
import { AlertTriangle, Bike, ListChecks, RefreshCw, Smartphone } from 'lucide-react'
import EndpointCard from '../components/EndpointCard'
import ParamTable from '../components/ParamTable'
import CodeBlock from '../components/CodeBlock'

export const metadata: Metadata = {
  title: 'Rider App — Balapasa Platform API',
  description:
    'Build a rider client: authenticate with a staff bearer token, list assigned and active deliveries, update order status, and register for FCM push.',
}

export default function RiderAppPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section>
        <p className="mb-3 inline-flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-sm font-medium uppercase tracking-wide text-emerald-400">
          <Bike className="h-4 w-4" />
          Rider App
        </p>
        <h1 className="font-[family-name:var(--font-jetbrains)] text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          Rider App
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          The rider client lets delivery staff pull the orders they need to move,
          mark progress as they pick up and drop off, and receive live push
          updates. It runs on the same REST surface as the rest of the platform —
          there is no separate rider service. A rider is simply a{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            STAFF
          </code>
          -or-higher account, so every request authenticates with a staff bearer
          token.
        </p>
      </section>

      {/* Authentication */}
      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-slate-100">
          Authentication
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Sign the rider in with{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            POST /api/mobile/auth
          </code>{' '}
          and store the returned{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            token
          </code>
          . The account must have a role of{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            STAFF
          </code>
          ,{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            MANAGER
          </code>
          , or{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            ADMIN
          </code>{' '}
          to see operational orders. Send the token as a bearer header on every
          rider request:
        </p>
        <CodeBlock
          language="http"
          title="Authorization header"
          code={`Authorization: Bearer <jwt>`}
        />
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          The decoded payload is{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            {'{ sub, email, role, name? }'}
          </code>{' '}
          — use{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            role
          </code>{' '}
          on the client to gate rider-only screens. (The web app uses an httpOnly{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            auth-token
          </code>{' '}
          cookie instead; mobile rider clients should always use the bearer
          header.)
        </p>
      </section>

      {/* Assigned & active deliveries */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-slate-100">
          <ListChecks className="h-5 w-5 text-emerald-400" />
          Fetch deliveries to work
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          The platform does not yet expose a rider-scoped queue (see the callout
          below). The closest real endpoints let a rider pull the operational
          order list filtered by status, plus the roster of delivery staff. Poll{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            GET /api/admin/orders
          </code>{' '}
          filtered by{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            status
          </code>{' '}
          to build the &ldquo;active runs&rdquo; screen.
        </p>

        <EndpointCard
          method="GET"
          path="/api/admin/orders?status=CONFIRMED"
          auth="Bearer <jwt> · STAFF+"
          title="List orders by status"
        >
          <p className="mb-3">
            Returns the most recent orders, newest first. Pass{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              status
            </code>{' '}
            for an exact-match filter (e.g.{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              CONFIRMED
            </code>{' '}
            for runs to pick up,{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              SHIPPED
            </code>{' '}
            for deliveries in flight). Each order embeds its line{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              items
            </code>
            ;{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              createdAt
            </code>{' '}
            and{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              updatedAt
            </code>{' '}
            are ISO strings.
          </p>
          <ParamTable
            rows={[
              {
                name: 'status',
                type: 'string (query)',
                required: false,
                desc: 'Exact-match status filter: CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED. Omit to list all.',
              },
              {
                name: 'limit',
                type: 'number (query)',
                required: false,
                desc: 'Max orders to return. Defaults to 200.',
              },
            ]}
          />
          <p className="mb-2 mt-4 text-xs uppercase tracking-wide text-slate-500">
            Response 200
          </p>
          <CodeBlock
            language="json"
            code={`{
  "orders": [
    {
      "id": "ckv9...",
      "status": "SHIPPED",
      "name": "Sita Rai",
      "phone": "9800000000",
      "address": "Ward 4, Lazimpat",
      "city": "Kathmandu",
      "total": 2480,
      "paymentMethod": "COD",
      "paymentStatus": "PENDING",
      "shippingOption": "Pick & Drop — Kathmandu",
      "trackingUrl": "https://...",
      "items": [
        { "id": "li_1", "name": "Hand-loom Scarf", "quantity": 2 }
      ],
      "createdAt": "2026-05-29T08:14:02.000Z",
      "updatedAt": "2026-05-29T09:01:55.000Z"
    }
  ]
}`}
          />
        </EndpointCard>

        <EndpointCard
          method="GET"
          path="/api/admin/riders"
          auth="Bearer <jwt> · STAFF+"
          title="List delivery staff"
        >
          <p className="mb-3">
            Returns every{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              STAFF
            </code>
            /
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              MANAGER
            </code>
            /
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              ADMIN
            </code>{' '}
            profile, sorted by name. There is no dedicated rider model — these are
            ordinary staff profiles, which is why the response carries a{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              role
            </code>{' '}
            rather than rider-specific fields.
          </p>
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
            Response 200
          </p>
          <CodeBlock
            language="json"
            code={`{
  "riders": [
    {
      "id": "usr_a1",
      "name": "Bikash Tamang",
      "phone": "9811111111",
      "email": "bikash@balapasa.com",
      "role": "STAFF"
    }
  ]
}`}
          />
        </EndpointCard>
      </section>

      {/* Update status */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-slate-100">
          <RefreshCw className="h-5 w-5 text-emerald-400" />
          Update delivery status
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          As a rider moves a parcel, patch the order&rsquo;s{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            status
          </code>
          . Setting it to{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            SHIPPED
          </code>
          ,{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            DELIVERED
          </code>
          , or{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            CANCELLED
          </code>{' '}
          automatically fires the matching order push to the customer&rsquo;s
          devices (and a customer email when one is on file).
        </p>

        <EndpointCard
          method="PATCH"
          path="/api/admin/orders/[id]"
          auth="Bearer <jwt> · STAFF+"
          title="Advance an order's status"
        >
          <p className="mb-3">
            Send only the fields you want to change. For rider flows the relevant
            field is{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              status
            </code>
            ; the same endpoint also accepts payment, contact, and address fields,
            but a rider client should normally touch{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              status
            </code>{' '}
            only. The response is the updated order (line{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              items
            </code>{' '}
            included, timestamps as ISO strings).
          </p>
          <ParamTable
            rows={[
              {
                name: 'status',
                type: 'string',
                required: false,
                desc: 'New order status. Rider transitions: SHIPPED (out for delivery) → DELIVERED, or CANCELLED on a failed drop. These values trigger the customer push.',
              },
              {
                name: 'paymentStatus',
                type: 'string',
                required: false,
                desc: 'Set PAID after collecting a COD payment. Triggers a payment-confirmed push + receipt email.',
              },
              {
                name: 'notes',
                type: 'string',
                required: false,
                desc: 'Free-text note appended to the order (e.g. proof-of-delivery remarks).',
              },
            ]}
          />
          <p className="mb-2 mt-4 text-xs uppercase tracking-wide text-slate-500">
            Request body
          </p>
          <CodeBlock
            language="json"
            code={`{
  "status": "DELIVERED"
}`}
          />
          <p className="mb-2 mt-4 text-xs uppercase tracking-wide text-slate-500">
            Response 200
          </p>
          <CodeBlock
            language="json"
            code={`{
  "id": "ckv9...",
  "status": "DELIVERED",
  "paymentStatus": "PENDING",
  "items": [ { "id": "li_1", "name": "Hand-loom Scarf", "quantity": 2 } ],
  "createdAt": "2026-05-29T08:14:02.000Z",
  "updatedAt": "2026-05-29T11:42:10.000Z"
}`}
          />
        </EndpointCard>

        <EndpointCard
          method="GET"
          path="/api/admin/orders/[id]"
          auth="Bearer <jwt> · STAFF+"
          title="Fetch one order's detail"
        >
          <p>
            Load a single order for the run-detail screen — same shape as a list
            entry, with{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              items
            </code>{' '}
            embedded. Returns{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              404
            </code>{' '}
            if the id is unknown.
          </p>
        </EndpointCard>

        <CodeBlock
          language="dart"
          title="Mark delivered (Flutter / Dart)"
          code={`final res = await http.patch(
  Uri.parse('https://api.balapasa.com/api/admin/orders/$orderId'),
  headers: {
    'Authorization': 'Bearer $jwt',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({ 'status': 'DELIVERED' }),
);
// 200 -> updated order JSON; customer push fires server-side.`}
        />
      </section>

      {/* Push registration */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-slate-100">
          <Smartphone className="h-5 w-5 text-emerald-400" />
          Register for push (FCM)
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          After the rider grants notification permission, send the device&rsquo;s
          FCM token so the platform can store it against the signed-in account.
          Send the bearer token so the device is bound to the rider&rsquo;s{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            userId
          </code>
          . Unregister on logout.
        </p>

        <EndpointCard
          method="POST"
          path="/api/mobile/push"
          auth="Bearer <jwt>"
          title="Register or refresh an FCM token"
        >
          <p className="mb-3">
            Upserts the token (unique per device). When a valid bearer token is
            present the device is linked to that{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              userId
            </code>
            ; without one the token is stored unattached.
          </p>
          <ParamTable
            rows={[
              {
                name: 'token',
                type: 'string',
                required: true,
                desc: 'The FCM registration token from the device.',
              },
              {
                name: 'platform',
                type: "'android' | 'ios'",
                required: false,
                desc: "Device platform. Defaults to 'android'.",
              },
            ]}
          />
          <p className="mb-2 mt-4 text-xs uppercase tracking-wide text-slate-500">
            Response 200
          </p>
          <CodeBlock language="json" code={`{ "registered": true }`} />
        </EndpointCard>

        <EndpointCard
          method="DELETE"
          path="/api/mobile/push"
          auth="Bearer <jwt>"
          title="Unregister a token on logout"
        >
          <p className="mb-3">
            Removes the device token so a logged-out phone stops receiving the
            rider&rsquo;s pushes.
          </p>
          <ParamTable
            rows={[
              {
                name: 'token',
                type: 'string',
                required: true,
                desc: 'The FCM token to remove.',
              },
            ]}
          />
          <p className="mb-2 mt-4 text-xs uppercase tracking-wide text-slate-500">
            Response 200
          </p>
          <CodeBlock language="json" code={`{ "removed": true }`} />
        </EndpointCard>
      </section>

      {/* Production gaps callout */}
      <section>
        <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="space-y-2 text-sm leading-relaxed text-amber-100/90">
            <p className="font-[family-name:var(--font-jetbrains)] font-semibold text-amber-300">
              Production rider apps need a dedicated rider surface
            </p>
            <p>
              The endpoints above are repurposed admin/operations routes. A
              production rider app requires two pieces that do not exist yet:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <span className="font-medium text-amber-200">
                  A rider-scoped assignment endpoint.
                </span>{' '}
                There is no rider model and no accept/decline flow — assignment
                happens admin-side through{' '}
                <code className="font-[family-name:var(--font-jetbrains)] text-amber-200">
                  POST /api/admin/orders/[id]/assign-delivery
                </code>{' '}
                (carrier dispatch: PATHAO / PICKNDROP / MANUAL), which is not a
                rider action. Today a rider can only{' '}
                <em>read</em> the whole order list (
                <code className="font-[family-name:var(--font-jetbrains)] text-amber-200">
                  GET /api/admin/orders?status=
                </code>
                ) and <em>update</em> a status; there is no &ldquo;orders assigned
                to me&rdquo; query. Even{' '}
                <code className="font-[family-name:var(--font-jetbrains)] text-amber-200">
                  GET /api/admin/riders
                </code>{' '}
                just returns STAFF+ profiles, not a true rider roster.
              </li>
              <li>
                <span className="font-medium text-amber-200">
                  Per-role push targeting.
                </span>{' '}
                Push events resolve recipients by a single{' '}
                <code className="font-[family-name:var(--font-jetbrains)] text-amber-200">
                  userId
                </code>
                &rsquo;s device tokens with no customer / rider / store
                segmentation — so there is no way to push &ldquo;new
                assignment&rdquo; to a specific rider as a distinct audience.
                (Note: FCM credentials must also be configured, or pushes silently
                no-op.)
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
