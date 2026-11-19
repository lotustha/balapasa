/**
 * WhatsApp alert sender. Keeps one linked-device session open and exposes a local-only HTTP API:
 *
 *   GET  /health                      -> { connected, me }
 *   POST /send  { text, to? }         -> sends `text` to `to` (digits, with country code) or to WA_NOTIFY_TO
 *
 * Environment:
 *   WA_AUTH_DIR      where the session is stored (default /root/.balapasa-wa/auth)
 *   WA_PORT          default 3099, bound to 127.0.0.1 only
 *   WA_NOTIFY_TOKEN  bearer token every /send request must carry
 *   WA_NOTIFY_TO     default recipients, comma-separated numbers with country code
 *   WA_PAIR_NUMBER   on first start only: the sender's number, to print a pairing code instead of a QR
 */
import http from 'node:http'
import { mkdirSync } from 'node:fs'
import pino from 'pino'
import baileys from '@whiskeysockets/baileys'

const makeWASocket = baileys.default ?? baileys.makeWASocket ?? baileys
const { useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } = baileys

const AUTH_DIR = process.env.WA_AUTH_DIR ?? '/root/.balapasa-wa/auth'
const PORT = Number(process.env.WA_PORT ?? 3099)
const TOKEN = process.env.WA_NOTIFY_TOKEN
const DEFAULT_TO = (process.env.WA_NOTIFY_TO ?? '').split(',').map(s => s.replace(/\D/g, '')).filter(Boolean)
const PAIR_NUMBER = (process.env.WA_PAIR_NUMBER ?? '').replace(/\D/g, '')
const MAX_TEXT = 3500

if (!TOKEN) { console.error('WA_NOTIFY_TOKEN is required'); process.exit(2) }
mkdirSync(AUTH_DIR, { recursive: true })

const log = (...a) => console.log(new Date().toISOString(), ...a)
let sock = null
let connected = false
let pairingRequested = false

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }))
  sock = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: 'silent' }),
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
  })
  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect, qr } = update
    if (qr && !state.creds.registered) {
      if (PAIR_NUMBER && !pairingRequested) {
        pairingRequested = true
        try {
          const code = await sock.requestPairingCode(PAIR_NUMBER)
          log(`PAIRING CODE for ${PAIR_NUMBER}: ${code}`)
        } catch (err) {
          pairingRequested = false
          log(`pairing code request failed: ${err.message}`)
        }
      } else if (!PAIR_NUMBER) {
        log('not linked: set WA_PAIR_NUMBER and restart to get a pairing code')
      }
    }
    if (connection === 'open') {
      connected = true
      log(`connected as ${sock.user?.id}`)
    }
    if (connection === 'close') {
      connected = false
      pairingRequested = false
      const status = lastDisconnect?.error?.output?.statusCode
      if (status === DisconnectReason.loggedOut) {
        log('logged out by WhatsApp: the device must be linked again (delete the auth dir and pair)')
        return
      }
      log(`connection closed (${status ?? 'unknown'}), reconnecting in 5s`)
      setTimeout(() => connect().catch(err => log(`reconnect failed: ${err.message}`)), 5000)
    }
  })
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk; if (data.length > 100_000) { reject(new Error('body too large')); req.destroy() } })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

const reply = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)) }

http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') return reply(res, 200, { connected, me: sock?.user?.id ?? null })
    if (req.method !== 'POST' || req.url !== '/send') return reply(res, 404, { error: 'not found' })
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return reply(res, 401, { error: 'unauthorized' })
    if (!connected) return reply(res, 503, { error: 'whatsapp not connected' })

    const { text, to } = JSON.parse(await readBody(req))
    if (typeof text !== 'string' || !text.trim()) return reply(res, 400, { error: 'text is required' })
    const recipients = to ? [String(to).replace(/\D/g, '')] : DEFAULT_TO
    if (recipients.length === 0) return reply(res, 400, { error: 'no recipient: pass "to" or set WA_NOTIFY_TO' })

    for (const number of recipients) await sock.sendMessage(`${number}@s.whatsapp.net`, { text: text.slice(0, MAX_TEXT) })
    reply(res, 200, { sent: recipients.length })
  } catch (err) {
    log(`request failed: ${err.message}`)
    reply(res, 500, { error: err.message })
  }
}).listen(PORT, '127.0.0.1', () => log(`listening on 127.0.0.1:${PORT}`))

connect().catch(err => { log(`startup failed: ${err.message}`); process.exit(1) })
