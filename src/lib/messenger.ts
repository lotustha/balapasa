import { getSetting } from './appSettings'

const GRAPH_BASE = 'https://graph.facebook.com/v19.0'

async function pageToken() {
  return getSetting('FACEBOOK_PAGE_ACCESS_TOKEN')
}

export async function sendMessengerText(psid: string, text: string): Promise<string | null> {
  const token = await pageToken()
  if (!token) { console.warn('[Messenger] page access token not configured'); return null }

  try {
    const res = await fetch(`${GRAPH_BASE}/me/messages?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: psid }, message: { text } }),
    })
    const data = await res.json()
    return res.ok ? (data.message_id ?? null) : null
  } catch { return null }
}

export async function getMessengerProfile(psid: string): Promise<{ name: string; picture?: string } | null> {
  const token = await pageToken()
  if (!token) return null
  try {
    const res = await fetch(
      `${GRAPH_BASE}/${psid}?fields=name,profile_pic&access_token=${token}`,
    )
    if (!res.ok) return null
    const d = await res.json()
    return { name: d.name ?? 'Unknown', picture: d.profile_pic }
  } catch { return null }
}
