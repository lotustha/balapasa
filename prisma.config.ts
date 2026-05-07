import { config } from "dotenv";
// Load .env.local first (Next.js convention) then fall back to .env
config({ path: ".env.local" });
config({ path: ".env" });

import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL (non-pooler) for migrations so DDL statements work
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
    adapter(url: string) {
      return new PrismaPg({ connectionString: url });
    },
  },
});
