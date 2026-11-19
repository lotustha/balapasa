// Sends a sync summary to whichever alert channels are configured. Never throws: an alert that
// cannot be delivered must not fail the sync that produced it.
//
//   WA_NOTIFY_URL + WA_NOTIFY_TOKEN   the local WhatsApp notifier (tools/wa-notifier)
//   DISCORD_WEBHOOK_URL               a Discord channel webhook

async function post(url, body, headers = {}) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 120)}`)
}

export async function notify(text) {
  const { WA_NOTIFY_URL, WA_NOTIFY_TOKEN, DISCORD_WEBHOOK_URL } = process.env
  const sends = []
  if (WA_NOTIFY_URL && WA_NOTIFY_TOKEN) sends.push(['whatsapp', post(`${WA_NOTIFY_URL.replace(/\/$/, '')}/send`, { text: text.slice(0, 3500) }, { Authorization: `Bearer ${WA_NOTIFY_TOKEN}` })])
  if (DISCORD_WEBHOOK_URL) sends.push(['discord', post(DISCORD_WEBHOOK_URL, { content: text.slice(0, 1900) })])
  for (const [channel, sending] of sends) {
    try { await sending } catch (err) { console.error(`${channel} notify failed: ${err.message}`) }
  }
}
