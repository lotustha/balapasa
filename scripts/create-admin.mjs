// Run: node scripts/create-admin.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey || serviceKey === 'your-service-role-key') {
  console.error('❌  Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EMAIL    = 'allthemyth@gmail.com'
const PASSWORD = 'asdf1234'

console.log('Creating admin user…')

const { data, error } = await admin.auth.admin.createUser({
  email: EMAIL, password: PASSWORD, email_confirm: true,
  user_metadata: { name: 'Kamal Shrestha', phone: '9843742374' },
})

if (error) {
  if (error.message.includes('already been registered')) {
    console.log('ℹ️  User already exists — resetting password…')
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const user = list?.users.find(u => u.email === EMAIL)
    if (user) {
      await admin.auth.admin.updateUserById(user.id, { password: PASSWORD })
      console.log('✅  Password reset. User ID:', user.id)
    }
  } else {
    console.error('❌  Error:', error.message)
  }
} else {
  console.log('✅  Admin created! User ID:', data.user.id)
  console.log('   Email:', EMAIL)
  console.log('   Password:', PASSWORD)
  console.log('')
  console.log('Now run the seed API or add the profile manually in Supabase.')
}
