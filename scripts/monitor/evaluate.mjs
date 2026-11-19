// Decides which monitor results are worth a message. Pure: (results, previous state, now) -> { messages, state }.
//
// A check must fail twice in a row before anyone is told (one slow response is not an outage), a
// continuing problem is repeated every REMIND_MS, and a problem that was announced gets an all-clear.

export const FAILS_BEFORE_ALERT = 2
export const REMIND_MS = 6 * 60 * 60 * 1000

export function evaluate(results, previous = {}, now = Date.now()) {
  const state = {}
  const problems = [], reminders = [], recovered = []

  for (const r of results) {
    const prev = previous[r.name] ?? { fails: 0, alertedAt: null, since: null }
    if (r.ok) {
      if (prev.alertedAt) recovered.push({ name: r.name, downMs: now - (prev.since ?? prev.alertedAt) })
      state[r.name] = { fails: 0, alertedAt: null, since: null }
      continue
    }
    const next = { fails: prev.fails + 1, alertedAt: prev.alertedAt, since: prev.since ?? now, detail: r.detail }
    if (!prev.alertedAt && next.fails >= FAILS_BEFORE_ALERT) {
      next.alertedAt = now
      problems.push(r)
    } else if (prev.alertedAt && now - prev.alertedAt >= REMIND_MS) {
      next.alertedAt = now
      reminders.push({ ...r, downMs: now - next.since })
    }
    state[r.name] = next
  }

  const duration = ms => {
    const minutes = Math.round(ms / 60000)
    return minutes < 90 ? `${minutes} min` : `${Math.round(minutes / 60)} h`
  }
  const messages = []
  if (problems.length) messages.push(['PROBLEM on balapasa.com.np', ...problems.map(p => `- ${p.name}: ${p.detail}`)].join('\n'))
  if (reminders.length) messages.push(['STILL A PROBLEM on balapasa.com.np', ...reminders.map(p => `- ${p.name}: ${p.detail} (for ${duration(p.downMs)})`)].join('\n'))
  if (recovered.length) messages.push(['RECOVERED on balapasa.com.np', ...recovered.map(p => `- ${p.name} is fine again (was a problem for ${duration(p.downMs)})`)].join('\n'))
  return { messages, state }
}
