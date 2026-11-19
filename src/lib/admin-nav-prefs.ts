// The admin menu's per-browser preferences (pinned links, unfolded groups), kept in localStorage and
// exposed as an external store so components read it with useSyncExternalStore: no flash, no effect.

export interface NavPrefs {
  pins: string[] | null   // null = the user has not changed the default pins yet
  open: string[] | null   // labels of unfolded groups; null = the default set
}

const KEY = 'bp-admin-nav-v1'
const EMPTY: NavPrefs = { pins: null, open: null }

let cache: NavPrefs | null = null
const listeners = new Set<() => void>()

const strings = (v: unknown): string[] | null => (Array.isArray(v) ? v.filter(x => typeof x === 'string') : null)

function read(): NavPrefs {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as Partial<NavPrefs> | null
    return raw ? { pins: strings(raw.pins), open: strings(raw.open) } : EMPTY
  } catch {
    return EMPTY
  }
}

export function getNavPrefs(): NavPrefs {
  cache ??= read()
  return cache
}

export const getServerNavPrefs = (): NavPrefs => EMPTY

export function subscribeNavPrefs(onChange: () => void): () => void {
  listeners.add(onChange)
  // Another tab changed the menu: pick it up here too.
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; onChange() } }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(onChange); window.removeEventListener('storage', onStorage) }
}

function update(change: (prefs: NavPrefs) => NavPrefs): void {
  cache = change(getNavPrefs())
  try { window.localStorage.setItem(KEY, JSON.stringify(cache)) } catch { /* private mode: keep it for this visit only */ }
  listeners.forEach(l => l())
}

const toggled = (list: string[], value: string) => (list.includes(value) ? list.filter(x => x !== value) : [...list, value])

export const togglePin   = (href: string, defaults: string[])  => update(p => ({ ...p, pins: toggled(p.pins ?? defaults, href) }))
export const toggleGroup = (label: string, defaults: string[]) => update(p => ({ ...p, open: toggled(p.open ?? defaults, label) }))
