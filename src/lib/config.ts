// Central store configuration — reads from environment variables.
// Set NEXT_PUBLIC_STORE_NAME and NEXT_PUBLIC_APP_URL in .env.local
export const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? 'Balapasa'
export const STORE_URL  = process.env.NEXT_PUBLIC_APP_URL   ?? 'https://balapasa.com'
