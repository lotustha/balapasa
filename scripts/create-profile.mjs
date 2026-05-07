// Syncs admin profile to DB and sets app_metadata.role in Supabase JWT
// Run: node scripts/create-profile.mjs
import { config } from 'dotenv'
config({ path: '.env.local' })

import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const USER_ID = 'eefb86a4-9da0-4ccf-a4db-4dd62ecde879'
const EMAIL   = 'allthemyth@gmail.com'
const NAME    = 'Kamal Shrestha'
const PHONE   = '9843742374'
const ROLE    = 'ADMIN'

// 1. Upsert profile in DB
await pool.query(`
  INSERT INTO profiles (id, email, name, phone, role, created_at, updated_at)
  VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
  ON CONFLICT (email) DO UPDATE
    SET role = $5, name = $3, phone = $4, updated_at = NOW()
`, [USER_ID, EMAIL, NAME, PHONE, ROLE])
console.log('✅  DB profile upserted')

// 2. Set role in Supabase app_metadata (used by middleware for auth)
const { error } = await admin.auth.admin.updateUserById(USER_ID, {
  app_metadata: { role: ROLE },
})
if (error) console.error('⚠️  app_metadata update failed:', error.message)
else       console.log('✅  Supabase app_metadata.role =', ROLE)

console.log('\nDone! Log in at /login → redirects to /admin automatically.')
await pool.end()
