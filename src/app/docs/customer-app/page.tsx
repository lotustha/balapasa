import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ShoppingBag,
  Search,
  CreditCard,
  PackageCheck,
  Repeat,
  Heart,
  Bell,
  Info,
  AlertTriangle,
} from 'lucide-react'
import EndpointCard from '../components/EndpointCard'
import CodeBlock from '../components/CodeBlock'
import ParamTable from '../components/ParamTable'

export const metadata: Metadata = {
  title: 'Customer App — Balapasa Platform API',
  description:
    'Build the Balapasa customer app: browse the catalog, place and track orders, pay with COD/eSewa/Khalti, manage subscriptions and wishlist, and register for push notifications.',
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

export default function CustomerAppPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section>
        <p className="mb-3 font-[family-name:var(--font-jetbrains)] text-sm font-medium uppercase tracking-wide text-emerald-400">
          Customer App
        </p>
        <h1 className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          <ShoppingBag className="h-8 w-8 text-emerald-400" />
          Shopping &amp; Orders
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          Everything a customer client needs: discover products, build a cart,
          check out with Cash on Delivery, eSewa, or Khalti, follow the order to
          the doorstep, and keep coming back through subscriptions, a wishlist,
          and push notifications.
        </p>
      </section>

      {/* Customer journey */}
      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-slate-100">
          The customer journey
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {([
            ['Authenticate', 'Sign in or register to receive a JWT.', 'text-emerald-400'],
            ['Browse & search', 'List, filter, and open product detail pages.', 'text-sky-400'],
            ['Place an order', 'Submit the cart with a payment method.', 'text-emerald-400'],
            ['Pay (if online)', 'Hand off to eSewa or Khalti, then verify.', 'text-amber-400'],
            ['Track delivery', 'Poll order status and carrier updates.', 'text-sky-400'],
            ['Re-engage', 'Subscriptions, wishlist, reviews, push.', 'text-emerald-400'],
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

      {/* ── Authentication ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading id="auth" icon={ShoppingBag}>
          Authentication
        </SectionHeading>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          The customer app authenticates with a bearer JWT. Call the mobile auth
          endpoint with email and password, store the returned{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">token</code>,
          and send it as{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            Authorization: Bearer &lt;jwt&gt;
          </code>{' '}
          on subsequent requests. See{' '}
          <Link
            href="/docs/getting-started#auth"
            className="text-emerald-400 underline-offset-4 hover:underline"
          >
            Authentication
          </Link>{' '}
          for token lifetime and the registration flow.
        </p>

        <EndpointCard
          method="POST"
          path="/api/mobile/auth"
          auth="Public"
          title="Log in (email + password)"
        >
          <p className="mb-3">
            Returns a signed JWT in the response body plus the authenticated
            user. The same token is also set as an{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">auth-token</code>{' '}
            httpOnly cookie for web clients.
          </p>
          <ParamTable
            rows={[
              { name: 'email', type: 'string', required: true, desc: 'Account email address.' },
              { name: 'password', type: 'string', required: true, desc: 'Account password.' },
            ]}
          />
          <p className="mb-2 mt-4 text-slate-400">Response <code className="font-[family-name:var(--font-jetbrains)]">200</code></p>
          <CodeBlock
            language="json"
            code={`{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx...",
    "email": "asha@example.com",
    "name": "Asha Thapa",
    "role": "CUSTOMER",
    "phone": "98XXXXXXXX"
  }
}`}
          />
        </EndpointCard>

        <Callout tone="warning" title="Cookie vs. bearer — know which endpoints read which">
          <p className="mb-2">
            The JWT is identical either way, but not every customer endpoint
            reads the bearer header yet. As of today:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <span className="text-slate-100">Bearer header or cookie:</span>{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">/api/wishlist</code>,{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">/api/mobile/push</code>.
            </li>
            <li>
              <span className="text-slate-100">Cookie only</span> (
              <code className="font-[family-name:var(--font-jetbrains)]">auth-token</code>): orders,
              account profile/addresses, subscriptions, and reviews read the JWT
              from the cookie via{' '}
              <code className="font-[family-name:var(--font-jetbrains)]">getCurrentUser()</code>.
            </li>
          </ul>
          <p className="mt-2">
            Mobile clients should therefore send the JWT as a{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">Cookie: auth-token=&lt;jwt&gt;</code>{' '}
            header on those routes (the login response sets it for you), or send
            both the bearer and the cookie. The samples below show the bearer
            header as the canonical mobile contract.
          </p>
        </Callout>
      </section>

      {/* ── Browse & search ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading id="browse" icon={Search}>
          Browse &amp; search products
        </SectionHeading>

        <EndpointCard
          method="GET"
          path="/api/products"
          auth="Public"
          title="List, filter, search, and paginate"
        >
          <p className="mb-3">
            The catalog endpoint. Without filters it returns active products,
            newest first, 24 per page. Sale prices that are expired or scheduled
            for the future are masked to{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">null</code>{' '}
            in the response.
          </p>
          <ParamTable
            rows={[
              { name: 'search', type: 'string', desc: 'Matches name, description, brand, SKU, or tags (case-insensitive).' },
              { name: 'category', type: 'string', desc: 'Filter by category slug.' },
              { name: 'featured', type: '"true"', desc: 'Only featured products.' },
              { name: 'flash', type: '"true"', desc: 'Only products with a currently-live sale price.' },
              { name: 'sort', type: 'string', desc: 'newest | price-asc | price-desc | name-asc | name-desc | rating. Default newest.' },
              { name: 'page', type: 'number', desc: 'Page number, 1-based. Default 1.' },
              { name: 'limit', type: 'number', desc: 'Items per page. Default 24.' },
              { name: 'slugs', type: 'string', desc: 'Comma-separated slugs (max 12) for a "recently viewed" lookup; bypasses other filters.' },
            ]}
          />
          <p className="mb-2 mt-4 text-slate-400">Response <code className="font-[family-name:var(--font-jetbrains)]">200</code></p>
          <CodeBlock
            language="json"
            code={`{
  "products": [
    {
      "id": "clx...",
      "name": "Vitamin C Serum 30ml",
      "slug": "vitamin-c-serum",
      "price": 1800,
      "salePrice": null,
      "images": ["https://.../serum.jpg"],
      "rating": 4.8,
      "reviewCount": 445,
      "stock": 25,
      "category": { "name": "Skincare", "slug": "skincare" }
    }
  ],
  "total": 132,
  "page": 1,
  "totalPages": 6
}`}
          />
        </EndpointCard>

        <EndpointCard
          method="GET"
          path="/api/products/slug/{slug}"
          auth="Public"
          title="Product detail by slug"
        >
          <p>
            Returns a single product with its{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">category</code>,{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">supplier</code>,{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">options</code>,{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">variants</code>, and any
            subscription{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">plan</code>. Responds{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">404</code> when the slug is unknown. Use this
            to render the product page after a tap from the list.
          </p>
        </EndpointCard>

        <EndpointCard
          method="GET"
          path="/api/products/trending"
          auth="Public"
          title="Trending products"
        >
          <p>
            Returns the top 5 products ranked by a multi-signal score (7- and
            30-day sales velocity, Bayesian conversion rate, rating, views,
            recency, and active deals). The payload includes a{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">source</code> field
            (<code className="font-[family-name:var(--font-jetbrains)]">&quot;live&quot;</code> or{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">&quot;mock&quot;</code>) so you can tell when
            the DB fallback is serving sample data.
          </p>
        </EndpointCard>

        <EndpointCard
          method="POST"
          path="/api/products/cart-flags"
          auth="Public"
          title="Pre-checkout cart validation"
        >
          <p className="mb-3">
            Batch lookup used right before checkout to confirm cart items are
            still purchasable and to learn which qualify for free delivery / VAT.
            Send the product IDs in the cart; you get back three maps keyed by
            product ID.
          </p>
          <ParamTable
            rows={[
              { name: 'ids', type: 'string[]', required: true, desc: 'Product IDs currently in the cart.' },
            ]}
          />
          <p className="mb-2 mt-4 text-slate-400">Response <code className="font-[family-name:var(--font-jetbrains)]">200</code></p>
          <CodeBlock
            language="json"
            code={`{
  "flags":   { "clx...": true },   // freeDelivery
  "taxable": { "clx...": false },  // isTaxable
  "validity": {
    "clx...": { "active": true, "stock": 12, "trackInventory": true, "name": "Vitamin C Serum 30ml" }
  }
}`}
          />
        </EndpointCard>
      </section>

      {/* ── Place an order & pay ───────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading id="orders" icon={CreditCard}>
          Place an order &amp; pay
        </SectionHeading>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          A single endpoint creates the order, atomically decrements stock,
          applies any coupon or gift card server-side, and — depending on the
          payment method — returns the data you need to complete payment. Never
          trust a client-computed total: the server recomputes it from the cart.
        </p>

        <EndpointCard
          method="POST"
          path="/api/orders"
          auth="Cookie (optional — guest checkout allowed)"
          title="Create an order"
        >
          <p className="mb-3">
            Works for both signed-in and guest customers. When the
            request carries the auth cookie the order is linked to that user.
            The response shape depends on{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">paymentMethod</code>.
          </p>
          <ParamTable
            rows={[
              { name: 'items', type: 'CartItem[]', required: true, desc: 'Each: { id, name, price, salePrice?, image, quantity }.' },
              { name: 'subtotal', type: 'number', required: true, desc: 'Cart subtotal (server re-validates the total).' },
              { name: 'deliveryCharge', type: 'number', required: true, desc: 'Quoted delivery cost.' },
              { name: 'paymentMethod', type: 'string', required: true, desc: 'COD | PARTIAL_COD | ESEWA | KHALTI. Disabled methods are rejected with 400.' },
              { name: 'name', type: 'string', required: true, desc: 'Recipient name.' },
              { name: 'phone', type: 'string', required: true, desc: 'Recipient phone.' },
              { name: 'address', type: 'string', required: true, desc: 'Delivery address line.' },
              { name: 'email', type: 'string', desc: 'For the confirmation email; falls back to the signed-in user.' },
              { name: 'city', type: 'string', desc: 'City; structured Nepal fields (province, district, municipality, ward, street, tole) refine carrier routing.' },
              { name: 'shippingProvider', type: 'string', desc: 'e.g. PICKNDROP — triggers carrier dispatch.' },
              { name: 'couponCode', type: 'string', desc: 'Re-validated and discount recomputed server-side.' },
              { name: 'giftCardCode', type: 'string', desc: 'Re-validated; balance decremented atomically.' },
              { name: 'deliveryNote', type: 'string', desc: 'Optional note for the rider (max 500 chars).' },
            ]}
          />
          <p className="mb-2 mt-4 text-slate-400">
            Response for COD <code className="font-[family-name:var(--font-jetbrains)]">201</code>
          </p>
          <CodeBlock
            language="json"
            code={`{ "orderId": "clx...", "orderCode": "VCS-1042", "status": "success", "magicLinkToken": null }`}
          />
          <p className="mb-2 mt-4 text-slate-400">
            Response for eSewa — build an auto-submitting form to{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">esewaUrl</code> with{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">esewaData</code> fields
          </p>
          <CodeBlock
            language="json"
            code={`{
  "orderId": "clx...",
  "orderCode": "VCS-1042",
  "esewaUrl": "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
  "esewaData": { "amount": "1980", "signature": "...", "...": "..." }
}`}
          />
          <p className="mb-2 mt-4 text-slate-400">
            Response for Khalti — redirect to{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">paymentUrl</code> (web) or use{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">pidx</code> with the Khalti SDK (mobile)
          </p>
          <CodeBlock
            language="json"
            code={`{ "orderId": "clx...", "orderCode": "VCS-1042", "paymentUrl": "https://pay.khalti.com/?pidx=...", "pidx": "..." }`}
          />
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Errors: <code className="font-[family-name:var(--font-jetbrains)]">400</code> disabled payment
            method or per-customer sale cap exceeded;{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">409</code> stock / coupon / gift-card
            race (out of stock, coupon used up, or gift-card balance changed mid-checkout);{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">502</code> Khalti initiation failed.
          </p>
        </EndpointCard>

        <div className="grid gap-3 sm:grid-cols-3">
          {([
            ['COD', 'text-emerald-400', 'Cash on Delivery. The order is final on 201 — no payment step. PARTIAL_COD pays an advance online and the rest in cash.'],
            ['eSewa', 'text-sky-400', 'POST returns esewaUrl + esewaData. Submit a form to esewaUrl; eSewa redirects back to /checkout/verify for confirmation.'],
            ['Khalti', 'text-amber-400', 'POST returns paymentUrl (web) and pidx (mobile SDK v3). After payment, verification flips the order to paid.'],
          ] as const).map(([m, color, desc]) => (
            <div key={m} className="rounded-lg bg-slate-800/40 p-4 ring-1 ring-slate-700/60">
              <span className={`font-[family-name:var(--font-jetbrains)] text-sm font-semibold ${color}`}>
                {m}
              </span>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{desc}</p>
            </div>
          ))}
        </div>

        <Callout tone="info" title="Payment verification closes the loop">
          <p>
            For eSewa and Khalti, the gateway redirects back to{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">/checkout/verify</code>, which validates
            the transaction and marks the order paid (firing a &quot;payment
            confirmed&quot; push). Mobile clients open the gateway in a web view /
            SDK and listen for that callback URL, then refresh the order via the
            tracking endpoint below.
          </p>
        </Callout>

        {/* Walkthrough: eSewa */}
        <div className="space-y-3">
          <h3 className="font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
            Walkthrough — place an order with eSewa
          </h3>
          <CodeBlock
            language="dart"
            title="order_with_esewa.dart"
            code={`final res = await http.post(
  Uri.parse('\$baseUrl/api/orders'),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer \$jwt',
    'Cookie': 'auth-token=\$jwt', // orders reads the JWT from the cookie
  },
  body: jsonEncode({
    'items': [
      {'id': 'clx...', 'name': 'Vitamin C Serum 30ml',
       'price': 1800, 'image': 'https://.../serum.jpg', 'quantity': 1},
    ],
    'subtotal': 1800,
    'deliveryCharge': 180,
    'paymentMethod': 'ESEWA',
    'name': 'Asha Thapa',
    'phone': '98XXXXXXXX',
    'address': 'Jhamsikhel, Lalitpur',
    'city': 'Lalitpur',
  }),
);

final data = jsonDecode(res.body);
// Build an auto-submitting form POST to data['esewaUrl'] with data['esewaData'],
// open it in a WebView, and wait for the redirect to /checkout/verify.
openEsewaForm(data['esewaUrl'], data['esewaData']);`}
          />
        </div>

        {/* Walkthrough: COD */}
        <div className="space-y-3">
          <h3 className="font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
            Walkthrough — one-tap Cash on Delivery
          </h3>
          <CodeBlock
            language="typescript"
            title="placeCodOrder.ts"
            code={`const res = await fetch(\`\${baseUrl}/api/orders\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: \`Bearer \${jwt}\`,
    Cookie: \`auth-token=\${jwt}\`,
  },
  body: JSON.stringify({
    items: [{ id, name, price, image, quantity: 1 }],
    subtotal: price,
    deliveryCharge: 180,
    paymentMethod: 'COD',
    name, phone, address, city,
  }),
})

const { orderId, orderCode } = await res.json()
// COD is final immediately — show the confirmation with orderCode.`}
          />
        </div>
      </section>

      {/* ── Order history & tracking ───────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading id="tracking" icon={PackageCheck}>
          Order history &amp; tracking
        </SectionHeading>

        <EndpointCard
          method="GET"
          path="/api/orders"
          auth="Cookie (auth-token)"
          title="The signed-in customer's orders"
        >
          <p>
            Returns every order belonging to the authenticated user, newest
            first, each with its line items. Responds{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">401</code> without a valid session.
          </p>
        </EndpointCard>

        <EndpointCard
          method="GET"
          path="/api/orders/track"
          auth="Public"
          title="Track a single order"
        >
          <p className="mb-3">
            Looks up one order plus live carrier status. Pass{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">id</code> (full or
            partial order ID / carrier tracking ID) and optionally{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">phone</code> to scope
            the match. A phone-only query returns that number&apos;s most recent order.
          </p>
          <ParamTable
            rows={[
              { name: 'id', type: 'string', desc: 'Order ID or carrier tracking ID (partial match, case-insensitive). Required unless phone is given.' },
              { name: 'phone', type: 'string', desc: 'Recipient phone; narrows an id match or, alone, returns the latest order.' },
            ]}
          />
          <p className="mb-2 mt-4 text-slate-400">Response <code className="font-[family-name:var(--font-jetbrains)]">200</code></p>
          <CodeBlock
            language="json"
            code={`{
  "order": {
    "id": "clx...",
    "status": "SHIPPED",
    "total": 1980,
    "items": [ { "name": "Vitamin C Serum 30ml", "quantity": 1, "price": 1800 } ]
  },
  "carrier": { "status": "In transit", "...": "..." }
}`}
          />
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Errors: <code className="font-[family-name:var(--font-jetbrains)]">400</code> neither id nor phone;{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">404</code> not found;{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">503</code> database unavailable.
          </p>
        </EndpointCard>
      </section>

      {/* ── Account ────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading id="account" icon={ShoppingBag}>
          Account &amp; addresses
        </SectionHeading>

        <EndpointCard method="GET" path="/api/account/profile" auth="Cookie (auth-token)" title="Get profile">
          <p>
            Returns the current user&apos;s{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">id, name, email, phone, avatar, role, createdAt</code>.
            Email and role are read-only.
          </p>
        </EndpointCard>

        <EndpointCard method="PATCH" path="/api/account/profile" auth="Cookie (auth-token)" title="Update profile">
          <ParamTable
            rows={[
              { name: 'name', type: 'string', desc: 'Display name (empty string clears it).' },
              { name: 'phone', type: 'string', desc: 'Contact phone.' },
              { name: 'avatar', type: 'string', desc: 'Avatar image URL.' },
            ]}
          />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/account/addresses" auth="Cookie (auth-token)" title="List saved addresses">
          <p>Returns the user&apos;s addresses, default first.</p>
        </EndpointCard>

        <EndpointCard method="POST" path="/api/account/addresses" auth="Cookie (auth-token)" title="Add an address">
          <p className="mb-3">
            The first address saved automatically becomes the default; passing{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">isDefault: true</code>{' '}
            promotes any address and demotes the rest.
          </p>
          <ParamTable
            rows={[
              { name: 'name', type: 'string', required: true, desc: 'Recipient name.' },
              { name: 'phone', type: 'string', required: true, desc: 'Recipient phone.' },
              { name: 'address', type: 'string', required: true, desc: 'Address line.' },
              { name: 'label', type: 'string', desc: 'e.g. Home, Work. Defaults to "Home".' },
              { name: 'city', type: 'string', desc: 'Defaults to "Kathmandu".' },
              { name: 'province / district / municipality / ward / street / tole / landmark', type: 'string', desc: 'Structured Nepal address fields for carrier routing.' },
              { name: 'lat / lng', type: 'number', desc: 'Map coordinates.' },
              { name: 'isDefault', type: 'boolean', desc: 'Make this the default address.' },
            ]}
          />
        </EndpointCard>
      </section>

      {/* ── Subscriptions ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading id="subscriptions" icon={Repeat}>
          Subscriptions
        </SectionHeading>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Plan-based recurring subscriptions. Trial plans start immediately with
          no charge; paid plans are created in{' '}
          <code className="font-[family-name:var(--font-jetbrains)]">PAST_DUE</code> alongside an open invoice
          and become{' '}
          <code className="font-[family-name:var(--font-jetbrains)]">ACTIVE</code> once that invoice is paid.
          Subscriptions are prepaid — COD does not apply.
        </p>

        <EndpointCard method="GET" path="/api/subscriptions" auth="Cookie (auth-token)" title="List my subscriptions">
          <p>
            Returns the signed-in user&apos;s subscriptions (newest first), each
            with its <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">plan</code>.
          </p>
        </EndpointCard>

        <EndpointCard method="POST" path="/api/subscriptions" auth="Cookie (auth-token)" title="Subscribe to a plan">
          <ParamTable
            rows={[
              { name: 'planId', type: 'string', required: true, desc: 'The plan to subscribe to (must be active).' },
            ]}
          />
          <p className="mb-2 mt-4 text-slate-400">Response <code className="font-[family-name:var(--font-jetbrains)]">201</code></p>
          <CodeBlock
            language="json"
            code={`// Trial plan — starts immediately, no payment:
{ "subscription": { "id": "...", "status": "TRIALING" }, "requiresPayment": false }

// Paid plan — pay the open invoice next:
{ "subscription": { "id": "...", "status": "PAST_DUE" }, "invoiceId": "...", "requiresPayment": true }`}
          />
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Errors: <code className="font-[family-name:var(--font-jetbrains)]">404</code> plan not found /
            inactive; <code className="font-[family-name:var(--font-jetbrains)]">409</code> you already have a
            live subscription to this plan.
          </p>
        </EndpointCard>

        <EndpointCard method="POST" path="/api/subscriptions/{id}/pay" auth="Cookie (auth-token)" title="Pay the open invoice">
          <p className="mb-3">
            Initiates online payment for the subscription&apos;s open invoice.
            eSewa and Khalti only.
          </p>
          <ParamTable
            rows={[
              { name: 'method', type: '"esewa" | "khalti"', required: true, desc: 'Payment gateway to use.' },
            ]}
          />
          <p className="mb-2 mt-4 text-slate-400">Response <code className="font-[family-name:var(--font-jetbrains)]">200</code></p>
          <CodeBlock
            language="json"
            code={`// eSewa — build an auto-submitting form to action with fields:
{ "method": "esewa", "action": "https://rc-epay.esewa.com.np/...", "fields": { "...": "..." } }

// Khalti — redirect / open the payment_url:
{ "method": "khalti", "payment_url": "https://pay.khalti.com/?pidx=..." }`}
          />
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            The gateway returns to{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">/checkout/verify?...&amp;type=subscription</code>,
            which marks the invoice paid and activates the subscription.
          </p>
        </EndpointCard>

        <EndpointCard method="PATCH" path="/api/subscriptions/{id}" auth="Cookie (auth-token)" title="Cancel or resume">
          <p className="mb-3">
            Ownership is enforced — you can only modify your own subscriptions.
          </p>
          <ParamTable
            rows={[
              { name: 'action', type: '"cancel" | "resume"', required: true, desc: 'cancel stops it immediately; resume reactivates a cancelled or paused subscription.' },
            ]}
          />
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Errors: <code className="font-[family-name:var(--font-jetbrains)]">404</code> not found / not
            yours; <code className="font-[family-name:var(--font-jetbrains)]">409</code> already cancelled, or
            resuming something that isn&apos;t cancelled/paused.
          </p>
        </EndpointCard>
      </section>

      {/* ── Reviews ────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading id="reviews" icon={Heart}>
          Reviews
        </SectionHeading>

        <EndpointCard method="POST" path="/api/reviews" auth="Cookie (auth-token)" title="Rate & review a product">
          <p className="mb-3">
            Upserts the user&apos;s review for a product (one per user per
            product) and recomputes the product&apos;s average rating and review
            count.
          </p>
          <ParamTable
            rows={[
              { name: 'productId', type: 'string', required: true, desc: 'Product being reviewed.' },
              { name: 'rating', type: 'number', required: true, desc: 'Integer 1–5.' },
              { name: 'comment', type: 'string', desc: 'Optional review text.' },
            ]}
          />
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Errors: <code className="font-[family-name:var(--font-jetbrains)]">400</code> missing/out-of-range
            rating; <code className="font-[family-name:var(--font-jetbrains)]">401</code> not signed in.
          </p>
        </EndpointCard>
      </section>

      {/* ── Wishlist ───────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading id="wishlist" icon={Heart}>
          Wishlist
        </SectionHeading>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          The wishlist endpoints accept the JWT as a bearer header{' '}
          <em>or</em> the auth cookie — convenient for mobile.
        </p>

        <EndpointCard method="GET" path="/api/wishlist" auth="Bearer or Cookie" title="List wishlist">
          <p>
            Returns the full active product objects on the user&apos;s wishlist,
            newest first, under a{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">wishlist</code> array.
          </p>
        </EndpointCard>

        <EndpointCard method="POST" path="/api/wishlist" auth="Bearer or Cookie" title="Toggle an item">
          <p className="mb-3">
            Adds the product if absent, removes it if present. The response tells
            you the resulting state.
          </p>
          <ParamTable
            rows={[
              { name: 'productId', type: 'string', required: true, desc: 'Product to toggle.' },
            ]}
          />
          <p className="mb-2 mt-4 text-slate-400">Response <code className="font-[family-name:var(--font-jetbrains)]">200</code></p>
          <CodeBlock language="json" code={`{ "wishlisted": true }  // or false after removal`} />
        </EndpointCard>

        <EndpointCard method="DELETE" path="/api/wishlist?productId={id}" auth="Bearer or Cookie" title="Remove explicitly">
          <p>
            Removes the given product from the wishlist regardless of current
            state. Returns{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">{`{ "removed": true }`}</code>.
          </p>
        </EndpointCard>
      </section>

      {/* ── Push notifications ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading id="push" icon={Bell}>
          Push notifications (FCM)
        </SectionHeading>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Register the device&apos;s FCM token after login so the customer
          receives order, payment, and delivery updates. See{' '}
          <Link
            href="/docs/notifications"
            className="text-emerald-400 underline-offset-4 hover:underline"
          >
            Push Notifications (FCM)
          </Link>{' '}
          for the full event list and payload shape.
        </p>

        <EndpointCard method="POST" path="/api/mobile/push" auth="Bearer or Cookie" title="Register / refresh a device token">
          <p className="mb-3">
            Upserts the FCM token, linking it to the authenticated user. Call
            this on login and whenever FCM rotates the token. Anonymous
            registration (no auth) is accepted but the token won&apos;t be
            targeted by user-scoped pushes.
          </p>
          <ParamTable
            rows={[
              { name: 'token', type: 'string', required: true, desc: 'FCM registration token from the device.' },
              { name: 'platform', type: '"android" | "ios"', desc: 'Defaults to "android".' },
            ]}
          />
          <p className="mb-2 mt-4 text-slate-400">Response <code className="font-[family-name:var(--font-jetbrains)]">200</code></p>
          <CodeBlock language="json" code={`{ "registered": true }`} />
        </EndpointCard>

        <EndpointCard method="DELETE" path="/api/mobile/push" auth="Bearer or Cookie" title="Unregister on logout">
          <p className="mb-3">Removes the token so the device stops receiving pushes.</p>
          <ParamTable
            rows={[
              { name: 'token', type: 'string', required: true, desc: 'The FCM token to remove.' },
            ]}
          />
          <p className="mb-2 mt-4 text-slate-400">Response <code className="font-[family-name:var(--font-jetbrains)]">200</code></p>
          <CodeBlock language="json" code={`{ "removed": true }`} />
        </EndpointCard>

        <div className="space-y-3">
          <h3 className="font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
            Walkthrough — register for push after login
          </h3>
          <CodeBlock
            language="dart"
            title="register_push.dart"
            code={`final fcmToken = await FirebaseMessaging.instance.getToken();

await http.post(
  Uri.parse('\$baseUrl/api/mobile/push'),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer \$jwt',
  },
  body: jsonEncode({ 'token': fcmToken, 'platform': 'android' }),
);
// → { "registered": true }`}
          />
        </div>

        <Callout tone="warning" title="Push delivery caveats">
          <p>
            Pushes silently no-op until the{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">FCM_PROJECT_ID</code>,{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">FCM_CLIENT_EMAIL</code>, and{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">FCM_PRIVATE_KEY</code> service-account
            env vars are configured. Pushes target a user&apos;s registered tokens,
            so an order placed as a guest (no linked user) won&apos;t send one.
          </p>
        </Callout>
      </section>
    </div>
  )
}
