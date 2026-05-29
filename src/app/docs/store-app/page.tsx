import type { Metadata } from 'next'
import {
  Store,
  ShieldCheck,
  Package,
  ClipboardList,
  Boxes,
  Truck,
  CreditCard,
  Bell,
  AlertTriangle,
} from 'lucide-react'
import EndpointCard from '../components/EndpointCard'
import CodeBlock from '../components/CodeBlock'
import ParamTable from '../components/ParamTable'

export const metadata: Metadata = {
  title: 'Store App — Balapasa Platform API',
  description:
    'Build the Balapasa store/owner app: order management, product & inventory CRUD, delivery assignment (Pathao + Pick & Drop), billing, and FCM push registration.',
}

function SectionHeading({
  id,
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  id: string
  icon: React.ComponentType<{ className?: string }>
  eyebrow: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="scroll-mt-24" id={id}>
      <p className="mb-2 flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-xs font-medium uppercase tracking-wide text-emerald-400">
        <Icon className="h-4 w-4" />
        {eyebrow}
      </p>
      <h2 className="font-[family-name:var(--font-jetbrains)] text-2xl font-semibold tracking-tight text-slate-100">
        {title}
      </h2>
      {children && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          {children}
        </p>
      )}
    </div>
  )
}

function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warn'
  title: string
  children: React.ReactNode
}) {
  const styles =
    tone === 'warn'
      ? 'border-amber-500/30 bg-amber-500/10'
      : 'border-sky-500/30 bg-sky-500/10'
  const iconColor = tone === 'warn' ? 'text-amber-400' : 'text-sky-400'
  return (
    <div className={`rounded-lg border px-4 py-3 ${styles}`}>
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
        <AlertTriangle className={`h-4 w-4 ${iconColor}`} />
        {title}
      </p>
      <div className="mt-1.5 text-sm leading-relaxed text-slate-300">
        {children}
      </div>
    </div>
  )
}

export default function StoreAppPage() {
  return (
    <div className="space-y-14">
      {/* Hero */}
      <section>
        <p className="mb-3 flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-sm font-medium uppercase tracking-wide text-emerald-400">
          <Store className="h-4 w-4" />
          Store App
        </p>
        <h1 className="font-[family-name:var(--font-jetbrains)] text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          Store &amp; Owner App
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          The store app is the operator surface: staff and owners list and
          fulfil orders, manage the catalog and stock, hand parcels to a
          carrier (Pathao or Pick &amp; Drop), and run the subscription billing
          back office. Every endpoint below is backed by a real route handler in{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            src/app/api
          </code>
          .
        </p>
      </section>

      {/* Auth */}
      <section className="space-y-5">
        <SectionHeading
          id="auth"
          icon={ShieldCheck}
          eyebrow="Authentication"
          title="Staff &amp; admin auth"
        >
          The store app authenticates with a bearer JWT — the same token model
          the customer and rider apps use. Sign in via the mobile auth endpoint,
          store the returned token, and send it on every request.
        </SectionHeading>

        <p className="text-sm leading-relaxed text-slate-400">
          The JWT payload is{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            AuthPayload = &#123; sub, email, role, name? &#125;
          </code>
          . Roles are ranked{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
            CUSTOMER &lt; STAFF &lt; MANAGER &lt; ADMIN
          </code>
          ; endpoints that call{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
            requireRole(min)
          </code>{' '}
          accept that role or higher. The web admin alternatively rides an
          httpOnly{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
            auth-token
          </code>{' '}
          cookie, but mobile clients should always use the Authorization header.
        </p>

        <CodeBlock
          title="Authenticated request"
          language="bash"
          code={`curl https://api.balapasa.com/v1/api/admin/orders?status=PENDING \\
  -H "Authorization: Bearer <jwt>"`}
        />

        <Callout tone="warn" title="Order & product routes are not yet role-guarded">
          The order-management, inventory, and product write endpoints below do
          not currently call <code>requireRole</code> — they are reachable by any
          caller that knows the URL. Treat them as admin-only by convention and
          gate them at your network/proxy layer until server-side guards land.
          The billing routes (<code>plans</code>, <code>subscriptions</code>,{' '}
          <code>invoices</code>) and <code>providers</code> already enforce
          roles.
        </Callout>
      </section>

      {/* Orders */}
      <section className="space-y-5">
        <SectionHeading
          id="orders"
          icon={ClipboardList}
          eyebrow="Fulfilment"
          title="Order management"
        >
          List orders for the operations queue, open a single order, and drive
          its lifecycle — status, payment status, and delivery details — through
          one PATCH endpoint.
        </SectionHeading>

        <EndpointCard
          method="GET"
          path="/api/admin/orders"
          auth="Admin (by convention)"
          title="List orders"
        >
          <p className="mb-3">
            Returns the most recent orders, newest first, each with its{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
              items
            </code>{' '}
            array. <code>createdAt</code> / <code>updatedAt</code> are ISO
            strings. On any DB error the route returns{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
              &#123; orders: [] &#125;
            </code>{' '}
            (never a 500), so the queue degrades gracefully.
          </p>
          <ParamTable
            rows={[
              {
                name: 'status',
                type: 'string',
                desc: 'Exact Order.status filter, e.g. PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED.',
              },
              {
                name: 'limit',
                type: 'number',
                desc: 'Max rows to return. Defaults to 200.',
              },
            ]}
          />
        </EndpointCard>

        <EndpointCard
          method="GET"
          path="/api/admin/orders/[id]"
          auth="Admin (by convention)"
          title="Get one order"
        >
          <p>
            Returns a single order with its <code>items</code>, or{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
              404 &#123; error: &quot;Not found&quot; &#125;
            </code>{' '}
            if no row matches the id.
          </p>
        </EndpointCard>

        <EndpointCard
          method="PATCH"
          path="/api/admin/orders/[id]"
          auth="Admin (by convention)"
          title="Update an order"
        >
          <p className="mb-3">
            A field-allowlisted partial update. Only the keys below are written;
            an empty string{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
              &quot;&quot;
            </code>{' '}
            is stored as <code>null</code>. Certain transitions fire side
            effects (see below). Returns the updated order with ISO timestamps.
          </p>
          <ParamTable
            rows={[
              { name: 'status', type: 'string', desc: 'Order status. Setting SHIPPED / DELIVERED / CANCELLED triggers push + email; CANCELLED also restores stock.' },
              { name: 'paymentStatus', type: 'string', desc: 'Payment status. Marking PAID fires a payment-confirmed push and receipt email.' },
              { name: 'notes', type: 'string', desc: 'Internal order notes.' },
              { name: 'name', type: 'string', desc: 'Receiver name.' },
              { name: 'phone', type: 'string', desc: 'Receiver phone.' },
              { name: 'email', type: 'string', desc: 'Receiver email (used for notification emails).' },
              { name: 'address', type: 'string', desc: 'Delivery address line.' },
              { name: 'house', type: 'string', desc: 'House number / name.' },
              { name: 'road', type: 'string', desc: 'Road / street.' },
              { name: 'city', type: 'string', desc: 'City / municipality.' },
              { name: 'lat', type: 'number', desc: 'Delivery latitude.' },
              { name: 'lng', type: 'number', desc: 'Delivery longitude.' },
              { name: 'deliveryCharge', type: 'number', desc: 'Delivery fee charged.' },
              { name: 'shippingOption', type: 'string', desc: 'Human-readable carrier/option label.' },
              { name: 'pathaoOrderId', type: 'string', desc: 'Carrier display tracking ID (stored for all carriers).' },
              { name: 'pathaoHash', type: 'string', desc: 'Carrier cancellation reference.' },
              { name: 'trackingUrl', type: 'string', desc: 'Public tracking URL.' },
            ]}
          />
          <p className="mt-4 mb-2 font-semibold text-slate-200">Side effects</p>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            <li>
              <code className="font-[family-name:var(--font-jetbrains)] text-amber-400">
                status=SHIPPED
              </code>{' '}
              — sends an &quot;on its way&quot; push, a shipment-update email, and a
              WhatsApp tracking message when a <code>trackingUrl</code> + phone
              exist.
            </li>
            <li>
              <code className="font-[family-name:var(--font-jetbrains)] text-amber-400">
                status=DELIVERED
              </code>{' '}
              — delivered push + email.
            </li>
            <li>
              <code className="font-[family-name:var(--font-jetbrains)] text-amber-400">
                status=CANCELLED
              </code>{' '}
              — cancelled push + email, and an idempotent stock restore back to
              the inventory ledger.
            </li>
            <li>
              <code className="font-[family-name:var(--font-jetbrains)] text-amber-400">
                paymentStatus=PAID
              </code>{' '}
              — payment-confirmed push and a receipt email.
            </li>
            <li>
              <code className="font-[family-name:var(--font-jetbrains)] text-amber-400">
                status=PROCESSING
              </code>{' '}
              on a store-pickup order — sends a &quot;ready for pickup&quot; email.
            </li>
          </ul>
          <div className="mt-4">
            <CodeBlock
              title="Mark an order shipped"
              language="bash"
              code={`curl -X PATCH https://api.balapasa.com/v1/api/admin/orders/ord_123 \\
  -H "Authorization: Bearer <jwt>" \\
  -H "Content-Type: application/json" \\
  -d '{ "status": "SHIPPED" }'`}
            />
          </div>
        </EndpointCard>
      </section>

      {/* Products */}
      <section className="space-y-5">
        <SectionHeading
          id="products"
          icon={Package}
          eyebrow="Catalog"
          title="Product CRUD"
        >
          Create, update, and delete catalog products, including pricing, sale
          windows, dimensions, and variants. The same list endpoint the shop
          uses powers the admin grid via <code>?admin=true</code>.
        </SectionHeading>

        <EndpointCard
          method="GET"
          path="/api/products?admin=true"
          auth="Public route"
          title="List products (admin mode)"
        >
          <p className="mb-3">
            With <code>admin=true</code> the <code>isActive</code> filter is
            dropped (so drafts are visible) and live-sale masking is bypassed, so
            the editor sees exactly what is stored. Returns{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
              &#123; products, total, page, totalPages &#125;
            </code>
            .
          </p>
          <ParamTable
            rows={[
              { name: 'admin', type: 'boolean', desc: "'true' enables admin mode (no isActive filter, no sale masking)." },
              { name: 'status', type: 'string', desc: "Admin only: 'active' | 'draft' to filter by isActive." },
              { name: 'search', type: 'string', desc: 'Matches name, description, brand, sku, and tags.' },
              { name: 'category', type: 'string', desc: 'Category slug filter.' },
              { name: 'supplier', type: 'string', desc: 'Supplier id filter.' },
              { name: 'stock', type: 'string', desc: "'out' (stock=0) or 'low' (tracked, 1–10)." },
              { name: 'sort', type: 'string', desc: 'newest | price-asc | price-desc | stock-asc | stock-desc | name-asc | name-desc | rating.' },
              { name: 'page', type: 'number', desc: 'Page number. Defaults to 1.' },
              { name: 'limit', type: 'number', desc: 'Page size. Defaults to 24.' },
            ]}
          />
        </EndpointCard>

        <EndpointCard
          method="POST"
          path="/api/products"
          auth="Public route"
          title="Create a product"
        >
          <p className="mb-3">
            Requires <code>name</code>, <code>slug</code>,{' '}
            <code>description</code>, <code>price</code>, and{' '}
            <code>categoryId</code> (else 400). Returns the created product with{' '}
            <code>201</code>. Optional <code>variantOptions</code> and{' '}
            <code>variants</code> arrays are persisted alongside. Flagging{' '}
            <code>isDealOfTheDay</code> clears the flag on every other product.
          </p>
          <ParamTable
            rows={[
              { name: 'name', type: 'string', required: true, desc: 'Product name.' },
              { name: 'slug', type: 'string', required: true, desc: 'Unique URL slug.' },
              { name: 'description', type: 'string', required: true, desc: 'Product description.' },
              { name: 'price', type: 'number', required: true, desc: 'Regular price.' },
              { name: 'categoryId', type: 'string', required: true, desc: 'Category id.' },
              { name: 'salePrice', type: 'number', desc: 'Sale price; snapshots stock when set on create.' },
              { name: 'salePriceStartsAt', type: 'string', desc: 'ISO date the sale becomes live.' },
              { name: 'salePriceExpiresAt', type: 'string', desc: 'ISO date the sale ends.' },
              { name: 'stock', type: 'number', desc: 'Initial stock. Defaults to 10.' },
              { name: 'lowStockThreshold', type: 'number', desc: 'Low-stock alert level. Defaults to 10.' },
              { name: 'images', type: 'string[]', desc: 'Image URLs.' },
              { name: 'tags', type: 'string[]', desc: 'Search/display tags.' },
              { name: 'supplierId', type: 'string', desc: 'Supplier id.' },
              { name: 'brand', type: 'string', desc: 'Brand name.' },
              { name: 'sku', type: 'string', desc: 'Stock-keeping unit.' },
              { name: 'barcode', type: 'string', desc: 'Barcode.' },
              { name: 'weight', type: 'number', desc: 'Weight (kg) — used for carrier limits.' },
              { name: 'length', type: 'number', desc: 'Length (cm).' },
              { name: 'width', type: 'number', desc: 'Width (cm).' },
              { name: 'height', type: 'number', desc: 'Height (cm).' },
              { name: 'isActive', type: 'boolean', desc: 'Published vs draft. Defaults true.' },
              { name: 'isFeatured', type: 'boolean', desc: 'Featured flag. Defaults false.' },
              { name: 'trackInventory', type: 'boolean', desc: 'Whether stock is tracked. Defaults true.' },
              { name: 'freeDelivery', type: 'boolean', desc: 'Free-delivery flag.' },
              { name: 'variantOptions', type: 'object[]', desc: '[{ name, values[] }] option definitions.' },
              { name: 'variants', type: 'object[]', desc: '[{ title, sku?, price?, stock, image?, options }] variant rows.' },
            ]}
          />
          <div className="mt-4">
            <CodeBlock
              title="Create a product"
              language="bash"
              code={`curl -X POST https://api.balapasa.com/v1/api/products \\
  -H "Authorization: Bearer <jwt>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Himalayan Tea 250g",
    "slug": "himalayan-tea-250g",
    "description": "Loose-leaf black tea from Ilam.",
    "price": 450,
    "categoryId": "cat_beverages",
    "stock": 120,
    "images": ["https://cdn.balapasa.com/tea.jpg"]
  }'`}
            />
          </div>
        </EndpointCard>

        <EndpointCard
          method="PATCH"
          path="/api/products/[id]"
          auth="Public route"
          title="Update a product"
        >
          <p className="mb-3">
            A partial update — only the keys present in the body are written.
            Accepts the same fields as create, plus <code>kind</code> and{' '}
            <code>planId</code> (for subscription/digital products). When{' '}
            <code>variants</code> or <code>variantOptions</code> are present they
            are treated as the full desired state and replace existing rows.
            Toggling a sale on snapshots stock for the &quot;% claimed&quot; bar;
            toggling it off clears the snapshot. Returns the updated product.
          </p>
        </EndpointCard>

        <EndpointCard
          method="DELETE"
          path="/api/products/[id]"
          auth="Public route"
          title="Delete a product"
        >
          <p>
            Hard delete inside a transaction: reviews, wishlist items, inventory
            logs, variants, and options are removed first, then the product.
            Order history survives because <code>OrderItem</code> snapshots
            name/image and has no FK to the product. Image files on disk are
            kept. Returns{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
              &#123; success: true &#125;
            </code>
            .
          </p>
        </EndpointCard>
      </section>

      {/* Inventory */}
      <section className="space-y-5">
        <SectionHeading
          id="inventory"
          icon={Boxes}
          eyebrow="Stock"
          title="Inventory adjustments"
        >
          Record stock movements against the inventory ledger. Each adjustment
          mutates <code>Product.stock</code> and writes an{' '}
          <code>InventoryLog</code> row inside one transaction.
        </SectionHeading>

        <EndpointCard
          method="POST"
          path="/api/admin/inventory/adjust"
          auth="Admin (by convention)"
          title="Adjust stock"
        >
          <p className="mb-3">
            <code>PURCHASE</code>, <code>ADJUSTMENT</code>, and <code>RETURN</code>{' '}
            increase stock; <code>DAMAGE</code> decreases it. Stock never drops
            below zero. Fails with 400 if the product has{' '}
            <code>trackInventory: false</code>, 404 if it does not exist.
            Returns{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
              &#123; success, stock, product &#125;
            </code>
            .
          </p>
          <ParamTable
            rows={[
              { name: 'productId', type: 'string', required: true, desc: 'Product to adjust.' },
              { name: 'type', type: 'string', required: true, desc: 'PURCHASE | ADJUSTMENT | RETURN | DAMAGE.' },
              { name: 'quantity', type: 'number', required: true, desc: 'Magnitude; sign is derived from type.' },
              { name: 'note', type: 'string', desc: 'Optional ledger note.' },
            ]}
          />
          <div className="mt-4">
            <CodeBlock
              title="Receive a purchase"
              language="bash"
              code={`curl -X POST https://api.balapasa.com/v1/api/admin/inventory/adjust \\
  -H "Authorization: Bearer <jwt>" \\
  -H "Content-Type: application/json" \\
  -d '{ "productId": "prd_1", "type": "PURCHASE", "quantity": 50, "note": "Restock" }'`}
            />
          </div>
        </EndpointCard>

        <EndpointCard
          method="GET"
          path="/api/admin/inventory/logs"
          auth="Admin (by convention)"
          title="Inventory log"
        >
          <p>
            Returns the 200 most recent ledger entries, newest first, each with
            its product name. Shape:{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
              &#123; logs: [&#123; type, quantity, stockAfter, note, product:&#123; name &#125; &#125;] &#125;
            </code>
            . Returns an empty array on DB error.
          </p>
        </EndpointCard>
      </section>

      {/* Delivery */}
      <section className="space-y-5">
        <SectionHeading
          id="delivery"
          icon={Truck}
          eyebrow="Logistics"
          title="Delivery assignment"
        >
          Hand an order to a carrier. Check provider availability and fit, assign
          to Pathao / Pick &amp; Drop / a manual courier, retry a failed Pick
          &amp; Drop dispatch, or cancel an assignment.
        </SectionHeading>

        <EndpointCard
          method="GET"
          path="/api/admin/orders/[id]/providers"
          auth="requireRole('ADMIN')"
          title="Provider availability"
        >
          <p>
            Returns per-provider availability for the assignment UI: whether each
            carrier is enabled and whether this order&apos;s aggregated package
            fits its weight/dimension limits. Shape:{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
              &#123; PATHAO: &#123; active, withinLimits, reason, limits, pkg &#125;, PICKNDROP: &#123; … &#125; &#125;
            </code>
            . This route enforces the ADMIN role.
          </p>
        </EndpointCard>

        <EndpointCard
          method="GET"
          path="/api/admin/orders/[id]/assign-delivery"
          auth="Admin (by convention)"
          title="Estimate delivery cost"
        >
          <p className="mb-3">
            Estimates the delivery cost from one provider before assigning.
            Pass <code>?provider=PICKNDROP</code> to get Pick &amp; Drop rate
            options; the default (or <code>PATHAO</code>) returns a Pathao
            estimate using Kathmandu fallback coordinates.
          </p>
          <ParamTable
            rows={[
              { name: 'provider', type: 'string', desc: "PATHAO (default) or PICKNDROP." },
            ]}
          />
        </EndpointCard>

        <EndpointCard
          method="POST"
          path="/api/admin/orders/[id]/assign-delivery"
          auth="Admin (by convention)"
          title="Assign delivery"
        >
          <p className="mb-3">
            Creates the parcel with the chosen carrier, persists tracking fields
            on the order, moves status to <code>CONFIRMED</code>, and fires a
            delivery-dispatched email. The <code>type</code> field selects the
            branch. The tracking ID lands in <code>pathaoOrderId</code> for every
            carrier. Returns{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
              &#123; ok: true, order, … &#125;
            </code>
            ; an unknown type returns 400.
          </p>
          <ParamTable
            rows={[
              { name: 'type', type: 'string', required: true, desc: 'PATHAO | PICKNDROP | MANUAL.' },
              { name: 'sid', type: 'number', desc: 'PATHAO: Pathao store id.' },
              { name: 'serviceOptionId', type: 'number', desc: 'PATHAO: chosen delivery service option.' },
              { name: 'destinationBranch', type: 'string', desc: 'PICKNDROP: override the auto-resolved branch.' },
              { name: 'instruction', type: 'string', desc: 'PICKNDROP: rider/handling instruction.' },
              { name: 'weightKg', type: 'number', desc: 'PICKNDROP: override aggregated package weight.' },
              { name: 'lengthCm', type: 'number', desc: 'PICKNDROP: override package length.' },
              { name: 'widthCm', type: 'number', desc: 'PICKNDROP: override package width.' },
              { name: 'heightCm', type: 'number', desc: 'PICKNDROP: override package height.' },
              { name: 'trackingNumber', type: 'string', desc: 'MANUAL: external tracking number.' },
              { name: 'trackingUrl', type: 'string', desc: 'MANUAL / override: public tracking URL.' },
              { name: 'deliveryCharge', type: 'number', desc: 'Override the carrier-reported charge.' },
              { name: 'notes', type: 'string', desc: 'Appended to order notes under [Delivery].' },
            ]}
          />
          <div className="mt-4">
            <CodeBlock
              title="Assign to Pick & Drop"
              language="bash"
              code={`curl -X POST https://api.balapasa.com/v1/api/admin/orders/ord_123/assign-delivery \\
  -H "Authorization: Bearer <jwt>" \\
  -H "Content-Type: application/json" \\
  -d '{ "type": "PICKNDROP", "destinationBranch": "Kalanki" }'`}
            />
          </div>
        </EndpointCard>

        <EndpointCard
          method="POST"
          path="/api/admin/orders/[id]/dispatch-retry"
          auth="role === 'ADMIN'"
          title="Retry a failed Pick & Drop dispatch"
        >
          <p className="mb-3">
            Re-runs the Pick &amp; Drop <code>create_order</code> call for an
            order whose first dispatch failed (a{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
              PND_DISPATCH_FAILED:
            </code>{' '}
            sentinel lives in the order notes). On success it stores{' '}
            <code>pndOrderId</code> + <code>trackingUrl</code>, clears the
            sentinel, and emails the dispatch notice. Rejects orders that are not
            Pick &amp; Drop (400) or already have a tracking ID (400); a still-failing
            carrier call returns 502 with the error. This route requires the
            ADMIN role.
          </p>
          <ParamTable
            rows={[
              { name: 'destinationBranch', type: 'string', desc: 'Optional manual branch override when auto-resolution fails (a 400 response lists candidates).' },
            ]}
          />
        </EndpointCard>

        <EndpointCard
          method="POST"
          path="/api/admin/orders/[id]/cancel-delivery"
          auth="Admin (by convention)"
          title="Cancel delivery"
        >
          <p>
            Cancels a Pathao parcel via its <code>pathaoHash</code> (best-effort —
            a failed carrier cancel is reported under <code>warnings</code> but
            does not block), clears all delivery fields on the order, and reverts
            status to <code>PENDING</code>. Returns{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
              &#123; ok: true, order, warnings? &#125;
            </code>
            .
          </p>
        </EndpointCard>
      </section>

      {/* Billing */}
      <section className="space-y-5">
        <SectionHeading
          id="billing"
          icon={CreditCard}
          eyebrow="Back office"
          title="Plans, subscriptions &amp; invoices"
        >
          The subscription billing admin. These routes all enforce the MANAGER
          role (or higher) via <code>requireRole(&apos;MANAGER&apos;)</code>.
        </SectionHeading>

        <EndpointCard
          method="GET"
          path="/api/admin/plans"
          auth="requireRole('MANAGER')"
          title="List plans"
        >
          <p>
            Returns all plans, newest first, each with a{' '}
            <code>_count.subscriptions</code>. Shape:{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
              &#123; plans &#125;
            </code>
            .
          </p>
        </EndpointCard>

        <EndpointCard
          method="POST"
          path="/api/admin/plans"
          auth="requireRole('MANAGER')"
          title="Create a plan"
        >
          <p className="mb-3">
            Requires a non-empty <code>name</code>, an <code>amount</code> &gt; 0,
            and an <code>interval</code> of WEEKLY/MONTHLY/YEARLY (else 400).
            Returns{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
              &#123; plan &#125;
            </code>{' '}
            with 201.
          </p>
          <ParamTable
            rows={[
              { name: 'name', type: 'string', required: true, desc: 'Plan name.' },
              { name: 'amount', type: 'number', required: true, desc: 'Recurring amount; must be > 0.' },
              { name: 'interval', type: 'string', required: true, desc: 'WEEKLY | MONTHLY | YEARLY.' },
              { name: 'description', type: 'string', desc: 'Plan description.' },
              { name: 'image', type: 'string', desc: 'Plan image URL.' },
              { name: 'intervalCount', type: 'number', desc: 'Intervals per cycle. Defaults to 1.' },
              { name: 'trialDays', type: 'number', desc: 'Free trial length. Defaults to 0.' },
              { name: 'isActive', type: 'boolean', desc: 'Whether the plan is offered. Defaults true.' },
            ]}
          />
        </EndpointCard>

        <EndpointCard
          method="GET"
          path="/api/admin/subscriptions"
          auth="requireRole('MANAGER')"
          title="List subscriptions"
        >
          <p className="mb-3">
            Returns subscriptions newest first, each joined with a slim{' '}
            <code>plan</code>, an invoice <code>_count</code>, and a resolved{' '}
            <code>user</code> ( <code>&#123; id, name, email &#125;</code> looked
            up from profiles — there is no FK on <code>userId</code>). Optional{' '}
            <code>?status=</code> filter.
          </p>
          <ParamTable
            rows={[
              { name: 'status', type: 'string', desc: 'ACTIVE | PAST_DUE | CANCELLED | PAUSED | TRIALING.' },
            ]}
          />
        </EndpointCard>

        <EndpointCard
          method="POST"
          path="/api/admin/subscriptions"
          auth="requireRole('MANAGER')"
          title="Create a subscription"
        >
          <p className="mb-3">
            Requires <code>userId</code> and <code>planId</code> (else 400; 404 if
            the plan is missing). Computes the trial/period window from the plan
            and starts the subscription as <code>TRIALING</code> when a trial
            applies, otherwise <code>ACTIVE</code>. Returns{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
              &#123; subscription &#125;
            </code>{' '}
            with 201.
          </p>
          <ParamTable
            rows={[
              { name: 'userId', type: 'string', required: true, desc: 'Profile id of the subscriber.' },
              { name: 'planId', type: 'string', required: true, desc: 'Plan to subscribe to.' },
              { name: 'trialDays', type: 'number', desc: 'Override the plan trial length.' },
              { name: 'notes', type: 'string', desc: 'Internal note.' },
            ]}
          />
        </EndpointCard>

        <EndpointCard
          method="GET"
          path="/api/admin/invoices"
          auth="requireRole('MANAGER')"
          title="List invoices"
        >
          <p className="mb-3">
            Returns invoices newest first, each with its subscription/plan name
            and a resolved <code>user</code>. Optional <code>?status=</code>{' '}
            filter.
          </p>
          <ParamTable
            rows={[
              { name: 'status', type: 'string', desc: 'OPEN | PAID | OVERDUE | VOID.' },
            ]}
          />
        </EndpointCard>

        <EndpointCard
          method="POST"
          path="/api/admin/invoices"
          auth="requireRole('MANAGER')"
          title="Create a one-off invoice"
        >
          <p className="mb-3">
            Creates a standalone invoice (no subscription). Requires{' '}
            <code>userId</code> and an <code>amount</code> &gt; 0. The invoice{' '}
            <code>number</code> is generated server-side and the due date
            defaults to 7 days out. Returns{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
              &#123; invoice &#125;
            </code>{' '}
            with 201.
          </p>
          <ParamTable
            rows={[
              { name: 'userId', type: 'string', required: true, desc: 'Profile id to bill.' },
              { name: 'amount', type: 'number', required: true, desc: 'Invoice amount; must be > 0.' },
              { name: 'dueDate', type: 'string', desc: 'ISO due date. Defaults to +7 days.' },
              { name: 'notes', type: 'string', desc: 'Invoice note.' },
            ]}
          />
        </EndpointCard>
      </section>

      {/* Push */}
      <section className="space-y-5">
        <SectionHeading
          id="push"
          icon={Bell}
          eyebrow="Notifications"
          title="FCM registration"
        >
          Register the store device&apos;s FCM token so operators receive the
          order and delivery pushes the platform emits. Same endpoint the
          customer and rider apps use.
        </SectionHeading>

        <EndpointCard
          method="POST"
          path="/api/mobile/push"
          auth="Bearer or cookie"
          title="Register / refresh an FCM token"
        >
          <p className="mb-3">
            Upserts a <code>DeviceToken</code> keyed on the token, associating it
            with the authenticated user when a bearer token (or cookie) is
            present. Requires <code>token</code> (else 400). Returns{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
              &#123; registered: true &#125;
            </code>
            .
          </p>
          <ParamTable
            rows={[
              { name: 'token', type: 'string', required: true, desc: 'FCM registration token.' },
              { name: 'platform', type: 'string', desc: "'android' | 'ios'. Defaults to 'android'." },
            ]}
          />
        </EndpointCard>

        <EndpointCard
          method="DELETE"
          path="/api/mobile/push"
          auth="Bearer or cookie"
          title="Unregister a token"
        >
          <p>
            Removes the device token on logout. Requires <code>token</code> (else
            400). Returns{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
              &#123; removed: true &#125;
            </code>
            .
          </p>
        </EndpointCard>

        <Callout title="Push delivery caveats">
          Pushes target the device tokens of a specific <code>userId</code>;
          there is no per-role (customer / rider / store) segmentation yet, so
          store operators only receive pushes tied to their own user. Two
          platform-wide limitations also apply: the{' '}
          <code className="font-[family-name:var(--font-jetbrains)]">FCM_*</code>{' '}
          service-account env vars must be set or every push silently no-ops,
          and Pick &amp; Drop webhook status pushes currently fire with{' '}
          <code>userId: null</code>, so they never deliver.
        </Callout>
      </section>
    </div>
  )
}
