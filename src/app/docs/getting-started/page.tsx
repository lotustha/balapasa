import type { Metadata } from 'next'
import { KeyRound, Terminal, AlertTriangle } from 'lucide-react'
import CodeBlock from '../components/CodeBlock'
import EndpointCard from '../components/EndpointCard'
import ParamTable from '../components/ParamTable'
import MethodBadge from '../components/MethodBadge'

export const metadata: Metadata = {
  title: 'Getting Started — Balapasa Platform API',
  description:
    'Base URLs, the bearer-token auth model, the full auth lifecycle, error format, and pagination for the Balapasa platform API.',
}

export default function GettingStartedPage() {
  return (
    <div className="space-y-14">
      {/* Hero */}
      <section>
        <p className="mb-3 font-[family-name:var(--font-jetbrains)] text-sm font-medium uppercase tracking-wide text-emerald-400">
          Getting Started
        </p>
        <h1 className="font-[family-name:var(--font-jetbrains)] text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          Make your first request
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          The Balapasa API is a JSON-over-HTTPS REST surface shared by the
          customer, rider, and store apps. This guide covers the base URLs,
          how authentication works for mobile clients, the full auth
          lifecycle, the standard error format, and how list endpoints
          paginate.
        </p>
      </section>

      {/* Base URL & environments */}
      <section>
        <h2 className="mb-2 font-[family-name:var(--font-jetbrains)] text-xl font-semibold text-slate-100">
          Base URL &amp; environments
        </h2>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-slate-400">
          Every request is made over HTTPS to an environment-specific base
          URL. Endpoint paths below are written relative to that base — e.g.
          a path of{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            /api/mobile/auth
          </code>{' '}
          against production resolves to{' '}
          <code className="font-[family-name:var(--font-jetbrains)] break-all text-slate-300">
            https://api.balapasa.com/v1/api/mobile/auth
          </code>
          . Integrate against the sandbox, then switch the base URL once your
          build is approved for production.
        </p>
        <dl className="space-y-2 rounded-lg bg-slate-800/40 p-5 text-sm ring-1 ring-slate-700/60">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
            <dt className="w-24 shrink-0 text-slate-500">Production</dt>
            <dd className="font-[family-name:var(--font-jetbrains)] break-all text-emerald-400">
              https://api.balapasa.com/v1
            </dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
            <dt className="w-24 shrink-0 text-slate-500">Sandbox</dt>
            <dd className="font-[family-name:var(--font-jetbrains)] break-all text-sky-400">
              https://sandbox.balapasa.com/v1
            </dd>
          </div>
        </dl>
      </section>

      {/* Authentication */}
      <section>
        {/* Anchor target for /docs/getting-started#auth */}
        <a id="auth" />
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-emerald-400" />
          <h2 className="font-[family-name:var(--font-jetbrains)] text-xl font-semibold text-slate-100">
            Authentication
          </h2>
        </div>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-slate-400">
          The API uses a signed JWT (HS256, 7-day expiry) carrying{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            {'{ sub, email, role, name? }'}
          </code>
          . Mobile apps use the <strong className="text-slate-200">bearer-token</strong>{' '}
          model: log in or register to receive a{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            token
          </code>{' '}
          in the response body, store it securely on the device, and send it
          as an{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            Authorization: Bearer
          </code>{' '}
          header on subsequent requests. The token is valid for 7 days — call{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            POST /api/mobile/refresh
          </code>{' '}
          on app launch (while the token is still valid) to roll a fresh 7-day
          window and avoid a silent logout.
        </p>

        <CodeBlock
          title="Authenticated request"
          language="http"
          code={`GET /v1/api/wishlist HTTP/1.1
Host: api.balapasa.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`}
        />

        <div className="mt-4 flex gap-3 rounded-lg border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-slate-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-100">
              Web alternative.
            </span>{' '}
            Login and register also set the token in an{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-sky-300">
              httpOnly
            </code>{' '}
            cookie named{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-sky-300">
              auth-token
            </code>{' '}
            so the browser app is authenticated automatically. Mobile clients
            ignore the cookie and rely on the bearer header. Resource
            endpoints accept whichever is present — the bearer header takes
            precedence, falling back to the cookie.
          </p>
        </div>

        <div className="mt-4 flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-slate-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-100">Roles.</span> Every
            token carries a{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-amber-300">
              role
            </code>{' '}
            that gates access in increasing order of privilege:{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
              CUSTOMER
            </code>{' '}
            &lt;{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
              STAFF
            </code>{' '}
            &lt;{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
              MANAGER
            </code>{' '}
            &lt;{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
              ADMIN
            </code>
            . Calling an endpoint above your role returns{' '}
            <code className="font-[family-name:var(--font-jetbrains)] text-rose-300">
              403 Forbidden
            </code>
            .
          </p>
        </div>
      </section>

      {/* Auth lifecycle */}
      <section>
        <h2 className="mb-2 font-[family-name:var(--font-jetbrains)] text-xl font-semibold text-slate-100">
          Auth lifecycle
        </h2>
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-slate-400">
          Mobile clients should use the{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            /api/mobile/*
          </code>{' '}
          endpoints — they are the only ones that return the token in the body.
          The remaining endpoints power the web session (cookie) and shared
          account flows.
        </p>

        <div className="space-y-5">
          {/* Mobile login */}
          <EndpointCard
            method="POST"
            path="/api/mobile/auth"
            auth="Public"
            title="Log in (mobile)"
          >
            <p className="mb-3 leading-relaxed">
              Exchanges email + password for a JWT. Returns the token in the
              body (use this for the bearer header) and also sets the{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
                auth-token
              </code>{' '}
              cookie.
            </p>
            <ParamTable
              rows={[
                { name: 'email', type: 'string', required: true, desc: 'Account email address.' },
                { name: 'password', type: 'string', required: true, desc: 'Account password.' },
              ]}
            />
            <div className="mt-4">
              <CodeBlock
                title="200 OK"
                language="json"
                code={`{
  "token": "eyJhbGciOiJIUzI1NiI...",
  "user": {
    "id": "ckxq...",
    "email": "shopper@example.com",
    "name": "Sita Rai",
    "role": "CUSTOMER",
    "phone": "98XXXXXXXX"
  }
}`}
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Returns{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-rose-400">
                401
              </code>{' '}
              for invalid credentials,{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-rose-400">
                400
              </code>{' '}
              when email or password is missing.
            </p>
          </EndpointCard>

          {/* Mobile register */}
          <EndpointCard
            method="POST"
            path="/api/mobile/register"
            auth="Public"
            title="Register (mobile)"
          >
            <p className="mb-3 leading-relaxed">
              Creates a{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
                CUSTOMER
              </code>{' '}
              account and signs in immediately, returning the same{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
                {'{ token, user }'}
              </code>{' '}
              shape as login.
            </p>
            <ParamTable
              rows={[
                { name: 'email', type: 'string', required: true, desc: 'Unique account email.' },
                { name: 'password', type: 'string', required: true, desc: 'Minimum 8 characters.' },
                { name: 'name', type: 'string', required: false, desc: 'Display name.' },
                { name: 'phone', type: 'string', required: false, desc: 'Contact phone number.' },
              ]}
            />
            <p className="mt-3 text-xs text-slate-500">
              Returns{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-rose-400">
                409
              </code>{' '}
              if the email is already registered,{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-rose-400">
                400
              </code>{' '}
              if the password is under 8 characters.
            </p>
          </EndpointCard>

          {/* Token refresh */}
          <EndpointCard
            method="POST"
            path="/api/mobile/refresh"
            auth="Bearer / Cookie"
            title="Refresh the session token"
          >
            <p className="mb-3 leading-relaxed">
              Exchanges a still-valid token for a fresh 7-day one (sliding
              session). Send the current token as a bearer header; the response
              is the same{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
                {'{ token, user }'}
              </code>{' '}
              shape as login. The profile is re-read, so the new token reflects
              any role or name change. Call it on app launch and/or periodically.
            </p>
            <CodeBlock
              title="Refresh request"
              language="http"
              code={`POST /v1/api/mobile/refresh HTTP/1.1
Host: api.balapasa.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`}
            />
            <p className="mt-3 text-xs text-slate-500">
              Returns{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-rose-400">
                401
              </code>{' '}
              when the token has already expired — route the user back through
              login. There is no separate refresh-token; refresh only works
              while the access token is still valid.
            </p>
          </EndpointCard>

          {/* Magic link request */}
          <EndpointCard
            method="POST"
            path="/api/auth/magic-link/request"
            auth="Public"
            title="Request a magic link"
          >
            <p className="mb-3 leading-relaxed">
              Emails a one-time sign-in link to a registered address (valid 7
              days). For privacy, the response is{' '}
              <strong className="text-slate-200">always</strong>{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
                {'{ "success": true }'}
              </code>{' '}
              — it never reveals whether the email exists.
            </p>
            <ParamTable
              rows={[
                { name: 'email', type: 'string', required: true, desc: 'Address to send the login link to.' },
              ]}
            />
          </EndpointCard>

          {/* Magic link verify */}
          <EndpointCard
            method="GET"
            path="/api/auth/magic-link/verify?token=…"
            auth="Public"
            title="Verify a magic link"
          >
            <p className="leading-relaxed">
              The link target. Consumes a{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
                login
              </code>{' '}
              token, sets the{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
                auth-token
              </code>{' '}
              cookie, and responds with a{' '}
              <strong className="text-slate-200">302 redirect</strong> to{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
                /account
              </code>
              . Missing or expired tokens redirect to{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
                /login?magic=invalid
              </code>{' '}
              instead of erroring. There is no JSON body.
            </p>
          </EndpointCard>

          {/* Setup password */}
          <EndpointCard
            method="POST"
            path="/api/auth/setup-password"
            auth="Public (magic token)"
            title="Activate account / set password"
          >
            <p className="mb-3 leading-relaxed">
              Claims a magic token to set the first password on an account
              that has none, signs the user in (sets the cookie), and issues a
              single-use welcome coupon. Re-using a token after activation
              returns{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-rose-400">
                409
              </code>
              .
            </p>
            <ParamTable
              rows={[
                { name: 'token', type: 'string', required: true, desc: 'Magic token from the activation email.' },
                { name: 'password', type: 'string', required: true, desc: 'New password, minimum 8 characters.' },
              ]}
            />
            <div className="mt-4">
              <CodeBlock
                title="200 OK"
                language="json"
                code={`{
  "success": true,
  "couponCode": "WELCOME-AB12CD",
  "user": { "id": "ckxq...", "email": "shopper@example.com", "name": "Sita Rai" }
}`}
              />
            </div>
          </EndpointCard>

          {/* /me */}
          <EndpointCard
            method="GET"
            path="/api/auth/me"
            auth="Cookie session"
            title="Current session"
          >
            <p className="mb-3 leading-relaxed">
              Returns the role and name of the cookie-authenticated user, or{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
                {'{ "role": null }'}
              </code>{' '}
              when there is no valid session. This endpoint reads the{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
                auth-token
              </code>{' '}
              cookie — it is the web session check. Mobile clients decode the
              JWT they already hold instead.
            </p>
            <CodeBlock
              title="200 OK"
              language="json"
              code={`{ "role": "CUSTOMER", "name": "Sita Rai" }`}
            />
          </EndpointCard>

          {/* Logout */}
          <EndpointCard
            method="POST"
            path="/api/auth/logout"
            auth="Cookie session"
            title="Log out"
          >
            <p className="mb-3 leading-relaxed">
              Clears the{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
                auth-token
              </code>{' '}
              cookie. Mobile clients simply discard their stored token — the
              JWT remains valid until it expires, so treat sign-out as a
              client-side delete.
            </p>
            <CodeBlock
              title="200 OK"
              language="json"
              code={`{ "success": true }`}
            />
          </EndpointCard>
        </div>
      </section>

      {/* Errors */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Terminal className="h-5 w-5 text-emerald-400" />
          <h2 className="font-[family-name:var(--font-jetbrains)] text-xl font-semibold text-slate-100">
            Errors
          </h2>
        </div>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-slate-400">
          Errors use the HTTP status code plus a flat JSON body with a single{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            error
          </code>{' '}
          string. There is no nested error object or machine-readable code —
          branch on the status code.
        </p>
        <CodeBlock
          title="Error response"
          language="json"
          code={`{ "error": "Invalid credentials" }`}
        />
        <div className="mt-5 overflow-x-auto rounded-lg ring-1 ring-slate-700/60">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 bg-slate-800/60">
                <th className="px-4 py-2.5 font-semibold text-slate-200">Status</th>
                <th className="px-4 py-2.5 font-semibold text-slate-200">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['400', 'Bad Request — missing or invalid input.'],
                ['401', 'Unauthorized — bad credentials or no valid token.'],
                ['403', 'Forbidden — authenticated but role is too low.'],
                ['404', 'Not Found — the resource or account does not exist.'],
                ['409', 'Conflict — e.g. email already registered, account already activated.'],
                ['500', 'Internal Server Error — unexpected failure.'],
              ].map(([code, meaning]) => (
                <tr
                  key={code}
                  className="border-b border-slate-800 last:border-0 transition-colors duration-200 hover:bg-slate-800/40"
                >
                  <td className="px-4 py-2.5 font-[family-name:var(--font-jetbrains)] text-rose-400">
                    {code}
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pagination */}
      <section>
        <h2 className="mb-2 font-[family-name:var(--font-jetbrains)] text-xl font-semibold text-slate-100">
          Pagination
        </h2>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-slate-400">
          List endpoints such as{' '}
          <span className="inline-flex translate-y-px items-center align-middle">
            <MethodBadge method="GET" />
          </span>{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            /api/products
          </code>{' '}
          page with{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            page
          </code>{' '}
          and{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            limit
          </code>{' '}
          query parameters and return totals alongside the items.
        </p>
        <ParamTable
          rows={[
            { name: 'page', type: 'integer', required: false, desc: 'Page number, 1-based. Defaults to 1.' },
            { name: 'limit', type: 'integer', required: false, desc: 'Items per page. Defaults to 24.' },
          ]}
        />
        <div className="mt-4">
          <CodeBlock
            title="GET /api/products?page=2&limit=24"
            language="json"
            code={`{
  "products": [ /* ...up to 24 items... */ ],
  "total": 137,
  "page": 2,
  "totalPages": 6
}`}
          />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            totalPages
          </code>{' '}
          is{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            ceil(total / limit)
          </code>
          . You have reached the last page when{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            page
          </code>{' '}
          equals{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            totalPages
          </code>
          .
        </p>
      </section>
    </div>
  )
}
