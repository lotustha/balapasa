# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server on http://localhost:3000
npm run build    # production build
npm run start    # serve production build
npm run lint     # run ESLint (eslint v9 flat config)
npx prisma generate          # regenerate Prisma client after schema changes
npx prisma migrate dev       # run migrations (requires DATABASE_URL in .env.local)
```

## Stack

- **Next.js 16.2.4** — App Router, `src/app/` directory, Turbopack by default; read `node_modules/next/dist/docs/` before writing Next.js code
- **React 19.2.4** — `params` and `searchParams` in page components are `Promise<...>` and must be `await`ed
- **Tailwind CSS v4** — `@import "tailwindcss"` in `globals.css`; theme tokens via `@theme inline {}`, not `tailwind.config.js`
- **Prisma 7** — **breaking change**: `url`/`directUrl` are NOT in `schema.prisma` anymore; they live in `prisma.config.ts`. Adapter: `@prisma/adapter-pg`
- **Supabase** — auth via `@supabase/ssr`; browser client in `src/lib/supabase/client.ts`, server client in `src/lib/supabase/server.ts`
- **Payments** — COD, eSewa (HMAC-SHA256 form POST), Khalti (REST API) — all in `src/lib/payment.ts`
- **Delivery** — Pathao Enterprise API in `src/lib/pathao.ts`; tokens cached in `pathao_tokens` table

## Route architecture

```
src/app/
  layout.tsx              root (fonts: Plus Jakarta Sans + Nunito, CartProvider)
  globals.css             theme tokens, animations, custom classes
  (shop)/layout.tsx       Navbar + Footer wrapper — all customer-facing routes
  (shop)/page.tsx         homepage
  (shop)/products/        listing + [slug] detail
  (shop)/cart/            cart page
  (shop)/checkout/        checkout (address → shipping → payment)
  (shop)/login/           Supabase auth
  (shop)/register/
  (shop)/account/         profile + orders
  (admin)/layout.tsx      sidebar admin layout
  (admin)/admin/          dashboard, products, orders
  api/products/           GET (list/search), POST (create), [id] PATCH/DELETE
  api/orders/             POST (create + payment initiation), GET (user orders)
  api/pathao/estimate/    POST delivery cost estimate
  api/payment/verify/     GET payment verification callback (eSewa + Khalti)
```

## Key conventions

- Pages are Server Components; `params`/`searchParams` must be `await`ed
- Interactive UI (filters, cart, forms) uses `'use client'` components — keep them as leaf nodes
- Prisma errors are caught per-page and fall back to mock data (no DB = site still works)
- Tailwind v4: add new colour tokens in `globals.css` `@theme inline {}` — `bg-primary`, `text-accent` etc. auto-generated
- ESLint v9 flat config (`eslint.config.mjs`) — do not create `.eslintrc.*`
- Social media icons are NOT in lucide-react — use inline SVG components (see `Footer.tsx`)
- Image hostnames must be whitelisted in `next.config.ts` under `images.remotePatterns`

## Setup checklist for new dev

1. Copy `.env.local.example` → `.env.local` and fill in Supabase + Pathao + eSewa + Khalti values
2. `npx prisma migrate dev` to create tables in Supabase
3. `npm run dev`
