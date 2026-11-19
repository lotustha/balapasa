// Sends one alert message from a shell script: node scripts/ops/notify-cli.mjs "text"
import { config } from 'dotenv'
import { notify } from '../daraz/notify.mjs'

config({ path: '.env.local', quiet: true })
const text = process.argv.slice(2).join(' ').trim()
if (!text) { console.error('usage: notify-cli.mjs <message>'); process.exit(2) }
await notify(text)
