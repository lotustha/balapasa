---
name: Balapasa Ecommerce Project
description: Full-stack ecommerce site — electronics, gadgets, facewash, beauty for teen to mid-age. Green brand (matches logo at assets/logo.png). Nepal-based.
type: project
---

Full-stack ecommerce built on Next.js 16 App Router + React 19 + Tailwind v4 + Prisma 7 + Supabase.

**Products:** Electronics, Gadgets, Facewash, Beauty (teen to mid-age audience)

**Brand:** Balapasa — green color scheme matching logo at `assets/logo.png` (also copied to `public/logo.png`)

**Payment:** COD + eSewa + Khalti (Nepal digital wallets)

**Delivery:** Pathao Enterprise API (instant delivery, standard, economy options)

**Why:** User wants a full production ecommerce site with smooth animations.

**How to apply:** Use emerald green as primary color, orange for accent/CTA. Keep payment options visible on checkout (COD, eSewa, Khalti). Pathao shipping options shown on checkout from API.

**Supabase:** User has NOT yet provided credentials. Placeholder in `.env.local.example`. User needs to create `.env.local` with their Supabase URL, anon key, service role key.

**Prisma 7:** Uses `prisma.config.ts` for connection URLs (breaking change from Prisma 6). Schema file no longer has `url` in datasource.

**Dev server:** Running on port 3000 (PID 18884). Site is live with mock data.
