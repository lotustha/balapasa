// Pure pieces of the bot, kept apart from the WhatsApp socket so they can be tested.

/** "Order  DZ-12-0001 " → { command: 'order', arg: 'DZ-12-0001' } */
export function parseMessage(text) {
  const [first = '', ...rest] = String(text ?? '').trim().split(/\s+/)
  return { command: first.toLowerCase(), arg: rest.join(' ') }
}

/** Actions waiting for a "yes", one per chat, each valid for `ttlMs`. */
export function createPending(ttlMs = 2 * 60 * 1000) {
  const waiting = new Map()
  return {
    set(chat, action, now = Date.now()) { waiting.set(chat, { ...action, expires: now + ttlMs }) },
    /** Returns and removes the action for this chat, or null if there is none or it is too old. */
    take(chat, now = Date.now()) {
      const action = waiting.get(chat)
      waiting.delete(chat)
      return action && action.expires >= now ? { command: action.command, arg: action.arg } : null
    },
    clear(chat) { waiting.delete(chat) },
  }
}

const NPT_OFFSET_MS = (5 * 60 + 45) * 60_000

/** The Nepal date (YYYY-MM-DD) to send the daily summary for, or null if it is not due.
 *  Due from `hour`:00 until midnight Nepal time, once per date, so a restart at 20:30 still sends it. */
export function summaryDue(now, lastSentDate, hour = 20) {
  const npt = new Date(now.getTime() + NPT_OFFSET_MS)
  const date = npt.toISOString().slice(0, 10)
  return npt.getUTCHours() >= hour && lastSentDate !== date ? date : null
}

/**
 * Remembers the last `limit` messages the bot sent, by message id. WhatsApp asks for a message
 * again when the receiving phone could not decrypt it; the bot can only answer from here.
 */
export function createSentStore(limit = 500) {
  const byId = new Map()
  return {
    remember(msg) {
      if (!msg?.key?.id || !msg.message) return msg
      byId.set(msg.key.id, msg.message)
      if (byId.size > limit) byId.delete(byId.keys().next().value)
      return msg
    },
    get: id => byId.get(id),
  }
}
