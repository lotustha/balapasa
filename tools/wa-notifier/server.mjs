/**
 * WhatsApp bot for balapasa alerts. Keeps one linked-device session open, sends alert text, and
 * answers a fixed set of commands from the configured "commanding numbers".
 *
 * Local-only HTTP API (127.0.0.1), every request needs `Authorization: Bearer <WA_NOTIFY_TOKEN>`:
 *   GET  /status                       { connected, me, pairing, qr, commanders }
 *   POST /link-qr                      link an account by QR: returns { qr }, later ones arrive in /status
 *   POST /pair        { number }       link an account by number: returns { code } to enter on the phone
 *   POST /logout                       unlink the account and forget the session
 *   PUT  /commanders  { numbers: [] }  replace the commanding numbers
 *   POST /send        { text, to? }    send to `to`, or to every commanding number
 *
 * Environment:
 *   WA_NOTIFY_TOKEN  required
 *   WA_DATA_DIR      session + config (default /root/.balapasa-wa)
 *   WA_PORT          default 3099
 *   WA_APP_DIR       where the sync scripts live (default /www/wwwroot/balapasa)
 */
import http from 'node:http'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import pino from 'pino'
import { parseMessage, createPending, summaryDue, createSentStore } from './bot-logic.mjs'
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
// The store itself answers the order, sales, stock and maintenance commands (/api/internal/bot).
const SITE_URL = (process.env.WA_SITE_URL ?? 'http://127.0.0.1:3002').replace(/\/$/, '')
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
config.lids ??= {} // commanding number -> WhatsApp privacy id, see resolveLids
const saveConfig = () => writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 })

let sock = null
// What was sent recently, so a phone that could not read a message can be given it again.
const sent = createSentStore()
const send = async (s, jid, text) => sent.remember(await s.sendMessage(jid, { text }))
let connected = false
let generation = 0
let pairing = null // { number, code, requestedAt }
let qrCode = null // latest QR payload while linking by QR
let pairWaiter = null

// `linked` = this session has been accepted by a phone before. While it is false we are in the middle of
// linking (by QR, or by pairing code when `pairNumber` is set) and a dropped connection means "start over".
async function connect({ pairNumber = null, linked = false } = {}) {
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
    // WhatsApp asks for a message again when the phone could not decrypt it. Without this the
    // phone shows "Waiting for this message" forever.
    getMessage: async key => sent.get(key?.id),
  })
  sock = s
  let requested = false
  s.ev.on('creds.update', saveCreds)

  s.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (mine !== generation) return
    if (qr && !linked) {
      if (!pairNumber) {
        qrCode = qr
        pairWaiter?.resolve(qr)
      } else if (!requested) {
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
    }
    if (connection === 'open') {
      connected = true
      linked = true
      pairing = null
      qrCode = null
      log(`connected as ${s.user?.id}`)
      resolveLids().catch(err => log(`privacy id lookup failed: ${err.message}`))
    }
    if (connection === 'close') {
      connected = false
      const status = lastDisconnect?.error?.output?.statusCode
      if (status === DisconnectReason.loggedOut) {
        log('logged out by WhatsApp; session cleared, waiting to be linked again')
        resetLink()
        return
      }
      // Right after the phone accepts, WhatsApp asks for a reconnect with the session it just issued.
      if (status === DisconnectReason.restartRequired) {
        log('phone accepted the link, reconnecting')
        connect({ linked: true }).catch(err => log(`reconnect failed: ${err.message}`))
        return
      }
      // The QR or pairing code was not used in time: a half-made session cannot be resumed.
      if (!linked) {
        log(`linking was not completed in time (${status ?? 'unknown'})`)
        resetLink()
        return
      }
      log(`connection closed (${status ?? 'unknown'}), reconnecting in 5s`)
      setTimeout(() => { if (mine === generation) connect({ linked: true }).catch(err => log(`reconnect failed: ${err.message}`)) }, 5000)
    }
  })

  s.ev.on('messages.upsert', ({ messages, type }) => {
    if (mine !== generation || type !== 'notify') return
    for (const m of messages) handleIncoming(s, m).catch(err => log(`command failed: ${err.message}`))
  })
}

// WhatsApp often delivers a chat under a privacy id ("lid") instead of the sender's phone number.
// Ask WhatsApp for the id behind each commanding number so their messages can still be recognised.
async function resolveLids() {
  if (!connected || !sock) return
  let changed = false
  for (const number of config.commanders) {
    if (config.lids[number]) continue
    try {
      const [found] = await sock.onWhatsApp(number)
      const lid = String(found?.lid ?? '').split('@')[0].split(':')[0].replace(/\D/g, '')
      if (lid) { config.lids[number] = lid; changed = true; log(`resolved privacy id for ${number}`) }
      else log(`no privacy id returned for ${number}${found ? '' : ' (number is not on WhatsApp?)'}`)
    } catch (err) {
      log(`could not resolve privacy id for ${number}: ${err.message}`)
    }
  }
  for (const number of Object.keys(config.lids)) if (!config.commanders.includes(number)) { delete config.lids[number]; changed = true }
  if (changed) saveConfig()
}

const isCommander = ids => ids.some(id => config.commanders.includes(id) || Object.values(config.lids).includes(id))

function stopSocket() {
  generation++
  connected = false
  try { sock?.end?.(undefined) } catch { /* already closed */ }
  sock = null
}

function resetLink() {
  stopSocket()
  pairing = null
  qrCode = null
  rmSync(AUTH_DIR, { recursive: true, force: true })
}

// Start linking and wait for WhatsApp's first answer: a QR payload, or a pairing code when a number is given.
async function startLinking(pairNumber) {
  resetLink()
  const waiting = new Promise((resolve, reject) => { pairWaiter = { resolve, reject } })
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('WhatsApp did not answer in time, try again')), 30000))
  try {
    await connect({ pairNumber })
    return await Promise.race([waiting, timeout])
  } finally {
    pairWaiter = null
  }
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
const pending = createPending()

// Asks the store. Returns { text, confirm } on an answer, null when the store does not know the command.
async function site(body) {
  try {
    const res = await fetch(`${SITE_URL}/api/internal/bot`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    })
    if (res.status === 404) return null
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { text: `The store did not answer that (${data.error ?? res.status}).` }
    return data
  } catch (err) {
    return { text: `Could not reach the store: ${err.message}` }
  }
}

function run(script, args = []) {
  return new Promise(resolve => {
    // The child's own alert would duplicate the reply we are about to send.
    const env = { ...process.env, WA_NOTIFY_URL: '', DISCORD_WEBHOOK_URL: '' }
    const child = spawn(process.execPath, [path.join('scripts', script), ...args], { cwd: APP_DIR, env })
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

async function execute(command, arg, chat) {
  // "yes" releases whatever this chat was asked to confirm; any other message drops it.
  if (command === 'yes') {
    const action = pending.take(chat)
    if (!action) return 'Nothing is waiting for a yes. Send the command again.'
    return (await site({ ...action, confirmed: true }))?.text ?? 'The store did not answer.'
  }
  pending.clear(chat)

  switch (command) {
    case 'help': case 'hi': case 'hello': case 'menu': {
      const more = await site({ command: 'help' })
      return more?.text && !/^Could not|^The store did not/.test(more.text) ? `${HELP}\n${more.text}` : HELP
    }
    case 'status': {
      const checks = await run('monitor/site-check.mjs', ['--report'])
      return [checks.out, '', 'Last website sync:', tail('/var/log/balapasa-daraz-sync.log', 3), '', 'Last Daraz shop sync:', tail('/var/log/balapasa-daraz-mirror.log', 3)].join('\n')
    }
    case 'sync': {
      const site = await run('daraz/daily-sync.mjs')
      const shop = await run('daraz/mirror-sync.mjs')
      return [site.out, '', shop.out].join('\n')
    }
    case 'held': {
      const { out } = await run('daraz/daily-sync.mjs', ['--dry-run'])
      const held = out.split('\n').filter(l => l.includes('HELD'))
      return held.length ? ['Held price changes (send "approve" to apply):', ...held].join('\n') : 'No price changes are being held.'
    }
    case 'approve':
      return (await run('daraz/daily-sync.mjs', ['--apply-held'])).out
    default: {
      const answer = await site({ command, arg })
      if (!answer) return `Unknown command "${command}". Send "help" for the list.`
      if (answer.confirm) pending.set(chat, { command, arg })
      return answer.text
    }
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
  if (!isCommander(candidates)) {
    // The id may belong to a commanding number we have not looked up yet (or whose id changed).
    config.lids = {}
    await resolveLids()
    if (!isCommander(candidates)) {
      log(`ignored message from ${candidates.join('/') || jid} (not a commanding number)`)
      return
    }
  }

  const { command, arg } = parseMessage(text)
  const slow = ['status', 'sync', 'held', 'approve'].includes(command)
  if (slow && busy) { await send(s, jid, 'Still working on the previous command, try again in a minute.'); return }
  if (slow) { busy = true; await send(s, jid, 'Working on it...') }
  try {
    const answer = await execute(command, arg, jid)
    await send(s, jid, (answer || '(no output)').slice(0, MAX_TEXT))
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
const statusBody = () => ({ connected, me: connected ? sock?.user?.id?.split(':')[0]?.split('@')[0] ?? null : null, pairing, qr: qrCode, commanders: config.commanders })

async function route(req, res) {
  const key = `${req.method} ${req.url}`
  if (req.headers.authorization !== `Bearer ${TOKEN}`) return reply(res, 401, { error: 'unauthorized' })

  if (key === 'GET /status') return reply(res, 200, statusBody())

  if (key === 'POST /pair') {
    const number = normalizeNumber((await readBody(req)).number)
    if (!number) return reply(res, 400, { error: 'Enter the WhatsApp number with country code, digits only' })
    if (connected) return reply(res, 409, { error: 'An account is already linked. Disconnect it first.' })
    try {
      return reply(res, 200, { code: await startLinking(number), number })
    } catch (err) {
      return reply(res, 502, { error: err.message })
    }
  }

  if (key === 'POST /link-qr') {
    if (connected) return reply(res, 409, { error: 'An account is already linked. Disconnect it first.' })
    try {
      return reply(res, 200, { qr: await startLinking(null) })
    } catch (err) {
      return reply(res, 502, { error: err.message })
    }
  }

  if (key === 'POST /logout') {
    try { await sock?.logout?.() } catch { /* already gone */ }
    resetLink()
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
    await resolveLids()
    return reply(res, 200, statusBody())
  }

  if (key === 'POST /send') {
    if (!connected) return reply(res, 503, { error: 'WhatsApp is not connected' })
    const { text, to } = await readBody(req)
    if (typeof text !== 'string' || !text.trim()) return reply(res, 400, { error: 'text is required' })
    const recipients = to ? [normalizeNumber(to)] : config.commanders
    if (recipients.length === 0 || recipients.includes(null)) return reply(res, 400, { error: 'No valid recipient: add a commanding number first' })
    for (const number of recipients) await send(sock, `${number}@s.whatsapp.net`, text.slice(0, MAX_TEXT))
    return reply(res, 200, { sent: recipients.length })
  }

  return reply(res, 404, { error: 'not found' })
}

http.createServer((req, res) => {
  route(req, res).catch(err => { log(`request failed: ${err.message}`); reply(res, 500, { error: err.message }) })
}).listen(PORT, '127.0.0.1', () => log(`listening on 127.0.0.1:${PORT}`))

// Daily summary at 8 pm Nepal time, to every commanding number. The store decides whether it is
// switched on ("summary off" / "summary on"); a day is marked done only once the store has answered.
setInterval(async () => {
  const date = summaryDue(new Date(), config.lastSummaryDate)
  if (!date || !connected || !sock || config.commanders.length === 0) return
  config.lastSummaryDate = date
  saveConfig()
  const answer = await site({ command: 'summary', scheduled: true })
  if (!answer) return
  if (/^Could not reach the store|^The store did not answer/.test(answer.text ?? '')) {
    // Try again on the next tick rather than skipping the day.
    config.lastSummaryDate = null
    saveConfig()
    return
  }
  if (!answer.text) return
  for (const number of config.commanders) {
    try { await send(sock, `${number}@s.whatsapp.net`, answer.text.slice(0, MAX_TEXT)) }
    catch (err) { log(`daily summary to ${number} failed: ${err.message}`) }
  }
  log(`daily summary sent for ${date}`)
}, 60_000).unref()

// Resume a linked session on start; an unlinked bot waits for /pair.
if (existsSync(path.join(AUTH_DIR, 'creds.json'))) connect({ linked: true }).catch(err => log(`startup failed: ${err.message}`))
else log('no WhatsApp account linked yet')
