/**
 * Website monitor. Run every 5 minutes from cron on the server:
 *
 *   node scripts/monitor/site-check.mjs            check, and alert on changes
 *   node scripts/monitor/site-check.mjs --report   print every result, alert nobody, keep no state
 *
 * It checks the public site the way a visitor reaches it, the two daily sync jobs, the WhatsApp bot,
 * the TLS certificate and the disk. Alerts go out through scripts/daraz/notify.mjs.
 *
 * MONITOR_SITE_URL    default https://balapasa.com.np
 * MONITOR_STATE_FILE  default /root/.balapasa-wa/monitor-state.json
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import tls from 'node:tls'
import { config } from 'dotenv'
import { notify } from '../daraz/notify.mjs'
import { evaluate } from './evaluate.mjs'

config({ path: '.env.local', quiet: true })

const REPORT_ONLY = process.argv.includes('--report')
const SITE = (process.env.MONITOR_SITE_URL ?? 'https://balapasa.com.np').replace(/\/$/, '')
const STATE_FILE = process.env.MONITOR_STATE_FILE ?? '/root/.balapasa-wa/monitor-state.json'
const TIMEOUT_MS = 20_000
const SLOW_MS = 8_000
const CERT_WARN_DAYS = 10
const DISK_WARN_PERCENT = 90
// The syncs run once a day; a log untouched for longer than this means a run was missed.
const SYNC_MAX_AGE_HOURS = 26
const SYNC_LOGS = [
  ['Website price sync', '/var/log/balapasa-daraz-sync.log', /Daraz sync FAILED/],
  ['Daraz shop sync', '/var/log/balapasa-daraz-mirror.log', /mirror sync FAILED/],
]

const result = (name, ok, detail) => ({ name, ok, detail })

async function fetchCheck(name, url, verify) {
  const started = Date.now()
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'User-Agent': 'balapasa-monitor' } })
    const ms = Date.now() - started
    if (!res.ok) return result(name, false, `HTTP ${res.status}`)
    const problem = await verify(res)
    if (problem) return result(name, false, problem)
    if (ms > SLOW_MS) return result(name, false, `very slow: ${(ms / 1000).toFixed(1)} s`)
    return result(name, true, `${ms} ms`)
  } catch (err) {
    return result(name, false, err.name === 'TimeoutError' ? `no answer in ${TIMEOUT_MS / 1000} s` : `unreachable (${err.cause?.code ?? err.message})`)
  }
}

async function siteChecks() {
  let slug = null
  const api = await fetchCheck('Products API', `${SITE}/api/products?limit=1`, async res => {
    const body = await res.json().catch(() => null)
    if (!body || !Array.isArray(body.products)) return 'did not return a product list'
    if (!(body.total > 0)) return 'the catalog is empty'
    slug = body.products[0]?.slug ?? null
    return null
  })
  const html = marker => async res => ((await res.text()).includes(marker) ? null : 'page loaded but its content is missing')
  const pages = await Promise.all([
    fetchCheck('Homepage', `${SITE}/`, html('</html>')),
    fetchCheck('Products page', `${SITE}/products`, html('Product categories')),
    slug ? fetchCheck('Product page', `${SITE}/products/${slug}`, html('</html>')) : null,
  ])
  return [api, ...pages.filter(Boolean)]
}

function certificateCheck() {
  const { hostname, protocol } = new URL(SITE)
  if (protocol !== 'https:') return Promise.resolve(null)
  return new Promise(resolve => {
    const socket = tls.connect({ host: hostname, port: 443, servername: hostname, timeout: TIMEOUT_MS }, () => {
      const cert = socket.getPeerCertificate()
      socket.end()
      const days = Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000)
      resolve(result('SSL certificate', days >= CERT_WARN_DAYS, days >= 0 ? `expires in ${days} days` : 'has expired'))
    })
    socket.on('error', err => resolve(result('SSL certificate', false, `could not be read (${err.code ?? err.message})`)))
    socket.on('timeout', () => { socket.destroy(); resolve(result('SSL certificate', false, 'could not be read (timeout)')) })
  })
}

function syncChecks() {
  return SYNC_LOGS.filter(([, file]) => existsSync(file)).map(([name, file, failed]) => {
    const hours = (Date.now() - statSync(file).mtimeMs) / 3_600_000
    if (hours > SYNC_MAX_AGE_HOURS) return result(name, false, `has not run for ${Math.round(hours)} hours`)
    const lines = readFileSync(file, 'utf8').trim().split('\n')
    const last = lines.findLast(l => /sync|mirror/i.test(l)) ?? ''
    return failed.test(last) ? result(name, false, last.slice(0, 160)) : result(name, true, `ran ${Math.round(hours)} h ago`)
  })
}

async function botCheck() {
  const { WA_NOTIFY_URL, WA_NOTIFY_TOKEN } = process.env
  if (!WA_NOTIFY_URL || !WA_NOTIFY_TOKEN) return null
  try {
    const res = await fetch(`${WA_NOTIFY_URL.replace(/\/$/, '')}/status`, { headers: { Authorization: `Bearer ${WA_NOTIFY_TOKEN}` }, signal: AbortSignal.timeout(5000) })
    const body = await res.json()
    return result('WhatsApp bot', body.connected === true, body.connected ? 'connected' : 'no WhatsApp account is linked')
  } catch {
    return result('WhatsApp bot', false, 'the bot service is not running')
  }
}

function diskCheck() {
  try {
    const used = Number(execFileSync('df', ['--output=pcent', '/'], { encoding: 'utf8' }).trim().split('\n').pop().replace(/\D/g, ''))
    return result('Disk space', used < DISK_WARN_PERCENT, `${used}% used`)
  } catch {
    return null
  }
}

const results = [...await siteChecks(), await certificateCheck(), ...syncChecks(), await botCheck(), diskCheck()].filter(Boolean)

if (REPORT_ONLY) {
  for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.name}: ${r.detail}`)
  process.exit(results.every(r => r.ok) ? 0 : 1)
}

const previous = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : {}
const { messages, state } = evaluate(results, previous)
mkdirSync(path.dirname(STATE_FILE), { recursive: true })
writeFileSync(STATE_FILE, JSON.stringify(state))
for (const message of messages) {
  console.log(`${new Date().toISOString()} ${message.replace(/\n/g, ' | ')}`)
  await notify(message)
}
