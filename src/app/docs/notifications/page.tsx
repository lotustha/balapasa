import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Bell,
  Flame,
  KeyRound,
  Smartphone,
  Send,
  Target,
  TestTube,
  Info,
  AlertTriangle,
} from 'lucide-react'
import EndpointCard from '../components/EndpointCard'
import CodeBlock from '../components/CodeBlock'
import ParamTable from '../components/ParamTable'

export const metadata: Metadata = {
  title: 'Push Notifications (FCM) — Balapasa Platform API',
  description:
    'Firebase Cloud Messaging for the Balapasa customer, rider, and store apps: project setup, server service-account env vars, device-token registration, the push payload shape, which events fire pushes, and per-user targeting reality.',
}

function SectionHeading({
  id,
  icon: Icon,
  children,
}: {
  id: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <h2
      id={id}
      className="mt-2 flex scroll-mt-24 items-center gap-2.5 font-[family-name:var(--font-jetbrains)] text-xl font-semibold text-slate-100"
    >
      <Icon className="h-5 w-5 text-emerald-400" />
      {children}
    </h2>
  )
}

function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning'
  title: string
  children: React.ReactNode
}) {
  const styles =
    tone === 'warning'
      ? { ring: 'ring-amber-500/30', bg: 'bg-amber-500/10', icon: 'text-amber-400', Icon: AlertTriangle }
      : { ring: 'ring-sky-500/30', bg: 'bg-sky-500/10', icon: 'text-sky-400', Icon: Info }
  const Icon = styles.Icon
  return (
    <div className={`rounded-lg ring-1 ${styles.ring} ${styles.bg} px-4 py-3`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${styles.icon}`} />
        <div className="text-sm leading-relaxed text-slate-300">
          <p className="mb-1 font-semibold text-slate-100">{title}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-lg bg-slate-800/40 p-4 ring-1 ring-slate-700/60">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 font-[family-name:var(--font-jetbrains)] text-sm font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
        {n}
      </span>
      <div className="text-sm leading-relaxed text-slate-300">{children}</div>
    </li>
  )
}

export default function NotificationsPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section>
        <p className="mb-3 font-[family-name:var(--font-jetbrains)] text-sm font-medium uppercase tracking-wide text-emerald-400">
          Push Notifications
        </p>
        <h1 className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          <Bell className="h-8 w-8 text-emerald-400" />
          Firebase Cloud Messaging
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          The platform pushes order, payment, and delivery updates through{' '}
          Firebase Cloud Messaging (FCM HTTP v1). The same pipeline serves the{' '}
          customer, rider, and store apps. This guide covers Firebase project{' '}
          setup, the server service-account credentials, device-token{' '}
          registration, the payload shape, every event that fires a push, and{' '}
          the targeting model — including its current limits.
        </p>
      </section>

      {/* Pipeline overview */}
      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-slate-100">
          How a push travels end to end
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ['Device registers', 'App fetches its FCM token and POSTs it to /api/mobile/push, linked to the logged-in user.', 'text-sky-400'],
            ['Event fires', 'An order/payment/delivery event calls pushOrderEvent() on the server.', 'text-emerald-400'],
            ['Server signs & sends', 'push.ts mints a service-account JWT, gets an OAuth token, POSTs to FCM HTTP v1.', 'text-amber-400'],
            ['Device wakes', 'FCM delivers the notification + data payload; the app deep-links via data.screen.', 'text-emerald-400'],
          ] as const).map(([title, desc, color], i) => (
            <li
              key={title}
              className="rounded-lg bg-slate-800/40 p-4 ring-1 ring-slate-700/60"
            >
              <span className={`font-[family-name:var(--font-jetbrains)] text-sm font-semibold ${color}`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="mt-1 font-medium text-slate-100">{title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-400">{desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Firebase project setup ──────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading id="firebase-setup" icon={Flame}>
          1. Firebase project setup
        </SectionHeading>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          One Firebase project backs all three apps. Create it once, then add an{' '}
          Android and an iOS app for each client that needs push.
        </p>

        <ol className="space-y-3">
          <Step n={1}>
            In the{' '}
            <a
              href="https://console.firebase.google.com"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 underline-offset-4 hover:underline"
            >
              Firebase Console
            </a>
            , create a project (e.g. <span className="text-slate-100">balapasa</span>).
            Note its <span className="text-slate-100">Project ID</span> — it
            becomes{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">FCM_PROJECT_ID</code>{' '}
            on the server.
          </Step>
          <Step n={2}>
            <span className="text-slate-100">Add an Android app</span> for each
            client. Use the app&apos;s package name (e.g.{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">com.balapasa.customer</code>),
            download{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">google-services.json</code>,
            and drop it into{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">android/app/</code>.
          </Step>
          <Step n={3}>
            <span className="text-slate-100">Add an iOS app</span> with the
            bundle identifier, download{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">GoogleService-Info.plist</code>,
            and add it to the Xcode project (Runner target).
          </Step>
          <Step n={4}>
            FCM is enabled by default for new projects. Confirm under{' '}
            <span className="text-slate-100">Project Settings → Cloud Messaging</span>{' '}
            that the <span className="text-slate-100">Firebase Cloud Messaging API (V1)</span>{' '}
            is enabled — this is the API <code className="font-[family-name:var(--font-jetbrains)]">push.ts</code> calls.
          </Step>
          <Step n={5}>
            For iOS, upload an{' '}
            <span className="text-slate-100">APNs authentication key</span> (a{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">.p8</code> from the
            Apple Developer portal) under{' '}
            <span className="text-slate-100">Cloud Messaging → Apple app configuration</span>.
            Without it, iOS devices register tokens but never receive
            notifications.
          </Step>
          <Step n={6}>
            Generate the server credential:{' '}
            <span className="text-slate-100">Project Settings → Service accounts → Generate new private key</span>.
            This downloads a JSON file holding{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">project_id</code>,{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">client_email</code>,
            and{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">private_key</code>{' '}
            — the three values the server needs.
          </Step>
        </ol>

        <Callout tone="info" title="One project, many apps">
          <p>
            All three clients (customer, rider, store) share the same Firebase
            project and the same server credentials. They differ only by the
            per-app <code className="font-[family-name:var(--font-jetbrains)]">google-services.json</code> /{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">GoogleService-Info.plist</code>{' '}
            bundled into each build. The server sends to a device token; it
            doesn&apos;t care which app produced it.
          </p>
        </Callout>
      </section>

      {/* ── Server credentials ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading id="server-env" icon={KeyRound}>
          2. Server credentials &amp; the sender
        </SectionHeading>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Set the three values in{' '}
          <span className="text-slate-100">Admin → Settings → Notifications → Push Notifications (Firebase Cloud Messaging)</span>.
          They are stored in <code className="font-[family-name:var(--font-jetbrains)]">app_settings</code>{' '}
          and read by <code className="font-[family-name:var(--font-jetbrains)]">src/lib/push.ts</code>{' '}
          via a 30-second cached getter — saving in the admin panel takes effect
          without a redeploy. The same{' '}
          <code className="font-[family-name:var(--font-jetbrains)]">FCM_*</code> environment
          variables still work as a fallback when no DB value is present.
        </p>

        <ParamTable
          rows={[
            { name: 'FCM_PROJECT_ID', type: 'string', required: true, desc: 'project_id from the service-account JSON. Builds the send URL: /v1/projects/{id}/messages:send.' },
            { name: 'FCM_CLIENT_EMAIL', type: 'string', required: true, desc: 'client_email (firebase-adminsdk-...@project.iam.gserviceaccount.com). The JWT issuer.' },
            { name: 'FCM_PRIVATE_KEY', type: 'string', required: true, desc: 'Service-account RSA private key (full BEGIN/END block). Escaped \\n or real newlines both accepted — push.ts normalises them.' },
          ]}
        />

        <CodeBlock
          language="bash"
          title=".env.local (optional fallback — admin panel is preferred)"
          code={'FCM_PROJECT_ID=balapasa\n' +
            'FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@balapasa.iam.gserviceaccount.com\n' +
            'FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADAN...\\n-----END PRIVATE KEY-----\\n"'}
        />

        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          The sender uses the <span className="text-slate-100">FCM HTTP v1</span>{' '}
          API with service-account JWT auth — there is no third-party SDK. On
          each send it:
        </p>
        <ul className="ml-4 list-disc space-y-1.5 text-sm leading-relaxed text-slate-400">
          <li>
            Builds an <code className="font-[family-name:var(--font-jetbrains)]">RS256</code> JWT
            (issuer = <code className="font-[family-name:var(--font-jetbrains)]">FCM_CLIENT_EMAIL</code>,
            scope ={' '}
            <code className="font-[family-name:var(--font-jetbrains)]">firebase.messaging</code>),
            signs it with the private key, and exchanges it at{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">oauth2.googleapis.com/token</code>{' '}
            for an OAuth access token.
          </li>
          <li>
            Caches that access token in memory until ~60s before expiry, so most
            sends skip the token exchange.
          </li>
          <li>
            POSTs the message to{' '}
            <code className="font-[family-name:var(--font-jetbrains)] break-all">
              https://fcm.googleapis.com/v1/projects/{'{FCM_PROJECT_ID}'}/messages:send
            </code>
            .
          </li>
          <li>
            On an <code className="font-[family-name:var(--font-jetbrains)]">UNREGISTERED</code>{' '}
            or <code className="font-[family-name:var(--font-jetbrains)]">INVALID_ARGUMENT</code>{' '}
            error, deletes the dead token from{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">device_tokens</code>{' '}
            automatically.
          </li>
        </ul>

        <Callout tone="info" title="Pushes silently no-op until credentials are configured">
          <p>
            <code className="font-[family-name:var(--font-jetbrains)]">getAccessToken()</code>{' '}
            returns <code className="font-[family-name:var(--font-jetbrains)]">null</code> when any of
            the three credentials is missing, and{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">sendPush()</code>{' '}
            then returns <code className="font-[family-name:var(--font-jetbrains)]">false</code>{' '}
            without sending — token registration still succeeds, but nothing is
            delivered. Configure all three in{' '}
            <span className="text-slate-100">Admin → Settings → Notifications</span>{' '}
            (or via the fallback env vars) to turn the pipeline on.
          </p>
        </Callout>
      </section>

      {/* ── Device-token registration ───────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading id="register" icon={Smartphone}>
          3. Device-token registration
        </SectionHeading>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          After login, every app fetches its FCM registration token and POSTs it
          to the endpoint below. The token is upserted into the{' '}
          <code className="font-[family-name:var(--font-jetbrains)]">device_tokens</code> table
          and linked to the authenticated user. The endpoint accepts either a{' '}
          bearer JWT or the web{' '}
          <code className="font-[family-name:var(--font-jetbrains)]">auth-token</code> cookie.
        </p>

        <EndpointCard
          method="POST"
          path="/api/mobile/push"
          auth="Bearer or Cookie (optional)"
          title="Register / refresh a device token"
        >
          <p className="mb-3">
            Upserts the token by its unique value, attaching the resolved{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">userId</code>.
            Call it on login and whenever FCM rotates the token. Registering
            without auth is accepted (the token row has{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">userId = null</code>),
            but such a token is never targeted by user-scoped pushes — so always
            send the JWT once the user is signed in.
          </p>
          <ParamTable
            rows={[
              { name: 'token', type: 'string', required: true, desc: 'FCM registration token from the device. Missing token → 400.' },
              { name: 'platform', type: '"android" | "ios"', desc: 'Stored on the row. Defaults to "android".' },
            ]}
          />
          <p className="mb-2 mt-4 text-slate-400">Request</p>
          <CodeBlock
            language="bash"
            code={'curl -X POST https://balapasa.com/api/mobile/push \\\n' +
              "  -H 'Authorization: Bearer <jwt>' \\\n" +
              "  -H 'Content-Type: application/json' \\\n" +
              `  -d '{ "token": "fXyZ...:APA91b...", "platform": "android" }'`}
          />
          <p className="mb-2 mt-4 text-slate-400">Response <code className="font-[family-name:var(--font-jetbrains)]">200</code></p>
          <CodeBlock language="json" code={`{ "registered": true }`} />
        </EndpointCard>

        <EndpointCard
          method="DELETE"
          path="/api/mobile/push"
          auth="Bearer or Cookie (optional)"
          title="Unregister on logout"
        >
          <p className="mb-3">
            Removes the token by value so the device stops receiving pushes.
            Call it on logout. Idempotent — removing an unknown token still
            returns{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">200</code>.
          </p>
          <ParamTable
            rows={[
              { name: 'token', type: 'string', required: true, desc: 'The FCM token to remove. Missing token → 400.' },
            ]}
          />
          <p className="mb-2 mt-4 text-slate-400">Response <code className="font-[family-name:var(--font-jetbrains)]">200</code></p>
          <CodeBlock language="json" code={`{ "removed": true }`} />
        </EndpointCard>

        <div className="space-y-3">
          <h3 className="font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
            The device_tokens table
          </h3>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
            Tokens persist in the{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">DeviceToken</code> Prisma
            model. <code className="font-[family-name:var(--font-jetbrains)]">token</code> is unique
            (so an upsert by token de-duplicates across re-registrations), and{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">userId</code> is nullable
            for anonymous devices.
          </p>
          <CodeBlock
            language="prisma"
            title="prisma/schema.prisma"
            code={`model DeviceToken {
  id        String   @id @default(cuid())
  userId    String?  @map("user_id")     // null = guest device
  token     String   @unique             // FCM registration token
  platform  String   @default("android") // android | ios
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([userId])
  @@map("device_tokens")
}`}
          />
        </div>

        <div className="space-y-3">
          <h3 className="font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
            Walkthrough — register after login (Flutter)
          </h3>
          <CodeBlock
            language="dart"
            title="register_push.dart"
            code={`final fcmToken = await FirebaseMessaging.instance.getToken();
if (fcmToken == null) return;

await http.post(
  Uri.parse('\$baseUrl/api/mobile/push'),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer \$jwt',
  },
  body: jsonEncode({
    'token': fcmToken,
    'platform': Platform.isIOS ? 'ios' : 'android',
  }),
);
// → { "registered": true }

// And on token rotation:
FirebaseMessaging.instance.onTokenRefresh.listen((t) {
  http.post(/* same POST with the new token */);
});`}
          />
        </div>
      </section>

      {/* ── Payload & events ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading id="payload" icon={Send}>
          4. The push payload &amp; which events fire
        </SectionHeading>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Every push the platform sends starts from this internal{' '}
          <code className="font-[family-name:var(--font-jetbrains)]">PushPayload</code> shape,
          which <code className="font-[family-name:var(--font-jetbrains)]">sendPush()</code> maps
          onto the FCM HTTP v1 envelope.
        </p>

        <CodeBlock
          language="typescript"
          title="src/lib/push.ts"
          code={`interface PushPayload {
  title:     string
  body:      string
  data?:     Record<string, string>  // custom key/value for deep links
  imageUrl?: string                  // optional big-picture image
}`}
        />

        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Order events go through the{' '}
          <code className="font-[family-name:var(--font-jetbrains)]">pushOrderEvent()</code> helper,
          which <span className="text-slate-100">always injects a data map</span> of{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">{`{ orderId, screen: "orders" }`}</code>.
          That data map is the deep-link contract: the customer, rider, and
          store apps all read{' '}
          <code className="font-[family-name:var(--font-jetbrains)]">data.screen</code> to route the
          tap and <code className="font-[family-name:var(--font-jetbrains)]">data.orderId</code> to
          open the right order.
        </p>

        <div className="space-y-3">
          <h3 className="font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
            On-the-wire FCM message
          </h3>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
            This is exactly what{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">sendPush()</code> POSTs to
            FCM. Note the platform overrides — Android high-priority sound, iOS
            APNs sound + badge.
          </p>
          <CodeBlock
            language="json"
            title="POST /v1/projects/{FCM_PROJECT_ID}/messages:send"
            code={`{
  "message": {
    "token": "fXyZ...:APA91b...",
    "notification": {
      "title": "✅ Order Confirmed!",
      "body": "Your order of Rs. 1,980 is confirmed. We'll notify you when it ships.",
      "image": null
    },
    "data": { "orderId": "clx...", "screen": "orders" },
    "android": { "notification": { "sound": "default", "priority": "HIGH" } },
    "apns":    { "payload": { "aps": { "sound": "default", "badge": 1 } } }
  }
}`}
          />
        </div>

        <div className="space-y-3">
          <h3 className="font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
            Events that fire a push
          </h3>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
            Pushes are fire-and-forget side effects of order lifecycle changes,
            raised from four call sites:
          </p>
          <div className="overflow-x-auto rounded-lg ring-1 ring-slate-700/60">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 bg-slate-800/60">
                  <th className="px-4 py-2.5 font-semibold text-slate-200">Event</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-200">Title</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-200">Fired from</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ['Order confirmed', '✅ Order Confirmed!', 'POST /api/orders (on create)'],
                  ['Payment confirmed', '💳 …Payment Confirmed', 'eSewa & Khalti verify (/checkout/verify) + admin mark-as-paid'],
                  ['Shipped', '🚚 Your order is on its way!', 'PATCH /api/admin/orders/[id] → SHIPPED'],
                  ['Delivered', '✅ Order Delivered!', 'PATCH /api/admin/orders/[id] → DELIVERED'],
                  ['Cancelled', '❌ Order Cancelled', 'PATCH /api/admin/orders/[id] → CANCELLED'],
                  ['PnD carrier status', 'Picked up / Out for delivery / Nearby / Delivered', 'Pick & Drop webhook (see limitation 2)'],
                ] as const).map(([event, title, src]) => (
                  <tr
                    key={event}
                    className="border-b border-slate-800 last:border-0 transition-colors duration-200 hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-100">{event}</td>
                    <td className="px-4 py-2.5 font-[family-name:var(--font-jetbrains)] text-emerald-400">{title}</td>
                    <td className="px-4 py-2.5 text-slate-300">{src}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            The &quot;payment confirmed&quot; push has three call sites: the
            eSewa and Khalti callbacks in{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">/checkout/verify</code>{' '}
            and the admin mark-as-paid path in{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">PATCH /api/admin/orders/[id]</code>.
          </p>
        </div>

        <Callout tone="info" title="Pick & Drop status pushes now deliver (resolved)">
          <p>
            The Pick &amp; Drop webhook maps several carrier statuses to push
            titles (
            <span className="text-slate-100">picked up</span>,{' '}
            <span className="text-slate-100">out for delivery</span>,{' '}
            <span className="text-slate-100">rider nearby</span>,{' '}
            <span className="text-slate-100">delivered</span>). It previously
            called{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">pushOrderEvent({`{ userId: null }`})</code>{' '}
            — which early-returns — so those pushes were mapped but never sent.
            This is now fixed:{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">processPndWebhookEvent</code>{' '}
            selects the order&apos;s{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">userId</code> and passes it
            through, so registered devices for that customer receive the push.
            Guest orders (no <code className="font-[family-name:var(--font-jetbrains)]">userId</code>)
            still correctly skip the push and rely on email.
          </p>
        </Callout>
      </section>

      {/* ── Targeting ───────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading id="targeting" icon={Target}>
          5. Per-app targeting reality
        </SectionHeading>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Targeting is <span className="text-slate-100">per user</span>, not per
          app or per role.{' '}
          <code className="font-[family-name:var(--font-jetbrains)]">pushToUser(userId)</code>{' '}
          queries <code className="font-[family-name:var(--font-jetbrains)]">device_tokens</code>{' '}
          by <code className="font-[family-name:var(--font-jetbrains)]">userId</code> and sends to{' '}
          <span className="text-slate-100">every</span> token that user has
          registered — across the customer, rider, and store apps and across all
          their devices.
        </p>

        <Callout tone="warning" title="Limitation 3 — no role / app segmentation">
          <p className="mb-2">
            The{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">device_tokens</code> table
            has <span className="text-slate-100">no role or app column</span> —
            only <code className="font-[family-name:var(--font-jetbrains)]">userId</code>,{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">token</code>, and{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">platform</code>. So the
            limitation isn&apos;t a missing feature flag, it&apos;s structural:
            you cannot say &quot;push only to riders&quot; or &quot;only to the
            store app.&quot; A push aimed at a userId reaches all of that
            user&apos;s registered tokens regardless of which app they came from.
          </p>
          <p>
            Until an app/role column is added (and the senders filter on it),
            treat every order event as a notification to the order&apos;s owner,
            full stop. Rider- and store-specific routing is not yet possible
            through this pipeline.
          </p>
        </Callout>

        <Callout tone="info" title="Guests get no push">
          <p>
            <code className="font-[family-name:var(--font-jetbrains)]">pushOrderEvent</code>{' '}
            early-returns when there is no{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">userId</code>, so an order
            placed as a guest (no linked account) never produces a push — guests
            are reached by email / WhatsApp instead. Register the device token
            against a signed-in user to receive pushes.
          </p>
        </Callout>
      </section>

      {/* ── Testing ─────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading id="testing" icon={TestTube}>
          6. Testing pushes
        </SectionHeading>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Two ways to verify the loop: the Firebase console for a quick device
          smoke test, and a direct HTTP v1 call that mirrors what the server
          sends.
        </p>

        <div className="space-y-3">
          <h3 className="font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
            A) Firebase console
          </h3>
          <ul className="ml-4 list-disc space-y-1.5 text-sm leading-relaxed text-slate-400">
            <li>
              Grab the device&apos;s FCM token (log it from the app, or read it
              from the <code className="font-[family-name:var(--font-jetbrains)]">device_tokens</code> table).
            </li>
            <li>
              In the console go to{' '}
              <span className="text-slate-100">Messaging → Create your first campaign → Firebase Notification messages → Send test message</span>,
              paste the token, and send.
            </li>
            <li>
              This validates the Android/iOS client config (
              <code className="font-[family-name:var(--font-jetbrains)]">google-services.json</code>,
              APNs key) independently of the server env vars.
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
            B) Direct HTTP v1 call (mirrors the server)
          </h3>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
            Mint an OAuth access token from the service account, then POST the
            same envelope <code className="font-[family-name:var(--font-jetbrains)]">sendPush()</code>{' '}
            uses. The quickest way to get an access token locally is the gcloud
            CLI pointed at the service-account JSON.
          </p>
          <CodeBlock
            language="bash"
            title="send_test_push.sh"
            code={'# 1. Access token from the service account\n' +
              'export GOOGLE_APPLICATION_CREDENTIALS=./service-account.json\n' +
              'ACCESS_TOKEN=$(gcloud auth application-default print-access-token)\n' +
              '\n' +
              '# 2. Send — same shape as sendPush() in push.ts\n' +
              'curl -X POST \\\n' +
              '  "https://fcm.googleapis.com/v1/projects/$FCM_PROJECT_ID/messages:send" \\\n' +
              '  -H "Authorization: Bearer $ACCESS_TOKEN" \\\n' +
              '  -H "Content-Type: application/json" \\\n' +
              `  -d '{
    "message": {
      "token": "<DEVICE_FCM_TOKEN>",
      "notification": { "title": "Test", "body": "Hello from FCM HTTP v1" },
      "data": { "orderId": "test", "screen": "orders" },
      "android": { "notification": { "sound": "default", "priority": "HIGH" } },
      "apns": { "payload": { "aps": { "sound": "default", "badge": 1 } } }
    }
  }'`}
          />
        </div>

        <Callout tone="info" title="End-to-end check through the app">
          <p>
            With the <code className="font-[family-name:var(--font-jetbrains)]">FCM_*</code> env
            vars set, the simplest full-stack test is to register a real device
            token via{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">POST /api/mobile/push</code>{' '}
            while signed in, then place a COD order through{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">POST /api/orders</code> —
            the &quot;Order Confirmed&quot; push should arrive within a second or
            two. See the{' '}
            <Link
              href="/docs/customer-app"
              className="text-emerald-400 underline-offset-4 hover:underline"
            >
              Customer App
            </Link>{' '}
            guide for the order-creation contract.
          </p>
        </Callout>
      </section>
    </div>
  )
}
