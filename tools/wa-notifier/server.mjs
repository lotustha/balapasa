/**
 * WhatsApp bot for balapasa alerts. Keeps one linked-device session open, sends alert text, and
 * answers a fixed set of commands from the configured "commanding numbers".
 *
 * Local-only HTTP API (127.0.0.1), every request needs `Authorization: Bearer <WA_NOTIFY_TOKEN>`:
 *   GET  /status                       { connected, me, pairing, commanders }
 *   POST /pair        { number }       link an account: returns { code } to enter on the phone
 *   POST /logout                       unlink the account and forget the session
 *   PUT  /commanders  { numbers: [] }  replace the commanding numbers
 *   POST /send        { text, to? }    send to `to`, or to every commanding number
 *
 * Environment:
 *   WA_NOTIFY_TOKEN  required
 *   WA_DATA_DIR      session + config (default /root/.balapasa-wa)
 *   WA_PORT          default 3099
 *   WA_APP_DIR       where the sync scripts live (default /www/wwwroot/balapasa)
 *   WA_SITE_URL      site checked by the `status` command (default https://balapasa.com.np)
 */
import http from 'node:http'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import pino from 'pino'
import * as baileysModule from '@whiskeysockets/baileys'

// The package is CommonJS: depending on the Node version its exports arrive on the namespace or under `default`.
const baileys = baileysModule.useMultiFileAuthState ? baileysModule : baileysModule.default
const makeWASocket = baileys.makeWASocket ?? baileys.default?.default ?? baileys.default
const { useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } = baileys

const TOKEN = process.env.WA_NOTIFY_TOKEN
const DATA_DIR = process.env.WA_DATA_DIR ?? '/root/.balapasa-wa'
const AUTH_DIR = path.join(DATA_DIR, 'auth')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
const PORT = Number(process.env.WA_PORT ?? 3099)
const APP_DIR = process.env.WA_APP_DIR ?? '/www/wwwroot/balapasa'
const SITE_URL = (process.env.WA_SITE_URL ?? 'https://balapasa.com.np').replace(/\/$/, '')
const MAX_TEXT = 3500
const MAX_COMMANDERS = 10
const COMMAND_TIMEOUT_MS = 5 * 60 * 1000

if (!TOKEN) { console.error('WA_NOTIFY_TOKEN is required'); process.exit(2) }
mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 })

const log = (...a) => console.log(new Date().toISOString(), ...a)

// A bare 10-digit Nepali mobile number gets the country code; anything else is taken as already international.
export function normalizeNumber(input) {
  const digits = String(input ?? '').replace(/\D/g, '').replace(/^00/, '')
  if (/^9\d{9}$/.test(digits)) return `977${digits}`
  return digits.length >= 8 && digits.length <= 15 ? digits : null
}

const config = existsSync(CONFIG_FILE) ? JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) : { commanders: [] }
const saveConfig = () => writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 })

let sock = null
let connected = false
let generation = 0
let pairing = null // { number, code, requestedAt }
let pairWaiter = null

async function connect({ pairNumber = null } = {}) {
  const mine = ++generation
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }))
  const s = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: 'silent' }),
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
  })
  sock = s
  let requested = false
  s.ev.on('creds.update', saveCreds)

  s.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (mine !== generation) return
    if (qr && !state.creds.registered && pairNumber && !requested) {
      requested = true
      try {
        const code = await s.requestPairingCode(pairNumber)
        pairing = { number: pairNumber, code, requestedAt: new Date().toISOString() }
        log(`pairing code issued for ${pairNumber}`)
        pairWaiter?.resolve(code)
      } catch (err) {
        log(`pairing code request failed: ${err.message}`)
        pairWaiter?.reject(err)
      }
    }
    if (connection === 'open') {
      connected = true
      pairing = null
      log(`connected as ${s.user?.id}`)
    }
    if (connection === 'close') {
      connected = false
      const status = lastDisconnect?.error?.output?.statusCode
      if (status === DisconnectReason.loggedOut) {
        log('logged out by WhatsApp; session cleared, waiting to be linked again')
        rmSync(AUTH_DIR, { recursive: true, force: true })
        pairing = null
        return
      }
      // Not linked and nobody is pairing: stay idle instead of spinning on QR timeouts.
      if (!state.creds.registered && !pairNumber) return
      log(`connection closed (${status ?? 'unknown'}), reconnecting in 5s`)
      setTimeout(() => { if (mine === generation) connect({ pairNumber: state.creds.registered ? null : pairNumber }).catch(err => log(`reconnect failed: ${err.message}`)) }, 5000)
    }
  })

  s.ev.on('messages.upsert', ({ messages, type }) => {
    if (mine !== generation || type !== 'notify') return
    for (const m of messages) handleIncoming(s, m).catch(err => log(`command failed: ${err.message}`))
  })
}

function stopSocket() {
  generation++
  connected = false
  try { sock?.end?.(undefined) } catch { /* already closed */ }
  sock = null
}

// ── commands ────────────────────────────────────────────────────────────────

const HELP = [
  'Balapasa bot commands:',
  'status  - is the site up, last sync results',
  'sync    - run the website and Daraz shop sync now',
  'held    - price changes waiting for approval',
  'approve - apply the held price changes',
  'help    - this list',
].join('\n')

let busy = false

function run(script, args = []) {
  return new Promise(resolve => {
    // The child's own alert would duplicate the reply we are about to send.
    const env = { ...process.env, WA_NOTIFY_URL: '', DISCORD_WEBHOOK_URL: '' }
    const child = spawn(process.execPath, [path.join('scripts', 'daraz', script), ...args], { cwd: APP_DIR, env })
    let out = ''
    const timer = setTimeout(() => child.kill(), COMMAND_TIMEOUT_MS)
    child.stdout.on('data', d => { out += d })
    child.stderr.on('data', d => { out += d })
    child.on('close', code => { clearTimeout(timer); resolve({ code, out: out.trim() }) })
    child.on('error', err => { clearTimeout(timer); resolve({ code: 1, out: err.message }) })
  })
}

function tail(file, lines) {
  try { return readFileSync(file, 'utf8').trim().split('\n').slice(-lines).join('\n') } catch { return '(no log yet)' }
}

async function siteLine() {
  try {
    const started = Date.now()
    const res = await fetch(`${SITE_URL}/api/products?limit=1`, { signal: AbortSignal.timeout(15000) })
    const body = await res.json().catch(() => ({}))
    return res.ok ? `Site: UP (${Date.now() - started} ms), ${body.total ?? '?'} products` : `Site: PROBLEM, HTTP ${res.status}`
  } catch (err) {
    return `Site: DOWN (${err.message})`
  }
}

async function execute(command) {
  switch (command) {
    case 'help': case 'hi': case 'hello': case 'menu':
      return HELP
    case 'status':
      return [await siteLine(), '', 'Last website sync:', tail('/var/log/balapasa-daraz-sync.log', 3), '', 'Last Daraz shop sync:', tail('/var/log/balapasa-daraz-mirror.log', 3)].join('\n')
    case 'sync': {
      const site = await run('daily-sync.mjs')
      const shop = await run('mirror-sync.mjs')
      return [site.out, '', shop.out].join('\n')
    }
    case 'held': {
      const { out } = await run('daily-sync.mjs', ['--dry-run'])
      const held = out.split('\n').filter(l => l.includes('HELD'))
      return held.length ? ['Held price changes (send "approve" to apply):', ...held].join('\n') : 'No price changes are being held.'
    }
    case 'approve':
      return (await run('daily-sync.mjs', ['--apply-held'])).out
    default:
      return `Unknown command "${command}".\n\n${HELP}`
  }
}

async function handleIncoming(s, m) {
  if (m.key.fromMe) return
  const jid = m.key.remoteJid ?? ''
  if (jid.endsWith('@g.us') || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) return
  const text = (m.message?.conversation ?? m.message?.extendedTextMessage?.text ?? '').trim()
  if (!text) return

  // WhatsApp may address a chat by a privacy id instead of the phone number; the number then arrives separately.
  const candidates = [jid, m.key.senderPn, m.key.participantPn, m.key.remoteJidAlt].filter(Boolean).map(j => String(j).split('@')[0].split(':')[0].replace(/\D/g, ''))
  if (!candidates.some(n => config.commanders.includes(n))) {
    log(`ignored message from ${candidates.join('/') || jid} (not a commanding number)`)
    return
  }

  const command = text.toLowerCase().split(/\s+/)[0]
  const slow = ['sync', 'held', 'approve'].includes(command)
  if (slow && busy) { await s.sendMessage(jid, { text: 'Still working on the previous command, try again in a minute.' }); return }
  if (slow) { busy = true; await s.sendMessage(jid, { text: 'Working on it...' }) }
  try {
    const answer = await execute(command)
    await s.sendMessage(jid, { text: (answer || '(no output)').slice(0, MAX_TEXT) })
  } finally {
    if (slow) busy = false
  }
}

// ── HTTP API ────────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk; if (data.length > 100_000) { reject(new Error('body too large')); req.destroy() } })
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}) } catch { reject(new Error('invalid JSON')) } })
    req.on('error', reject)
  })
}

const reply = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)) }
const statusBody = () => ({ connected, me: sock?.user?.id?.split(':')[0]?.split('@')[0] ?? null, pairing, commanders: config.commanders })

async function route(req, res) {
  const key = `${req.method} ${req.url}`
  if (req.headers.authorization !== `Bearer ${TOKEN}`) return reply(res, 401, { error: 'unauthorized' })

  if (key === 'GET /status') return reply(res, 200, statusBody())

  if (key === 'POST /pair') {
    const number = normalizeNumber((await readBody(req)).number)
    if (!number) return reply(res, 400, { error: 'Enter the WhatsApp number with country code, digits only' })
    if (connected) return reply(res, 409, { error: 'An account is already linked. Disconnect it first.' })
    stopSocket()
    rmSync(AUTH_DIR, { recursive: true, force: true })
    pairing = null
    const waiting = new Promise((resolve, reject) => { pairWaiter = { resolve, reject } })
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('WhatsApp did not answer in time, try again')), 30000))
    await connect({ pairNumber: number })
    try {
      const code = await Promise.race([waiting, timeout])
      return reply(res, 200, { code, number })
    } catch (err) {
      return reply(res, 502, { error: err.message })
    } finally {
      pairWaiter = null
    }
  }

  if (key === 'POST /logout') {
    try { await sock?.logout?.() } catch { /* already gone */ }
    stopSocket()
    rmSync(AUTH_DIR, { recursive: true, force: true })
    pairing = null
    return reply(res, 200, statusBody())
  }

  if (key === 'PUT /commanders') {
    const raw = (await readBody(req)).numbers
    if (!Array.isArray(raw)) return reply(res, 400, { error: 'numbers must be a list' })
    const numbers = [...new Set(raw.map(normalizeNumber))]
    if (numbers.includes(null)) return reply(res, 400, { error: 'One of the numbers is not valid' })
    if (numbers.length > MAX_COMMANDERS) return reply(res, 400, { error: `At most ${MAX_COMMANDERS} numbers` })
    config.commanders = numbers
    saveConfig()
    return reply(res, 200, statusBody())
  }

  if (key === 'POST /send') {
    if (!connected) return reply(res, 503, { error: 'WhatsApp is not connected' })
    const { text, to } = await readBody(req)
    if (typeof text !== 'string' || !text.trim()) return reply(res, 400, { error: 'text is required' })
    const recipients = to ? [normalizeNumber(to)] : config.commanders
    if (recipients.length === 0 || recipients.includes(null)) return reply(res, 400, { error: 'No valid recipient: add a commanding number first' })
    for (const number of recipients) await sock.sendMessage(`${number}@s.whatsapp.net`, { text: text.slice(0, MAX_TEXT) })
    return reply(res, 200, { sent: recipients.length })
  }

  return reply(res, 404, { error: 'not found' })
}

http.createServer((req, res) => {
  route(req, res).catch(err => { log(`request failed: ${err.message}`); reply(res, 500, { error: err.message }) })
}).listen(PORT, '127.0.0.1', () => log(`listening on 127.0.0.1:${PORT}`))

// Resume a linked session on start; an unlinked bot waits for /pair.
if (existsSync(path.join(AUTH_DIR, 'creds.json'))) connect().catch(err => log(`startup failed: ${err.message}`))
else log('no WhatsApp account linked yet')
