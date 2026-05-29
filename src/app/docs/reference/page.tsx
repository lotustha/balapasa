import type { Metadata } from 'next'
import Link from 'next/link'
import EndpointCard from '../components/EndpointCard'
import ParamTable from '../components/ParamTable'
import CodeBlock from '../components/CodeBlock'

export const metadata: Metadata = {
  title: 'API Reference — Balapasa',
  description:
    'Complete REST API reference for the Balapasa commerce platform: auth, account, products, orders, payments, subscriptions, promotions, shipping, admin, mobile, cron, and webhooks.',
}

// ── In-page section index ──────────────────────────────────────────────────
const SECTIONS: { id: string; label: string }[] = [
  { id: 'auth', label: 'Auth' },
  { id: 'account', label: 'Account' },
  { id: 'products', label: 'Products' },
  { id: 'orders', label: 'Orders' },
  { id: 'payments', label: 'Payments' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'shipping', label: 'Shipping & Delivery' },
  { id: 'admin', label: 'Admin' },
  { id: 'mobile', label: 'Mobile & Public' },
  { id: 'cron', label: 'Cron' },
  { id: 'webhooks', label: 'Webhooks' },
]

function SectionHeading({ id, title, blurb }: { id: string; title: string; blurb: string }) {
  return (
    <div className="scroll-mt-24 border-b border-slate-700/60 pb-3" id={id}>
      <h2 className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold text-slate-100">
        {title}
      </h2>
      <p className="mt-1.5 text-sm text-slate-400">{blurb}</p>
    </div>
  )
}

export default function ReferencePage() {
  return (
    <div className="mx-auto max-w-4xl px-1 py-2">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-700/60 pb-8">
        <p className="font-[family-name:var(--font-jetbrains)] text-xs font-semibold uppercase tracking-widest text-emerald-400">
          Reference
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-jetbrains)] text-4xl font-bold text-slate-100">
          API Reference
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
          Every HTTP endpoint exposed by the Balapasa platform, grouped by area. Each card lists the
          method, path, who can call it, the request shape, and a representative response. All bodies are
          JSON unless noted; all paths are relative to your store origin.
        </p>

        {/* Auth-model callout */}
        <div className="mt-6 rounded-lg bg-sky-500/10 px-4 py-3 text-sm text-sky-200 ring-1 ring-inset ring-sky-500/25">
          <p className="font-semibold text-sky-100">Two auth transports, one token</p>
          <p className="mt-1 leading-relaxed text-sky-200/90">
            The platform issues a single HS256 JWT (payload{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">{'{ sub, email, role, name? }'}</code>
            ). Mobile clients send it as{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">Authorization: Bearer &lt;jwt&gt;</code>.
            The web app stores the same token in an httpOnly{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">auth-token</code> cookie. Most
            customer endpoints read the cookie only — the Bearer header is accepted on{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">/api/wishlist</code>,{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">/api/mobile/push</code>, and the
            mobile auth routes. Roles rank CUSTOMER &lt; STAFF &lt; MANAGER &lt; ADMIN.
          </p>
        </div>

        {/* In-page TOC */}
        <nav aria-label="Sections" className="mt-6 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="inline-flex items-center rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-300 ring-1 ring-inset ring-slate-700/60 transition-colors duration-200 hover:bg-slate-700 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </header>

      {/* ══════════════════════════════ AUTH ══════════════════════════════ */}
      <section className="mt-12 space-y-6">
        <SectionHeading
          id="auth"
          title="Auth"
          blurb="Sign up, sign in, sessions, magic links, and email verification. Mobile routes return the JWT in the body; web routes set the auth-token cookie."
        />

        <EndpointCard method="POST" path="/api/auth/login" auth="Public" title="Email + password login (web)">
          <p className="mb-3">Validates credentials and sets the httpOnly cookie. Returns role and name only.</p>
          <ParamTable
            rows={[
              { name: 'email', type: 'string', required: true, desc: 'Account email' },
              { name: 'password', type: 'string', required: true, desc: 'Plain password (bcrypt-compared server-side)' },
            ]}
          />
          <div className="mt-4 grid gap-3">
            <CodeBlock title="Request" language="json" code={`{ "email": "asha@example.com", "password": "hunter2pass" }`} />
            <CodeBlock title="200 OK" language="json" code={`{ "role": "CUSTOMER", "name": "Asha" }`} />
            <CodeBlock title="401" language="json" code={`{ "error": "Invalid credentials" }`} />
          </div>
        </EndpointCard>

        <EndpointCard method="POST" path="/api/auth/register" auth="Public" title="Create a customer account (web)">
          <p className="mb-3">
            Creates a CUSTOMER profile, sets the cookie, and fires welcome + email-verification emails
            (non-fatal). Password must be 8+ characters.
          </p>
          <ParamTable
            rows={[
              { name: 'email', type: 'string', required: true, desc: 'Unique email' },
              { name: 'password', type: 'string', required: true, desc: 'Minimum 8 characters' },
              { name: 'name', type: 'string', required: false, desc: 'Display name' },
              { name: 'phone', type: 'string', required: false, desc: 'Contact number' },
            ]}
          />
          <div className="mt-4 grid gap-3">
            <CodeBlock title="Request" language="json" code={`{ "email": "asha@example.com", "password": "hunter2pass", "name": "Asha", "phone": "9800000000" }`} />
            <CodeBlock title="200 OK" language="json" code={`{ "success": true }`} />
            <CodeBlock title="409" language="json" code={`{ "error": "Email already registered" }`} />
          </div>
        </EndpointCard>

        <EndpointCard method="POST" path="/api/auth/logout" auth="Public" title="Clear the session cookie" />

        <EndpointCard method="GET" path="/api/auth/me" auth="Cookie" title="Current session role">
          <p className="mb-3">Reads the cookie. Returns {`{ role: null }`} when unauthenticated — never errors.</p>
          <CodeBlock title="200 OK" language="json" code={`{ "role": "CUSTOMER", "name": "Asha" }`} />
        </EndpointCard>

        <EndpointCard method="POST" path="/api/auth/magic-link/request" auth="Public" title="Email a login magic link">
          <p className="mb-3">
            Always returns success even for unknown addresses (anti-enumeration). The link is emailed only
            if the address has a profile.
          </p>
          <ParamTable rows={[{ name: 'email', type: 'string', required: true, desc: 'Where to send the login link' }]} />
          <div className="mt-4 grid gap-3">
            <CodeBlock title="Request" language="json" code={`{ "email": "asha@example.com" }`} />
            <CodeBlock title="200 OK" language="json" code={`{ "success": true }`} />
          </div>
        </EndpointCard>

        <EndpointCard method="GET" path="/api/auth/magic-link/verify?token=…" auth="Public" title="Consume a login magic link">
          <p>Validates the token, signs the user in (sets the cookie), and redirects. Tokens are single-use.</p>
        </EndpointCard>

        <EndpointCard method="GET" path="/api/auth/verify-email?token=…" auth="Public" title="Confirm an email address">
          <p>Marks the profile email verified from the link sent at registration, then redirects.</p>
        </EndpointCard>

        <EndpointCard method="POST" path="/api/auth/setup-password" auth="Public" title="Set a password from an invite/claim token">
          <p className="mb-3">Used by guest-claim and team-invite flows to attach a password to a passwordless profile.</p>
          <ParamTable
            rows={[
              { name: 'token', type: 'string', required: true, desc: 'Setup/claim token from the email link' },
              { name: 'password', type: 'string', required: true, desc: 'New password, 8+ characters' },
            ]}
          />
        </EndpointCard>

        <EndpointCard method="POST" path="/api/mobile/auth" auth="Public" title="Mobile login → token + user">
          <p className="mb-3">
            Same credential check as web login, but returns the JWT in the body (and also sets the cookie).
            Mobile clients store <code className="font-[family-name:var(--font-jetbrains)]">token</code> and
            send it as a Bearer header on every request.
          </p>
          <ParamTable
            rows={[
              { name: 'email', type: 'string', required: true, desc: 'Account email' },
              { name: 'password', type: 'string', required: true, desc: 'Plain password' },
            ]}
          />
          <div className="mt-4 grid gap-3">
            <CodeBlock title="Request" language="json" code={`{ "email": "asha@example.com", "password": "hunter2pass" }`} />
            <CodeBlock
              title="200 OK"
              language="json"
              code={`{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "clx0…",
    "email": "asha@example.com",
    "name": "Asha",
    "role": "CUSTOMER",
    "phone": "9800000000"
  }
}`}
            />
          </div>
        </EndpointCard>

        <EndpointCard method="POST" path="/api/mobile/register" auth="Public" title="Mobile sign-up → token + user">
          <p className="mb-3">Creates a CUSTOMER and immediately returns a usable token. Same body as web register.</p>
          <ParamTable
            rows={[
              { name: 'email', type: 'string', required: true, desc: 'Unique email' },
              { name: 'password', type: 'string', required: true, desc: 'Minimum 8 characters' },
              { name: 'name', type: 'string', required: false, desc: 'Display name' },
              { name: 'phone', type: 'string', required: false, desc: 'Contact number' },
            ]}
          />
          <CodeBlock
            title="200 OK"
            language="json"
            code={`{ "token": "eyJ…", "user": { "id": "clx0…", "email": "asha@example.com", "name": "Asha", "role": "CUSTOMER", "phone": "9800000000" } }`}
          />
        </EndpointCard>

        <EndpointCard method="POST" path="/api/mobile/refresh" auth="Bearer / Cookie" title="Refresh session token (sliding 7-day)">
          <p className="mb-3">Exchanges a still-valid token for a fresh 7-day one. Re-reads the profile so the new token reflects role/name changes. Returns 401 once the token has expired (re-login required). No separate refresh-token.</p>
          <CodeBlock
            title="200 OK"
            language="json"
            code={`{ "token": "eyJ…", "user": { "id": "clx0…", "email": "asha@example.com", "name": "Asha", "role": "CUSTOMER", "phone": "9800000000" } }`}
          />
        </EndpointCard>
      </section>

      {/* ════════════════════════════ ACCOUNT ════════════════════════════ */}
      <section className="mt-16 space-y-6">
        <SectionHeading
          id="account"
          title="Account"
          blurb="The signed-in customer's own profile, password, saved addresses, and order self-service. Authenticated by bearer token (mobile) or cookie (web)."
        />

        <EndpointCard method="GET" path="/api/account/profile" auth="Cookie · CUSTOMER" title="Read my profile">
          <CodeBlock
            title="200 OK"
            language="json"
            code={`{
  "profile": {
    "id": "clx0…", "name": "Asha", "email": "asha@example.com",
    "phone": "9800000000", "avatar": null, "role": "CUSTOMER",
    "createdAt": "2026-05-01T10:00:00.000Z"
  }
}`}
          />
        </EndpointCard>

        <EndpointCard method="PATCH" path="/api/account/profile" auth="Cookie · CUSTOMER" title="Update name / phone / avatar">
          <p className="mb-3">Email and role are not editable here.</p>
          <ParamTable
            rows={[
              { name: 'name', type: 'string', required: false, desc: 'Empty string clears the field' },
              { name: 'phone', type: 'string', required: false, desc: 'Contact number' },
              { name: 'avatar', type: 'string', required: false, desc: 'Avatar image URL' },
            ]}
          />
          <CodeBlock title="200 OK" language="json" code={`{ "profile": { "id": "clx0…", "name": "Asha B.", "email": "asha@example.com", "phone": "9811111111", "avatar": null, "role": "CUSTOMER" } }`} />
        </EndpointCard>

        <EndpointCard method="PATCH" path="/api/account/password" auth="Cookie · CUSTOMER" title="Change password">
          <p className="mb-3">
            <code className="font-[family-name:var(--font-jetbrains)]">currentPassword</code> is required only
            when the profile already has a password set (passwordless magic-link accounts skip it).
          </p>
          <ParamTable
            rows={[
              { name: 'currentPassword', type: 'string', required: false, desc: 'Required if a password is already set' },
              { name: 'newPassword', type: 'string', required: true, desc: 'Minimum 8 characters' },
            ]}
          />
          <CodeBlock title="200 OK" language="json" code={`{ "success": true }`} />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/account/addresses" auth="Cookie · CUSTOMER" title="List saved addresses">
          <p>Default address first. Includes structured Nepal fields (province → tole).</p>
          <CodeBlock title="200 OK" language="json" code={`{ "addresses": [ { "id": "adr_…", "label": "Home", "name": "Asha", "phone": "9800000000", "address": "…", "city": "Kathmandu", "isDefault": true, "province": "Bagmati", "district": "Kathmandu", "municipality": "Kathmandu", "ward": "10", "street": "…", "tole": "…", "landmark": null } ] }`} />
        </EndpointCard>

        <EndpointCard method="POST" path="/api/account/addresses" auth="Cookie · CUSTOMER" title="Add an address">
          <p className="mb-3">First address becomes the default automatically. Setting isDefault clears the previous default.</p>
          <ParamTable
            rows={[
              { name: 'name', type: 'string', required: true, desc: 'Recipient name' },
              { name: 'phone', type: 'string', required: true, desc: 'Recipient phone' },
              { name: 'address', type: 'string', required: true, desc: 'Flat address line' },
              { name: 'label', type: 'string', required: false, desc: 'e.g. Home, Office (default "Home")' },
              { name: 'city', type: 'string', required: false, desc: 'Defaults to "Kathmandu"' },
              { name: 'house / road', type: 'string', required: false, desc: 'House and road detail' },
              { name: 'lat / lng', type: 'number', required: false, desc: 'GPS pin' },
              { name: 'isDefault', type: 'boolean', required: false, desc: 'Make this the default address' },
              { name: 'province … tole', type: 'string', required: false, desc: 'Structured Nepal address: province, district, municipality, ward, street, tole, landmark' },
            ]}
          />
          <CodeBlock title="201 Created" language="json" code={`{ "address": { "id": "adr_…", "label": "Home", "isDefault": true, "city": "Kathmandu", "...": "…" } }`} />
        </EndpointCard>

        <EndpointCard method="PATCH · DELETE" path="/api/account/addresses/[id]" auth="Cookie · CUSTOMER" title="Edit or remove a saved address">
          <p>Same fields as POST. Ownership is enforced — you can only touch your own addresses.</p>
        </EndpointCard>

        <EndpointCard method="POST" path="/api/account/orders/[id]/cancel" auth="Cookie · CUSTOMER" title="Cancel my order (pre-shipment)">
          <p className="mb-3">
            Allowed only while PENDING / CONFIRMED / PROCESSING. Wallet-paid orders flip to REFUNDED and are
            tagged for a manual admin refund. Restores stock.
          </p>
          <ParamTable rows={[{ name: 'reason', type: 'string', required: false, desc: 'Optional note (max 500 chars)' }]} />
          <div className="mt-4 grid gap-3">
            <CodeBlock title="200 OK" language="json" code={`{ "ok": true, "refundPending": false }`} />
            <CodeBlock title="409 (too late)" language="json" code={`{ "error": "Sorry — this order is already shipped and can't be cancelled here. …" }`} />
          </div>
        </EndpointCard>

        <EndpointCard method="GET · POST · DELETE" path="/api/account/orders/[id]/return" auth="Cookie · CUSTOMER" title="File / view / withdraw a return">
          <p className="mb-3">
            GET returns the existing ReturnRequest (or null). POST files one; DELETE withdraws a still-REQUESTED
            return. Eligibility is checked against the return window.
          </p>
          <ParamTable
            rows={[
              { name: 'reason', type: 'enum', required: true, desc: 'DAMAGED | WRONG_ITEM | NOT_AS_DESCRIBED | CHANGED_MIND | OTHER' },
              { name: 'items', type: 'array', required: true, desc: 'Lines: { orderItemId, quantity } — qty cannot exceed what was bought' },
              { name: 'customerNote', type: 'string', required: false, desc: 'Free text (max 1000 chars)' },
            ]}
          />
          <div className="mt-4 grid gap-3">
            <CodeBlock title="POST Request" language="json" code={`{
  "reason": "DAMAGED",
  "items": [ { "orderItemId": "oi_123", "quantity": 1 } ],
  "customerNote": "Arrived cracked."
}`} />
            <CodeBlock title="200 OK" language="json" code={`{ "ok": true, "id": "rr_…" }`} />
          </div>
        </EndpointCard>

        <EndpointCard method="PATCH" path="/api/account/orders/[id]/update-address" auth="Cookie · CUSTOMER" title="Edit delivery address of my order">
          <p className="mb-3">Only while editable (PENDING / CONFIRMED / PROCESSING). Recomposes the flat address the carriers use.</p>
          <ParamTable
            rows={[
              { name: 'province, district, municipality, street, tole', type: 'string', required: true, desc: 'All five are required' },
              { name: 'ward', type: 'string', required: false, desc: 'Ward number' },
              { name: 'landmark', type: 'string', required: false, desc: 'Nearby landmark' },
              { name: 'lat / lng', type: 'number', required: false, desc: 'Updated GPS pin' },
            ]}
          />
          <CodeBlock title="200 OK" language="json" code={`{ "ok": true, "order": { "id": "clx0…", "address": "…", "city": "Lalitpur" } }`} />
        </EndpointCard>
      </section>

      {/* ════════════════════════════ PRODUCTS ════════════════════════════ */}
      <section className="mt-16 space-y-6">
        <SectionHeading
          id="products"
          title="Products"
          blurb="Catalog browsing, detail, reviews, and Q&A. Reads are public; the write routes are intended for STAFF."
        />

        <EndpointCard method="GET" path="/api/products" auth="Public" title="List / search products">
          <p className="mb-3">Paginated. Sale prices outside their live window are masked to null unless admin=true.</p>
          <ParamTable
            rows={[
              { name: 'category', type: 'string', required: false, desc: 'Category slug' },
              { name: 'search', type: 'string', required: false, desc: 'Matches name, description, brand, sku, tags' },
              { name: 'featured', type: '"true"', required: false, desc: 'Featured only' },
              { name: 'flash', type: '"true"', required: false, desc: 'Live sale-price products only' },
              { name: 'status', type: 'string', required: false, desc: 'admin mode: "active" | "draft"' },
              { name: 'stock', type: 'string', required: false, desc: '"low" | "out"' },
              { name: 'supplier', type: 'string', required: false, desc: 'Supplier id' },
              { name: 'admin', type: '"true"', required: false, desc: 'Bypass isActive filter + include supplier' },
              { name: 'sort', type: 'string', required: false, desc: 'newest | price-asc | price-desc | name-asc | name-desc | rating | stock-asc | stock-desc' },
              { name: 'limit / page', type: 'number', required: false, desc: 'Page size (24) and page number (1)' },
              { name: 'slugs', type: 'string', required: false, desc: 'CSV of slugs (Recently Viewed) — bypasses other filters' },
            ]}
          />
          <CodeBlock
            title="200 OK"
            language="json"
            code={`{
  "products": [
    { "id": "clx0…", "name": "Vitamin C Serum", "slug": "vitamin-c-serum",
      "price": 1800, "salePrice": null, "images": ["…"], "rating": 4.8,
      "reviewCount": 445, "stock": 25, "category": { "name": "Beauty", "slug": "beauty" } }
  ],
  "total": 132, "page": 1, "totalPages": 6
}`}
          />
        </EndpointCard>

        <EndpointCard method="POST" path="/api/products" auth="STAFF (intended)" title="Create a product">
          <p className="mb-3">
            Accepts the full product shape plus optional{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">variantOptions</code> /{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">variants</code>. Returns the created row.
          </p>
          <ParamTable
            rows={[
              { name: 'name, slug, description', type: 'string', required: true, desc: 'Core identity' },
              { name: 'price', type: 'number', required: true, desc: 'Base price' },
              { name: 'categoryId', type: 'string', required: true, desc: 'Owning category' },
              { name: 'salePrice', type: 'number', required: false, desc: 'Sale price (+ salePriceStartsAt / salePriceExpiresAt windows)' },
              { name: 'stock', type: 'number', required: false, desc: 'Defaults to 10' },
              { name: 'images / tags', type: 'string[]', required: false, desc: 'Arrays' },
              { name: 'isFeatured, isNew, isTaxable, trackInventory, freeDelivery, isDealOfTheDay', type: 'boolean', required: false, desc: 'Flags' },
              { name: 'brand, sku, barcode, videoUrl', type: 'string', required: false, desc: 'Catalog metadata' },
              { name: 'weight, length, width, height', type: 'number', required: false, desc: 'Shipping dimensions' },
            ]}
          />
          <CodeBlock title="201 Created" language="json" code={`{ "id": "clx0…", "name": "…", "slug": "…", "price": 1800, "stock": 10, "...": "…" }`} />
        </EndpointCard>

        <EndpointCard method="GET · PATCH · DELETE" path="/api/products/[id]" auth="GET public · write STAFF (intended)" title="Read, update, or delete one product">
          <p>PATCH accepts the same fields as POST (all optional). DELETE removes the product.</p>
        </EndpointCard>

        <EndpointCard method="GET" path="/api/products/slug/[slug]" auth="Public" title="Full product detail by slug">
          <p>Includes category, supplier, options, variants, and plan relations. Used by the product page.</p>
          <CodeBlock title="200 OK" language="json" code={`{ "id": "clx0…", "name": "…", "slug": "vitamin-c-serum", "category": { … }, "options": [ … ], "variants": [ … ], "plan": null, "...": "…" }`} />
        </EndpointCard>

        <EndpointCard method="POST" path="/api/products/[id]/view" auth="Public" title="Increment view count">
          <CodeBlock title="200 OK" language="json" code={`{ "ok": true }`} />
        </EndpointCard>

        <EndpointCard method="GET · POST" path="/api/products/[id]/questions" auth="GET public · POST optional auth" title="Product Q&A">
          <p className="mb-3">
            GET returns approved questions with answers. POST creates a question; a logged-in user gets their
            profile name, otherwise <code className="font-[family-name:var(--font-jetbrains)]">authorName</code>{' '}
            (or &quot;Anonymous&quot;) is used. Body must be 5–500 chars.
          </p>
          <ParamTable
            rows={[
              { name: 'body', type: 'string', required: true, desc: 'The question (5–500 chars)' },
              { name: 'authorName', type: 'string', required: false, desc: 'Used only for guests' },
            ]}
          />
          <CodeBlock title="POST 200 OK" language="json" code={`{ "question": { "id": "q_…", "body": "Is it fragrance-free?", "authorName": "Asha", "isApproved": false } }`} />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/products/trending" auth="Public" title="Trending products">
          <p>Multi-signal scored ranking (sales velocity, Bayesian conversion, recency, deals). Falls back to mock data without a DB.</p>
          <CodeBlock title="200 OK" language="json" code={`{ "products": [ { "id": "clx0…", "name": "…", "price": 12000, "salePrice": null } ], "source": "live" }`} />
        </EndpointCard>

        <EndpointCard method="POST" path="/api/products/cart-flags" auth="Public" title="Batch cart flags by id">
          <p className="mb-3">Used by checkout to learn free-delivery, taxability, and live validity for cart items in one call.</p>
          <ParamTable rows={[{ name: 'ids', type: 'string[]', required: true, desc: 'Product ids in the cart' }]} />
          <div className="mt-4 grid gap-3">
            <CodeBlock title="Request" language="json" code={`{ "ids": ["clx0…", "clx1…"] }`} />
            <CodeBlock
              title="200 OK"
              language="json"
              code={`{
  "flags":   { "clx0…": true,  "clx1…": false },
  "taxable": { "clx0…": false, "clx1…": true  },
  "validity": {
    "clx0…": { "active": true, "stock": 25, "trackInventory": true, "name": "Vitamin C Serum" }
  }
}`}
            />
          </div>
        </EndpointCard>

        <EndpointCard method="POST" path="/api/reviews" auth="Cookie · CUSTOMER" title="Create or update a review">
          <p className="mb-3">Upsert keyed on (user, product). Recomputes the product rating + reviewCount.</p>
          <ParamTable
            rows={[
              { name: 'productId', type: 'string', required: true, desc: 'Product being reviewed' },
              { name: 'rating', type: 'number', required: true, desc: 'Integer 1–5' },
              { name: 'comment', type: 'string', required: false, desc: 'Review text' },
            ]}
          />
          <CodeBlock title="200 OK" language="json" code={`{ "review": { "id": "rev_…", "rating": 5, "comment": "Lovely" } }`} />
        </EndpointCard>

        <EndpointCard method="POST" path="/api/questions/[id]/answers" auth="Cookie · authenticated" title="Answer a product question">
          <p className="mb-3">Staff answers are flagged official. Body must be 2–1000 chars.</p>
          <ParamTable rows={[{ name: 'body', type: 'string', required: true, desc: 'The answer (2–1000 chars)' }]} />
          <CodeBlock title="200 OK" language="json" code={`{ "answer": { "id": "a_…", "body": "Yes, it is fragrance-free.", "isOfficial": true } }`} />
        </EndpointCard>
      </section>

      {/* ════════════════════════════ ORDERS ════════════════════════════ */}
      <section className="mt-16 space-y-6">
        <SectionHeading
          id="orders"
          title="Orders"
          blurb="Order creation (guest or customer), the customer's own order history, and public tracking. Creation recomputes totals server-side and decrements stock atomically."
        />

        <EndpointCard method="POST" path="/api/orders" auth="Public (guest) or Cookie" title="Create an order + initiate payment">
          <p className="mb-3">
            The response shape depends on the payment method. COD returns immediately; ESEWA returns form data;
            KHALTI returns a payment URL + pidx. Coupons and gift cards are re-validated server-side; totals are
            never trusted from the client.
          </p>
          <ParamTable
            rows={[
              { name: 'items', type: 'array', required: true, desc: 'Lines: { id, name, price, salePrice?, image, quantity }' },
              { name: 'subtotal', type: 'number', required: true, desc: 'Cart subtotal' },
              { name: 'deliveryCharge', type: 'number', required: true, desc: 'Chosen shipping charge' },
              { name: 'paymentMethod', type: 'enum', required: true, desc: 'COD | ESEWA | KHALTI | PARTIAL_COD' },
              { name: 'name, phone', type: 'string', required: true, desc: 'Recipient contact' },
              { name: 'email', type: 'string', required: false, desc: 'For confirmation email; falls back to session email' },
              { name: 'address, house, road, city, lat, lng', type: 'string/number', required: false, desc: 'Delivery destination' },
              { name: 'shippingProvider', type: 'string', required: false, desc: 'PATHAO | PICKNDROP | STORE_PICKUP — PnD auto-dispatches' },
              { name: 'couponCode / giftCardCode', type: 'string', required: false, desc: 'Re-validated server-side' },
              { name: 'autoDiscount', type: 'number', required: false, desc: 'Cart quantity-rule discount' },
              { name: 'advancePaid, codAmount, advanceMethod', type: 'number/string', required: false, desc: 'Partial-COD split' },
              { name: 'province … tole, landmark, selectedBranchName, deliveryNote', type: 'string', required: false, desc: 'Structured address + PnD branch + courier note' },
              { name: 'createAccount', type: 'boolean', required: false, desc: 'Guest "save my info" → passwordless profile + magic claim link' },
            ]}
          />
          <div className="mt-4 grid gap-3">
            <CodeBlock title="Request (COD)" language="json" code={`{
  "items": [ { "id": "clx0…", "name": "Serum", "price": 1800, "image": "…", "quantity": 2 } ],
  "subtotal": 3600,
  "deliveryCharge": 100,
  "paymentMethod": "COD",
  "name": "Asha", "phone": "9800000000", "email": "asha@example.com",
  "address": "Jhamsikhel", "city": "Lalitpur",
  "shippingProvider": "PICKNDROP", "selectedBranchName": "Lalitpur"
}`} />
            <CodeBlock title="201 — COD" language="json" code={`{ "orderId": "clx0…", "orderCode": "SER-1042", "status": "success", "magicLinkToken": null }`} />
            <CodeBlock title="200 — ESEWA" language="json" code={`{
  "orderId": "clx0…", "orderCode": "SER-1042",
  "esewaData": { "amount": "3600", "total_amount": "3700", "transaction_uuid": "clx0…", "signature": "…", "...": "…" },
  "esewaUrl": "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
}`} />
            <CodeBlock title="200 — KHALTI" language="json" code={`{ "orderId": "clx0…", "orderCode": "SER-1042", "paymentUrl": "https://pay.khalti.com/?pidx=…", "pidx": "…" }`} />
            <CodeBlock title="409 (stock / coupon race)" language="json" code={`{ "error": "Sorry — only 1 of \\"Serum\\" left in stock. …" }`} />
          </div>
        </EndpointCard>

        <EndpointCard method="GET" path="/api/orders" auth="Cookie · CUSTOMER" title="My order history">
          <p>All of the signed-in user&apos;s orders, newest first, with line items.</p>
          <CodeBlock title="200 OK" language="json" code={`{ "orders": [ { "id": "clx0…", "total": 3700, "status": "PROCESSING", "paymentStatus": "PAID", "items": [ … ] } ] }`} />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/orders/track?id=&phone=" auth="Public" title="Track an order (lookup)">
          <p className="mb-3">Pass at least one of id or phone. Returns the order plus live carrier status.</p>
          <ParamTable
            rows={[
              { name: 'id', type: 'string', required: false, desc: 'Partial order id or carrier tracking id' },
              { name: 'phone', type: 'string', required: false, desc: 'Order phone (digits matched)' },
            ]}
          />
          <CodeBlock title="200 OK" language="json" code={`{ "order": { "id": "clx0…", "status": "SHIPPED", "items": [ … ] }, "carrier": { "status": "in_transit", "...": "…" } }`} />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/track/[code]" auth="Public" title="Track-order detail by code">
          <p>Single order by its human order code (falls back to cuid prefix). Always no-store so webhook updates show instantly.</p>
        </EndpointCard>
      </section>

      {/* ════════════════════════════ PAYMENTS ════════════════════════════ */}
      <section className="mt-16 space-y-6">
        <SectionHeading
          id="payments"
          title="Payments"
          blurb="Gateway callbacks for eSewa and Khalti, plus the mobile WebView redirect. These are browser/gateway-driven — not JSON APIs you call directly."
        />

        <EndpointCard method="GET" path="/api/payment/verify?method=…" auth="Gateway callback" title="Verify a wallet payment">
          <p className="mb-3">
            The gateway redirects here. eSewa is double-verified (HMAC signature + status API); Khalti uses the
            Lookup API. On success the order flips to PAID and the user is redirected to the orders page; failures
            redirect to <code className="font-[family-name:var(--font-jetbrains)]">/checkout/failed</code>.
          </p>
          <ParamTable
            rows={[
              { name: 'method', type: 'enum', required: true, desc: 'esewa | khalti' },
              { name: 'data', type: 'string', required: false, desc: 'eSewa: base64 signed payload' },
              { name: 'pidx', type: 'string', required: false, desc: 'Khalti: payment index' },
              { name: 'status, purchase_order_id', type: 'string', required: false, desc: 'Khalti redirect params' },
            ]}
          />
          <CodeBlock title="Success redirect" language="text" code={`302 → /account/orders?payment=success&method=esewa`} />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/mobile/esewa-redirect?orderId=…" auth="Public" title="eSewa auto-submit page (WebView)">
          <p>Returns an HTML page that auto-POSTs the signed eSewa form. The Flutter WebView loads this URL to start a wallet payment. Returns 400 if the order is already PAID.</p>
        </EndpointCard>
      </section>

      {/* ════════════════════════ SUBSCRIPTIONS ════════════════════════ */}
      <section className="mt-16 space-y-6">
        <SectionHeading
          id="subscriptions"
          title="Subscriptions"
          blurb="Customer subscription lifecycle. Nepal PSPs have no card-on-file, so paid plans create an OPEN invoice the customer pays manually; trial plans start immediately."
        />

        <EndpointCard method="GET" path="/api/subscriptions" auth="Cookie · CUSTOMER" title="My subscriptions">
          <CodeBlock title="200 OK" language="json" code={`{ "subscriptions": [ { "id": "sub_…", "status": "ACTIVE", "currentPeriodEnd": "…", "plan": { "name": "Pro", "amount": 999 } } ] }`} />
        </EndpointCard>

        <EndpointCard method="POST" path="/api/subscriptions" auth="Cookie · CUSTOMER" title="Subscribe to a plan">
          <p className="mb-3">
            Trial plans start TRIALING (no payment). Paid plans create a PAST_DUE subscription + OPEN invoice and
            return <code className="font-[family-name:var(--font-jetbrains)]">requiresPayment: true</code> — hand
            the user to <code className="font-[family-name:var(--font-jetbrains)]">/pay</code> next.
          </p>
          <ParamTable rows={[{ name: 'planId', type: 'string', required: true, desc: 'Plan to subscribe to' }]} />
          <div className="mt-4 grid gap-3">
            <CodeBlock title="Request" language="json" code={`{ "planId": "plan_…" }`} />
            <CodeBlock title="201 — trial" language="json" code={`{ "subscription": { "id": "sub_…", "status": "TRIALING" }, "requiresPayment": false }`} />
            <CodeBlock title="201 — paid" language="json" code={`{ "subscription": { "id": "sub_…", "status": "PAST_DUE" }, "invoiceId": "inv_…", "requiresPayment": true }`} />
          </div>
        </EndpointCard>

        <EndpointCard method="PATCH" path="/api/subscriptions/[id]" auth="Cookie · CUSTOMER" title="Cancel or resume">
          <p className="mb-3">Cancellation is immediate (no recurring billing wired yet). Resume reactivates a cancelled/paused sub.</p>
          <ParamTable rows={[{ name: 'action', type: 'enum', required: true, desc: 'cancel | resume' }]} />
          <CodeBlock title="200 OK" language="json" code={`{ "subscription": { "id": "sub_…", "status": "CANCELLED", "cancelledAt": "…" } }`} />
        </EndpointCard>

        <EndpointCard method="POST" path="/api/subscriptions/[id]/pay" auth="Cookie · CUSTOMER" title="Pay the open invoice">
          <p className="mb-3">
            Initiates wallet payment for the subscription&apos;s OPEN invoice. eSewa returns form fields the client
            auto-submits; Khalti returns a redirect URL. COD does not apply — subscriptions are prepaid.
          </p>
          <ParamTable rows={[{ name: 'method', type: 'enum', required: true, desc: 'esewa | khalti' }]} />
          <div className="mt-4 grid gap-3">
            <CodeBlock title="200 — eSewa" language="json" code={`{ "method": "esewa", "action": "https://rc-epay.esewa.com.np/…/form", "fields": { "amount": "999", "transaction_uuid": "inv_…", "signature": "…" } }`} />
            <CodeBlock title="200 — Khalti" language="json" code={`{ "method": "khalti", "payment_url": "https://pay.khalti.com/?pidx=…" }`} />
          </div>
        </EndpointCard>
      </section>

      {/* ════════════════════════ PROMOTIONS ════════════════════════ */}
      <section className="mt-16 space-y-6">
        <SectionHeading
          id="promotions"
          title="Promotions"
          blurb="Coupon and gift-card validation, plus the public promotions feed (flash sales, public coupons, auto-discount rules)."
        />

        <EndpointCard method="POST" path="/api/coupons/validate" auth="Public" title="Validate a coupon against a cart">
          <ParamTable
            rows={[
              { name: 'code', type: 'string', required: true, desc: 'Coupon code' },
              { name: 'subtotal', type: 'number', required: true, desc: 'Cart subtotal' },
              { name: 'items', type: 'array', required: false, desc: 'Lines: { productId, price, quantity } — needed for scoped coupons' },
            ]}
          />
          <div className="mt-4 grid gap-3">
            <CodeBlock title="Request" language="json" code={`{ "code": "WELCOME10", "subtotal": 3600, "items": [ { "productId": "clx0…", "price": 1800, "quantity": 2 } ] }`} />
            <CodeBlock title="200 OK" language="json" code={`{ "valid": true, "discount": 360, "qualifyingSubtotal": 3600, "scope": "ALL", "coupon": { "code": "WELCOME10", "type": "PERCENT", "value": 10 } }`} />
            <CodeBlock title="Invalid (e.g. 404 / 410)" language="json" code={`{ "error": "Coupon expired" }`} />
          </div>
        </EndpointCard>

        <EndpointCard method="POST" path="/api/gift-cards/validate" auth="Public" title="Validate a gift card">
          <ParamTable rows={[{ name: 'code', type: 'string', required: true, desc: 'Gift card code' }]} />
          <CodeBlock title="200 OK" language="json" code={`{ "code": "GC-AB12", "balance": 500, "initialValue": 1000, "expiresAt": null }`} />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/promotions?limit=" auth="Public" title="Promotions feed">
          <p>Live flash sales, public-safe coupons (with spotsLeft + label), and hardcoded cart quantity-discount rules.</p>
          <CodeBlock
            title="200 OK"
            language="json"
            code={`{
  "flashSales": [ { "id": "clx0…", "name": "Serum", "price": 1800, "salePrice": 1299, "salePriceExpiresAt": "…" } ],
  "coupons": [ { "code": "WELCOME10", "type": "PERCENT", "value": 10, "label": "10% off", "spotsLeft": 42 } ],
  "autoDiscountRules": [ { "id": "qty3", "label": "Buy 3+, get 5% off", "minQty": 3, "discountPct": 5 } ]
}`}
          />
        </EndpointCard>
      </section>

      {/* ════════════════════ SHIPPING & DELIVERY ════════════════════ */}
      <section className="mt-16 space-y-6">
        <SectionHeading
          id="shipping"
          title="Shipping &amp; Delivery"
          blurb="Rate estimation across Pathao + Pick & Drop, branch/coverage lookups, and admin dispatch. Estimates are sorted cheapest-first."
        />

        <EndpointCard method="POST" path="/api/shipping/estimate" auth="Public" title="Quote delivery options">
          <ParamTable
            rows={[
              { name: 'address', type: 'string', required: true, desc: 'Destination address line' },
              { name: 'city', type: 'string', required: true, desc: 'Destination city (maps to known coords)' },
              { name: 'subtotal', type: 'number', required: true, desc: 'Cart value (for COD eligibility)' },
              { name: 'isCodActive', type: 'boolean', required: false, desc: 'Whether COD is in play' },
            ]}
          />
          <CodeBlock
            title="200 OK"
            language="json"
            code={`{
  "options": [
    { "id": "pathao-1", "provider": "PATHAO", "providerLabel": "Pathao", "name": "Standard",
      "charge": 120, "charge_after_discount": 100, "discount": 20, "dropoff_eta": 86400, "distance": 4.2,
      "meta": { "sid": "…", "serviceOptionId": 1 } },
    { "id": "pnd-zone1", "provider": "PICKNDROP", "providerLabel": "Pick & Drop", "name": "Valley",
      "charge": 90, "charge_after_discount": 90, "discount": 0, "dropoff_eta": 86400, "distance": 0,
      "meta": { "zone": "Z1", "type": "Regular" } }
  ]
}`}
          />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/shipping/branches?district=" auth="Public" title="Pick & Drop branches">
          <p>Active branches only. Empty list (with a reason) when Pick & Drop is inactive or uncredentialed.</p>
          <CodeBlock title="200 OK" language="json" code={`{ "branches": [ { "branch_name": "Lalitpur", "branch_code": "LTP", "area": ["Jhamsikhel", "Pulchowk"] } ] }`} />
        </EndpointCard>

        <EndpointCard method="POST" path="/api/shipping/coverage" auth="Public" title="Coverage check (structured address)">
          <p className="mb-3">
            Multi-atom branch matching over a structured Nepal address. Adds a fallback courier / store-pickup
            option when no live partner covers the area.
          </p>
          <ParamTable
            rows={[
              { name: 'province … tole, landmark', type: 'string', required: false, desc: 'Structured address atoms used to match a branch' },
              { name: 'subtotal', type: 'number', required: false, desc: 'Cart value (default 1000)' },
              { name: 'destinationBranch', type: 'string', required: false, desc: 'Locks the PnD destination directly' },
              { name: 'weightKg, lengthCm, widthCm, heightCm', type: 'number', required: false, desc: 'Cart package aggregates for accurate rates' },
            ]}
          />
          <CodeBlock title="200 OK" language="json" code={`{ "options": [ { "id": "pnd-z1", "provider": "PICKNDROP", "name": "Valley", "charge": 90, "dropoff_eta": 86400, "available": true, "meta": { "zone": "Z1", "type": "Regular" } } ], "errors": [] }`} />
        </EndpointCard>

        <EndpointCard method="GET · POST" path="/api/admin/orders/[id]/assign-delivery" auth="STAFF (intended)" title="Estimate or dispatch a delivery">
          <p className="mb-3">
            GET estimates from a provider (?provider=PATHAO|PICKNDROP). POST dispatches: it creates a Pathao
            parcel, a Pick &amp; Drop order, or records a MANUAL tracking entry, and stores the tracking id/URL.
          </p>
          <ParamTable
            rows={[
              { name: 'type', type: 'enum', required: true, desc: 'PATHAO | PICKNDROP | MANUAL' },
              { name: 'sid, serviceOptionId', type: 'string/number', required: false, desc: 'PATHAO: from the estimate' },
              { name: 'destinationBranch, instruction', type: 'string', required: false, desc: 'PICKNDROP: branch override + courier note' },
              { name: 'weightKg, lengthCm, widthCm, heightCm', type: 'number', required: false, desc: 'PICKNDROP: package override' },
              { name: 'trackingNumber, trackingUrl', type: 'string', required: false, desc: 'MANUAL: external courier details' },
              { name: 'deliveryCharge, notes', type: 'number/string', required: false, desc: 'Override charge + admin note' },
            ]}
          />
          <CodeBlock title="POST 200 OK" language="json" code={`{ "ok": true, "order": { "id": "clx0…", "status": "CONFIRMED", "trackingUrl": "…", "pathaoOrderId": "4LHV8CX" }, "pathao": { "order_id": "4LHV8CX", "hashed_id": "…" } }`} />
        </EndpointCard>

        <EndpointCard method="POST" path="/api/admin/orders/[id]/dispatch-retry" auth="STAFF (intended)" title="Retry a failed PnD dispatch">
          <p>Re-attempts the carrier hand-off for an order whose initial auto-dispatch failed.</p>
        </EndpointCard>

        <EndpointCard method="POST" path="/api/admin/orders/[id]/cancel-delivery" auth="STAFF (intended)" title="Cancel a dispatched delivery">
          <p>Calls the carrier cancel API (using the stored hash) and clears the tracking fields.</p>
        </EndpointCard>
      </section>

      {/* ════════════════════════════ ADMIN ════════════════════════════ */}
      <section className="mt-16 space-y-6">
        <SectionHeading
          id="admin"
          title="Admin"
          blurb="Back-office management. Billing routes require MANAGER; team and media require ADMIN; some operational routes are unguarded today and are labelled with their intended role."
        />

        <EndpointCard method="GET" path="/api/admin/dashboard" auth="STAFF (intended)" title="Dashboard metrics">
          <p>Revenue (today / 30-day + change), order counts by status, product/customer counts, recent orders, top products, low-stock list, and a 7-day revenue series — in one call.</p>
          <CodeBlock title="200 OK" language="json" code={`{ "stats": { "revenue": { "today": 12000, "month": 410000, "change": 18 }, "orders": { … }, "products": { … }, "customers": { "total": 1240 } }, "dailyRevenue": [ … ], "recentOrders": [ … ], "topProducts": [ … ], "lowStockProducts": [ … ] }`} />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/admin/orders?status=&limit=" auth="STAFF (intended)" title="List orders">
          <p>All orders (filterable by status), newest first, with line items. Timestamps serialized to ISO strings.</p>
          <CodeBlock title="200 OK" language="json" code={`{ "orders": [ { "id": "clx0…", "name": "Asha", "total": 3700, "status": "PROCESSING", "items": [ … ] } ] }`} />
        </EndpointCard>

        <EndpointCard method="GET · PATCH" path="/api/admin/orders/[id]" auth="STAFF (intended)" title="Read / update an order">
          <p className="mb-3">
            PATCH whitelists a fixed set of fields. Setting status fires push + email + (for SHIPPED) WhatsApp;
            CANCELLED restores stock; marking paymentStatus PAID sends a receipt.
          </p>
          <ParamTable
            rows={[
              { name: 'status', type: 'enum', required: false, desc: 'PENDING | CONFIRMED | PROCESSING | SHIPPED | DELIVERED | CANCELLED' },
              { name: 'paymentStatus', type: 'enum', required: false, desc: 'PENDING | PAID | REFUNDED' },
              { name: 'notes', type: 'string', required: false, desc: 'Internal note' },
              { name: 'name, phone, email, address, house, road, city, lat, lng', type: 'string/number', required: false, desc: 'Editable order/customer fields' },
              { name: 'deliveryCharge, shippingOption', type: 'number/string', required: false, desc: 'Shipping detail' },
              { name: 'pathaoOrderId, pathaoHash, trackingUrl', type: 'string', required: false, desc: 'Carrier tracking fields' },
            ]}
          />
          <CodeBlock title="PATCH Request" language="json" code={`{ "status": "SHIPPED", "trackingUrl": "https://merchant.pathao.com/tracking/…" }`} />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/admin/orders/[id]/items" auth="STAFF (intended)" title="Order line items" />
        <EndpointCard method="GET" path="/api/admin/orders/[id]/providers" auth="STAFF (intended)" title="Available delivery providers for an order" />
        <EndpointCard method="POST" path="/api/admin/orders/print" auth="STAFF (intended)" title="Batch print order docs (labels / invoices)" />

        <EndpointCard method="GET" path="/api/admin/riders" auth="Public (today)" title="Staff who can carry deliveries">
          <p>Profiles with STAFF / MANAGER / ADMIN roles, for assigning manual deliveries.</p>
          <CodeBlock title="200 OK" language="json" code={`{ "riders": [ { "id": "…", "name": "Ramesh", "phone": "98…", "email": "…", "role": "STAFF" } ] }`} />
        </EndpointCard>

        <EndpointCard method="POST" path="/api/admin/inventory/adjust" auth="STAFF (intended)" title="Adjust stock + write a ledger entry">
          <p className="mb-3">DAMAGE decreases stock; other types increase it. Writes an InventoryLog row atomically.</p>
          <ParamTable
            rows={[
              { name: 'productId', type: 'string', required: true, desc: 'Tracked product' },
              { name: 'type', type: 'enum', required: true, desc: 'PURCHASE | ADJUSTMENT | RETURN | DAMAGE' },
              { name: 'quantity', type: 'number', required: true, desc: 'Magnitude (sign derived from type)' },
              { name: 'note', type: 'string', required: false, desc: 'Reason' },
            ]}
          />
          <CodeBlock title="200 OK" language="json" code={`{ "success": true, "stock": 42, "product": "Vitamin C Serum" }`} />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/admin/inventory/logs" auth="STAFF (intended)" title="Inventory ledger" />
        <EndpointCard method="GET" path="/api/admin/products/all" auth="STAFF (intended)" title="Full product list (no masking)" />

        <EndpointCard method="POST" path="/api/admin/products/import" auth="STAFF (intended)" title="Import products from a spreadsheet">
          <p className="mb-3">multipart/form-data with a single <code className="font-[family-name:var(--font-jetbrains)]">file</code> field (.xlsx). Upserts by SKU; auto-creates missing categories/suppliers.</p>
          <ParamTable rows={[{ name: 'file', type: 'File', required: true, desc: 'Excel sheet (form field "file")' }]} />
          <CodeBlock title="200 OK" language="json" code={`{ "success": true, "created": 12, "updated": 3, "skipped": 1, "errors": [], "total": 16 }`} />
        </EndpointCard>

        <EndpointCard method="GET · POST · PATCH" path="/api/admin/categories" auth="STAFF (intended)" title="Manage categories">
          <p className="mb-3">POST auto-slugifies the name. PATCH updates by id (name, color, icon, image, seoIntro).</p>
          <ParamTable
            rows={[
              { name: 'name', type: 'string', required: true, desc: 'POST: category name' },
              { name: 'color, icon, image', type: 'string', required: false, desc: 'Display + collage fields' },
              { name: 'id', type: 'string', required: true, desc: 'PATCH: which category' },
              { name: 'seoIntro', type: 'string', required: false, desc: 'PATCH: SEO intro copy' },
            ]}
          />
          <CodeBlock title="POST 201" language="json" code={`{ "id": "cat_…", "name": "Beauty", "slug": "beauty", "color": "#16A34A" }`} />
        </EndpointCard>

        <EndpointCard method="GET · POST" path="/api/admin/suppliers" auth="STAFF (intended)" title="Manage suppliers">
          <ParamTable
            rows={[
              { name: 'name', type: 'string', required: true, desc: 'Supplier name' },
              { name: 'contactName, email, phone, address, notes', type: 'string', required: false, desc: 'Contact detail' },
            ]}
          />
          <CodeBlock title="POST 201" language="json" code={`{ "id": "sup_…", "name": "GlowLab", "email": "hi@glowlab.np", "isActive": true }`} />
          <p className="mt-3 text-slate-400">PATCH / DELETE available at <code className="font-[family-name:var(--font-jetbrains)]">/api/admin/suppliers/[id]</code>.</p>
        </EndpointCard>

        <EndpointCard method="GET · POST" path="/api/admin/coupons" auth="STAFF (intended)" title="Manage coupons">
          <ParamTable
            rows={[
              { name: 'code', type: 'string', required: true, desc: 'Uppercased on save' },
              { name: 'type', type: 'enum', required: true, desc: 'PERCENT | FIXED' },
              { name: 'value', type: 'number', required: true, desc: 'Discount amount' },
              { name: 'minOrder, maxUses', type: 'number', required: false, desc: 'Thresholds' },
              { name: 'expiresAt', type: 'string', required: false, desc: 'ISO date' },
              { name: 'scope, categoryIds, productIds', type: 'string/string[]', required: false, desc: 'Targeting (default scope ALL)' },
            ]}
          />
          <CodeBlock title="POST 200" language="json" code={`{ "coupon": { "id": "cpn_…", "code": "WELCOME10", "type": "PERCENT", "value": 10, "scope": "ALL" } }`} />
          <p className="mt-3 text-slate-400">PATCH / DELETE at <code className="font-[family-name:var(--font-jetbrains)]">/api/admin/coupons/[id]</code>.</p>
        </EndpointCard>

        <EndpointCard method="GET · POST" path="/api/admin/gift-cards" auth="GET STAFF · POST MANAGER" title="Issue & manage gift cards">
          <p className="mb-3">Code auto-generates when <code className="font-[family-name:var(--font-jetbrains)]">customCode</code> is omitted.</p>
          <ParamTable
            rows={[
              { name: 'initialValue', type: 'number', required: true, desc: 'Positive amount, max 1,000,000' },
              { name: 'expiresInDays', type: 'number', required: false, desc: 'null = never expires' },
              { name: 'issuedToEmail, note, customCode', type: 'string', required: false, desc: 'Recipient + memo + chosen code' },
            ]}
          />
          <CodeBlock title="POST 201" language="json" code={`{ "card": { "id": "gc_…", "code": "GC-AB12", "initialValue": 1000, "balance": 1000, "isActive": true } }`} />
          <p className="mt-3 text-slate-400">PATCH / DELETE at <code className="font-[family-name:var(--font-jetbrains)]">/api/admin/gift-cards/[id]</code>.</p>
        </EndpointCard>

        <EndpointCard method="GET · POST" path="/api/admin/team" auth="ADMIN" title="Manage staff accounts">
          <p className="mb-3">Lists and creates STAFF / MANAGER / ADMIN profiles (with a bcrypt password).</p>
          <ParamTable
            rows={[
              { name: 'email, password', type: 'string', required: true, desc: 'Password 8+ chars' },
              { name: 'role', type: 'enum', required: true, desc: 'STAFF | MANAGER | ADMIN' },
              { name: 'name, phone', type: 'string', required: false, desc: 'Contact detail' },
            ]}
          />
          <CodeBlock title="POST 201" language="json" code={`{ "id": "…", "name": "Ramesh", "email": "ramesh@store.np", "role": "STAFF", "createdAt": "…" }`} />
          <p className="mt-3 text-slate-400">PATCH / DELETE at <code className="font-[family-name:var(--font-jetbrains)]">/api/admin/team/[id]</code>.</p>
        </EndpointCard>

        <EndpointCard method="GET · POST" path="/api/admin/plans" auth="MANAGER" title="Subscription plans">
          <ParamTable
            rows={[
              { name: 'name', type: 'string', required: true, desc: 'Plan name' },
              { name: 'amount', type: 'number', required: true, desc: 'Recurring amount (> 0)' },
              { name: 'interval', type: 'enum', required: true, desc: 'WEEKLY | MONTHLY | YEARLY' },
              { name: 'intervalCount', type: 'number', required: false, desc: 'Defaults to 1' },
              { name: 'trialDays', type: 'number', required: false, desc: 'Free trial length' },
              { name: 'description, image, isActive', type: 'mixed', required: false, desc: 'Display + availability' },
            ]}
          />
          <CodeBlock title="POST 201" language="json" code={`{ "plan": { "id": "plan_…", "name": "Pro", "amount": 999, "interval": "MONTHLY", "intervalCount": 1, "trialDays": 7, "isActive": true } }`} />
          <p className="mt-3 text-slate-400">PATCH / DELETE at <code className="font-[family-name:var(--font-jetbrains)]">/api/admin/plans/[id]</code>.</p>
        </EndpointCard>

        <EndpointCard method="GET · POST" path="/api/admin/subscriptions" auth="MANAGER" title="Manage subscriptions">
          <p className="mb-3">GET filters by status. POST creates a subscription directly as ACTIVE (or TRIALING if trialDays {'>'} 0) — bypasses the customer PAST_DUE flow.</p>
          <ParamTable
            rows={[
              { name: 'userId, planId', type: 'string', required: true, desc: 'Who + which plan' },
              { name: 'trialDays', type: 'number', required: false, desc: 'Override plan trial' },
              { name: 'notes', type: 'string', required: false, desc: 'Admin note' },
            ]}
          />
          <CodeBlock title="POST 201" language="json" code={`{ "subscription": { "id": "sub_…", "status": "ACTIVE", "planId": "plan_…", "currentPeriodEnd": "…" } }`} />
          <p className="mt-3 text-slate-400">PATCH / DELETE at <code className="font-[family-name:var(--font-jetbrains)]">/api/admin/subscriptions/[id]</code>.</p>
        </EndpointCard>

        <EndpointCard method="GET · POST" path="/api/admin/invoices" auth="MANAGER" title="Invoices">
          <p className="mb-3">GET filters by status (OPEN | PAID | OVERDUE | VOID) and attaches the user. POST creates a one-off (non-subscription) invoice.</p>
          <ParamTable
            rows={[
              { name: 'userId', type: 'string', required: true, desc: 'Billed customer' },
              { name: 'amount', type: 'number', required: true, desc: '> 0' },
              { name: 'dueDate', type: 'string', required: false, desc: 'ISO date (default +7 days)' },
              { name: 'notes', type: 'string', required: false, desc: 'Memo' },
            ]}
          />
          <CodeBlock title="POST 201" language="json" code={`{ "invoice": { "id": "inv_…", "number": "INV-0042", "amount": 999, "status": "OPEN", "dueDate": "…" } }`} />
          <p className="mt-3 text-slate-400">PATCH status at <code className="font-[family-name:var(--font-jetbrains)]">/api/admin/invoices/[id]</code> with {`{ status }`}.</p>
        </EndpointCard>

        <EndpointCard method="GET · PATCH" path="/api/admin/logistics" auth="STAFF (intended)" title="Carrier credentials & config">
          <p className="mb-3">
            PATCH upserts a LogisticsSettings row keyed by provider and busts caches. Changing Pick &amp; Drop
            credentials auto-syncs the registered vendor address.
          </p>
          <ParamTable
            rows={[
              { name: 'provider', type: 'enum', required: true, desc: 'PATHAO | PICKNDROP' },
              { name: 'isActive', type: 'boolean', required: false, desc: 'Enable/disable the carrier' },
              { name: 'apiKey, apiSecret, baseUrl, clientId, clientSecret, …', type: 'string', required: false, desc: 'Provider-specific credentials & store fields' },
            ]}
          />
          <CodeBlock title="PATCH 200" language="json" code={`{ "setting": { "provider": "PICKNDROP", "isActive": true, "storeName": "Balapasa", "storeAddress": "…" }, "vendorSync": { "vendorName": "Balapasa", "...": "…" } }`} />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/admin/media?kind=&search=&take=&cursor=" auth="ADMIN" title="Media library (keyset paginated)">
          <ParamTable
            rows={[
              { name: 'kind', type: 'enum', required: false, desc: 'image | video (default image)' },
              { name: 'search', type: 'string', required: false, desc: 'Filename / alt substring' },
              { name: 'take', type: 'number', required: false, desc: 'Page size (default 60, max 200)' },
              { name: 'cursor', type: 'string', required: false, desc: 'Last asset id from previous page' },
            ]}
          />
          <CodeBlock title="200 OK" language="json" code={`{ "items": [ { "id": "med_…", "url": "/uploads/…", "filename": "hero.png", "mimeType": "image/png", "width": 1200, "height": 800, "kind": "image", "alt": null, "createdAt": "…" } ], "nextCursor": "med_…" }`} />
          <p className="mt-3 text-slate-400">POST (create) and DELETE at <code className="font-[family-name:var(--font-jetbrains)]">/api/admin/media</code> / <code className="font-[family-name:var(--font-jetbrains)]">/api/admin/media/[id]</code>.</p>
        </EndpointCard>

        <EndpointCard method="GET · POST" path="/api/admin/settings" auth="STAFF (intended)" title="Store settings (app_settings)">
          <p className="mb-3">
            GET returns all settings with secrets masked. POST upserts a key/value map; values starting with
            <code className="font-[family-name:var(--font-jetbrains)]"> ••</code> (a masked secret) and empty
            strings are ignored. Relevant caches are invalidated on save.
          </p>
          <CodeBlock title="POST Request" language="json" code={`{ "STORE_NAME": "Balapasa", "FREE_DELIVERY_THRESHOLD": "5000", "DELIVERY_MODE": "PAID" }`} />
          <CodeBlock title="200 OK" language="json" code={`{ "success": true, "saved": 3 }`} />
        </EndpointCard>
      </section>

      {/* ════════════════════ MOBILE & PUBLIC ════════════════════ */}
      <section className="mt-16 space-y-6">
        <SectionHeading
          id="mobile"
          title="Mobile &amp; Public"
          blurb="Endpoints the mobile apps lean on (push registration, wishlist) plus public storefront config. These accept the Bearer header where a session is needed."
        />

        <EndpointCard method="POST · DELETE" path="/api/mobile/push" auth="Bearer / Cookie (optional)" title="Register / unregister an FCM device token">
          <p className="mb-3">
            POST upserts a device token (optionally bound to the logged-in user). DELETE removes it on logout.
            Anonymous registration is allowed — the token is stored with a null userId.
          </p>
          <ParamTable
            rows={[
              { name: 'token', type: 'string', required: true, desc: 'FCM registration token' },
              { name: 'platform', type: 'enum', required: false, desc: '"android" | "ios" (default android)' },
            ]}
          />
          <div className="mt-4 grid gap-3">
            <CodeBlock title="POST Request" language="json" code={`{ "token": "fcm_AAA…", "platform": "android" }`} />
            <CodeBlock title="POST 200" language="json" code={`{ "registered": true }`} />
            <CodeBlock title="DELETE 200" language="json" code={`{ "removed": true }`} />
          </div>
        </EndpointCard>

        <EndpointCard method="GET · POST · DELETE" path="/api/wishlist" auth="Bearer / Cookie" title="Wishlist (toggle)">
          <p className="mb-3">
            GET returns the user&apos;s wishlisted products. POST toggles a product (adds if missing, removes if
            present). DELETE explicitly removes by <code className="font-[family-name:var(--font-jetbrains)]">?productId=</code>.
          </p>
          <ParamTable rows={[{ name: 'productId', type: 'string', required: true, desc: 'POST body / DELETE query param' }]} />
          <div className="mt-4 grid gap-3">
            <CodeBlock title="GET 200" language="json" code={`{ "wishlist": [ { "id": "clx0…", "name": "Serum", "price": 1800, "category": { … } } ] }`} />
            <CodeBlock title="POST 200" language="json" code={`{ "wishlisted": true }`} />
          </div>
        </EndpointCard>

        <EndpointCard method="GET" path="/api/categories?sort=&limit=" auth="Public" title="Categories with product counts">
          <p>Only categories with at least one active product. <code className="font-[family-name:var(--font-jetbrains)]">sort=sales</code> ranks by 7-day sales and adds a 2x2 preview-image collage.</p>
          <CodeBlock title="200 OK" language="json" code={`{ "categories": [ { "id": "cat_…", "name": "Beauty", "slug": "beauty", "_count": { "products": 24 } } ] }`} />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/deals" auth="Public" title="Deal of the Day">
          <p>The single live Deal-of-the-Day product (highest discount wins ties), or {`{ "deal": null }`}.</p>
          <CodeBlock title="200 OK" language="json" code={`{ "deal": { "id": "clx0…", "name": "Serum", "price": 1800, "salePrice": 1299, "stock": 12 } }`} />
        </EndpointCard>

        <EndpointCard method="GET" path="/api/store-config" auth="Public" title="Public store configuration">
          <p>Whitelisted public settings: store identity, contact + social handles, free-delivery threshold, delivery mode, and enabled payment methods. 60s cache.</p>
          <CodeBlock
            title="200 OK"
            language="json"
            code={`{
  "FREE_DELIVERY_THRESHOLD": 5000,
  "enabledPaymentMethods": ["COD", "ESEWA", "KHALTI"],
  "STORE_NAME": "Balapasa", "STORE_PHONE": "01-…", "STORE_EMAIL": "hi@balapasa.com",
  "DELIVERY_MODE": "PAID", "DELIVERY_ENABLED": true
}`}
          />
        </EndpointCard>
      </section>

      {/* ════════════════════════════ CRON ════════════════════════════ */}
      <section className="mt-16 space-y-6">
        <SectionHeading
          id="cron"
          title="Cron"
          blurb="Scheduled jobs authenticated with a CRON_SECRET (infrastructure auth, from process.env — not app settings). Every step is idempotent and safe to re-run."
        />

        <EndpointCard method="GET · POST" path="/api/cron/billing" auth="CRON secret" title="Recurring-billing engine (run daily)">
          <p className="mb-3">
            Renews due subscriptions (creates an invoice + flips to PAST_DUE), ends expired trials the same way,
            and marks stale OPEN invoices OVERDUE. Authenticate with{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">Authorization: Bearer &lt;CRON_SECRET&gt;</code>{' '}
            or <code className="font-[family-name:var(--font-jetbrains)]">?token=&lt;CRON_SECRET&gt;</code>.
          </p>
          <CodeBlock title="200 OK" language="json" code={`{ "ok": true, "renewed": 3, "trialsEnded": 1, "markedOverdue": 2 }`} />
          <CodeBlock title="401" language="json" code={`{ "error": "Unauthorized" }`} />
        </EndpointCard>
      </section>

      {/* ════════════════════════════ WEBHOOKS ════════════════════════════ */}
      <section className="mt-16 space-y-6">
        <SectionHeading
          id="webhooks"
          title="Webhooks"
          blurb="Inbound notifications from delivery partners. Verified by HMAC; they advance order status and fire customer notifications."
        />

        <EndpointCard method="POST" path="/api/webhooks/pickndrop" auth="HMAC signature" title="Pick & Drop status callback">
          <p className="mb-3">
            Pick &amp; Drop POSTs delivery status events here. The signature is verified, the status is mapped to
            an internal order status, and an OrderStatusLog row is written.
          </p>
          <div className="rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-200 ring-1 ring-inset ring-amber-500/25">
            <span className="font-semibold text-amber-100">Known limitation:</span> PnD status events currently fire
            push with a null userId, so those status pushes do not reach a device today.
          </div>
        </EndpointCard>
      </section>

      {/* ── Footer nav ──────────────────────────────────────────────────── */}
      <footer className="mt-16 flex flex-col gap-3 border-t border-slate-700/60 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">
          Need the SDK quickstarts? See{' '}
          <Link href="/docs/mobile/flutter" className="text-emerald-400 underline-offset-4 hover:underline">
            Flutter
          </Link>{' '}
          and{' '}
          <Link href="/docs/mobile/react-native" className="text-emerald-400 underline-offset-4 hover:underline">
            React Native
          </Link>
          .
        </p>
        <Link
          href="/docs/notifications"
          className="inline-flex w-fit items-center rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-200 ring-1 ring-inset ring-slate-700/60 transition-colors duration-200 hover:bg-slate-700 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          Push Notifications (FCM) →
        </Link>
      </footer>
    </div>
  )
}
