'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, ArrowDown, ArrowUp, Check, CheckCircle2, Eye, EyeOff, Loader2, Monitor, Palette, RotateCcw,
  Smartphone, Tablet, Upload,
} from 'lucide-react'
import { themeColors, themeWarnings } from '@/lib/theme/css'
import {
  CHROME_OPTIONS, DECOR_OPTIONS, FONT_OPTIONS, HOME_SECTIONS, LAYOUT_OPTIONS, PRESETS, RADIUS_OPTIONS,
  normalizeTheme, type HomeSection, type LayoutKey, type ThemeConfig, type ThemeSetting,
} from '@/lib/theme/presets'

const PAGES = [['/', 'Home'], ['/products', 'Shop'], ['/deals', 'Deals'], ['/cart', 'Cart'], ['/login', 'Sign in']] as const
const DEVICES = [
  ['desktop', Monitor, '100%'], ['tablet', Tablet, '820px'], ['phone', Smartphone, '390px'],
] as const
const ROLES = [
  ['dominant', '60%', 'Background', 'The page itself. Keep it calm.'],
  ['secondary', '30%', 'Cards', 'Product cards, panels and menus.'],
  ['accent', '10%', 'Accent', 'Buttons, prices and badges.'],
] as const

const same = (a: ThemeConfig, b: ThemeConfig) => JSON.stringify(a) === JSON.stringify(b)

/** A tiny picture of a theme: page, header, cards and a button in its own colours. */
function Swatch({ theme }: { theme: ThemeConfig }) {
  const c = themeColors(theme)
  const radius = { sharp: 1, soft: 4, round: 7, pill: 10 }[theme.radius]
  return (
    <div className="h-24 w-full p-2 flex flex-col gap-1.5" style={{ background: c.bg }}>
      <div className="h-3 flex items-center px-1.5 gap-1" style={{ background: c.chromeBg, borderRadius: radius / 2 }}>
        <span className="w-4 h-1 rounded-full" style={{ background: c.chromeFg, opacity: 0.8 }} />
        <span className="ml-auto w-2 h-1 rounded-full" style={{ background: c.chromeFg, opacity: 0.5 }} />
      </div>
      <div className="flex-1 grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex flex-col justify-end p-1 gap-0.5" style={{ background: c.surface, borderRadius: radius, border: `1px solid ${c.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }}>
            <span className="h-1 w-3/4 rounded-full" style={{ background: c.ink, opacity: 0.55 }} />
            <span className="h-1.5 w-1/2" style={{ background: i === 1 ? c.accent : c.accentText, borderRadius: radius / 2 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="p-5 border-b border-slate-100">
      <h2 className="font-heading font-bold text-sm text-slate-900">{title}</h2>
      {hint && <p className="text-xs text-slate-500 mt-0.5 mb-3">{hint}</p>}
      <div className={hint ? '' : 'mt-3'}>{children}</div>
    </section>
  )
}

function Choice<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: Record<string, { label: string; hint?: string }>; onChange: (v: T) => void
}) {
  const id = `choice-${label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <div className="mb-3 last:mb-0">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value as T)}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:border-primary cursor-pointer">
        {Object.entries(options).map(([key, o]) => (
          <option key={key} value={key}>{o.label}{o.hint ? `: ${o.hint}` : ''}</option>
        ))}
      </select>
    </div>
  )
}

export default function AppearancePage() {
  const [saved, setSaved] = useState<ThemeSetting | null>(null)
  const [theme, setTheme] = useState<ThemeConfig | null>(null)
  const [busy, setBusy] = useState<'' | 'draft' | 'publish' | 'discard'>('')
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [page, setPage] = useState<string>('/')
  const [device, setDevice] = useState<(typeof DEVICES)[number][0]>('desktop')
  const frame = useRef<HTMLIFrameElement>(null)
  const latest = useRef<ThemeConfig | null>(null)

  useEffect(() => {
    fetch('/api/admin/theme', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d: ThemeSetting) => { setSaved(d); setTheme(d.draft ?? d.published) })
      .catch(() => setNotice({ ok: false, text: 'Could not load the theme. Reload the page.' }))
  }, [])

  // The preview is the real storefront in a frame. It tells us when a page has loaded, and we
  // answer with the theme being edited; nothing is saved by previewing.
  const send = useCallback(() => {
    if (latest.current) frame.current?.contentWindow?.postMessage({ type: 'theme-preview', theme: latest.current }, window.location.origin)
  }, [])
  useEffect(() => { latest.current = theme; send() }, [theme, send])
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin === window.location.origin && e.data?.type === 'theme-preview-ready') send()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [send])

  const warnings = useMemo(() => (theme ? themeWarnings(theme) : []), [theme])

  if (!theme || !saved) {
    return (
      <div className="p-10 flex items-center gap-3 text-slate-500">
        {notice ? <><AlertTriangle size={18} className="text-red-500" /> {notice.text}</> : <><Loader2 size={18} className="animate-spin" /> Loading appearance</>}
      </div>
    )
  }

  const live = same(theme, saved.published)
  const update = (patch: Partial<ThemeConfig>) => { setNotice(null); setTheme(t => (t ? normalizeTheme({ ...t, ...patch }) : t)) }
  const preset = PRESETS[theme.preset]
  const hidden = (Object.keys(HOME_SECTIONS) as HomeSection[]).filter(s => !theme.home.includes(s))

  async function act(action: 'draft' | 'publish' | 'discard') {
    setBusy(action); setNotice(null)
    try {
      const res = await fetch('/api/admin/theme', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, theme }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      setSaved(data)
      if (action === 'discard') setTheme(data.published)
      setNotice({
        ok: true,
        text: action === 'publish' ? 'Published. Shoppers see the new look now.'
          : action === 'draft' ? 'Draft saved. Only you can see it, here in the preview.'
          : 'Changes discarded.',
      })
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong. Try again.' })
    } finally {
      setBusy('')
    }
  }

  function moveSection(id: HomeSection, by: number) {
    const home = [...theme!.home]
    const i = home.indexOf(id)
    const j = i + by
    if (i < 0 || j < 0 || j >= home.length) return
    ;[home[i], home[j]] = [home[j], home[i]]
    update({ home })
  }

  const width = DEVICES.find(d => d[0] === device)![2]

  return (
    <div className="flex flex-col lg:flex-row lg:h-screen bg-slate-50">
      {/* Controls */}
      <aside className="w-full lg:w-[400px] shrink-0 bg-white border-r border-slate-200 flex flex-col lg:h-full">
        <header className="p-5 border-b border-slate-100">
          <h1 className="font-heading font-extrabold text-xl text-slate-900 flex items-center gap-2">
            <Palette size={18} className="text-primary" /> Appearance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pick a theme, then change any colour or layout. The preview updates as you go; shoppers see nothing until you publish.
          </p>
        </header>

        <div className="flex-1 lg:overflow-y-auto">
          <Section title="Theme" hint="A starting point for colours, style and layout. Choosing one replaces your current choices.">
            <div className="grid grid-cols-2 gap-3">
              {Object.values(PRESETS).map(p => {
                const active = theme.preset === p.preset
                return (
                  <button key={p.preset} type="button" onClick={() => update(normalizeTheme({ preset: p.preset }))}
                    aria-pressed={active}
                    className={`text-left rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${active ? 'border-primary shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
                    <Swatch theme={p} />
                    <span className="block px-3 py-2">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                        {p.name} {active && <Check size={13} className="text-primary" />}
                      </span>
                      <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">{p.tagline}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </Section>

          <Section title="Colours" hint="The 60-30-10 rule: mostly background, some card colour, a little accent.">
            <div className="flex h-3 rounded-full overflow-hidden border border-slate-200 mb-4" aria-hidden>
              <span style={{ width: '60%', background: theme.palette.dominant }} />
              <span style={{ width: '30%', background: theme.palette.secondary }} />
              <span style={{ width: '10%', background: theme.palette.accent }} />
            </div>
            {ROLES.map(([key, share, label, hint]) => (
              <div key={key} className="flex items-center gap-3 mb-3">
                <input type="color" aria-label={`${label} colour`} value={theme.palette[key]}
                  onChange={e => update({ palette: { ...theme.palette, [key]: e.target.value } })}
                  className="w-11 h-11 rounded-xl border border-slate-200 cursor-pointer bg-white p-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{label} <span className="text-slate-400 font-medium">{share}</span></p>
                  <p className="text-[11px] text-slate-500">{hint}</p>
                </div>
                <input type="text" aria-label={`${label} hex code`} key={theme.palette[key]} defaultValue={theme.palette[key]} maxLength={7}
                  onChange={e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) update({ palette: { ...theme.palette, [key]: e.target.value } }) }}
                  className="w-24 px-2 py-1.5 text-xs font-mono border border-slate-200 rounded-lg text-slate-700 uppercase" />
              </div>
            ))}
            {warnings.map(w => (
              <p key={w} role="status" className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 rounded-xl px-3 py-2 mt-2">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {w}
              </p>
            ))}
            <button type="button" onClick={() => update({ palette: preset.palette })}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
              <RotateCcw size={12} /> Use {preset.name}&apos;s own colours
            </button>
          </Section>

          <Section title="Style">
            <Choice label="Fonts" value={theme.font} options={FONT_OPTIONS} onChange={font => update({ font })} />
            <Choice label="Corners" value={theme.radius} options={RADIUS_OPTIONS} onChange={radius => update({ radius })} />
            <Choice label="Background decoration" value={theme.decor} options={DECOR_OPTIONS} onChange={decor => update({ decor })} />
            <Choice label="Header bar colour (Full bar header)" value={theme.chrome} options={CHROME_OPTIONS} onChange={chrome => update({ chrome })} />
          </Section>

          <Section title="Layout" hint="Each block of the storefront has its own choice.">
            {(Object.keys(LAYOUT_OPTIONS) as LayoutKey[]).map(key => (
              <Choice key={key} label={LAYOUT_OPTIONS[key].label} value={theme.layout[key] as string}
                options={LAYOUT_OPTIONS[key].options}
                onChange={v => update({ layout: { ...theme.layout, [key]: v } as ThemeConfig['layout'] })} />
            ))}
          </Section>

          <Section title="Homepage sections" hint="Order them with the arrows. Hidden sections stay off the homepage.">
            <ul className="space-y-1.5">
              {theme.home.map((id, i) => (
                <li key={id} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="flex-1 text-sm font-medium text-slate-800">{HOME_SECTIONS[id]}</span>
                  <button type="button" aria-label={`Move ${HOME_SECTIONS[id]} up`} disabled={i === 0} onClick={() => moveSection(id, -1)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-white disabled:opacity-30 cursor-pointer"><ArrowUp size={14} /></button>
                  <button type="button" aria-label={`Move ${HOME_SECTIONS[id]} down`} disabled={i === theme.home.length - 1} onClick={() => moveSection(id, 1)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-white disabled:opacity-30 cursor-pointer"><ArrowDown size={14} /></button>
                  <button type="button" aria-label={`Hide ${HOME_SECTIONS[id]}`} onClick={() => update({ home: theme.home.filter(s => s !== id) })}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-white cursor-pointer"><Eye size={14} /></button>
                </li>
              ))}
              {hidden.map(id => (
                <li key={id} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-dashed border-slate-200">
                  <span className="flex-1 text-sm text-slate-400">{HOME_SECTIONS[id]} (hidden)</span>
                  <button type="button" aria-label={`Show ${HOME_SECTIONS[id]}`} onClick={() => update({ home: [...theme.home, id] })}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 cursor-pointer"><EyeOff size={14} /></button>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <footer className="p-4 border-t border-slate-200 bg-white space-y-2">
          {notice && (
            <p role="status" className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl ${notice.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {notice.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {notice.text}
            </p>
          )}
          <p className="text-[11px] text-slate-500">
            {live ? 'This is what shoppers see now.' : 'You have changes that are not published.'}
          </p>
          <div className="flex gap-2">
            <button type="button" disabled={live || busy !== ''} onClick={() => act('publish')}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 cursor-pointer">
              {busy === 'publish' ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Publish
            </button>
            <button type="button" disabled={live || busy !== ''} onClick={() => act('draft')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
              {busy === 'draft' ? <Loader2 size={15} className="animate-spin" /> : 'Save draft'}
            </button>
            <button type="button" disabled={live || busy !== ''} onClick={() => act('discard')}
              className="px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
              Discard
            </button>
          </div>
        </footer>
      </aside>

      {/* Preview */}
      <div className="flex-1 min-w-0 flex flex-col min-h-[70vh]">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-slate-200">
          <div className="flex gap-1" role="group" aria-label="Preview page">
            {PAGES.map(([href, label]) => (
              <button key={href} type="button" onClick={() => setPage(href)} aria-pressed={page === href}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${page === href ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1" role="group" aria-label="Preview size">
            {DEVICES.map(([id, Icon]) => (
              <button key={id} type="button" onClick={() => setDevice(id)} aria-label={`${id} preview`} aria-pressed={device === id}
                className={`p-2 rounded-lg cursor-pointer ${device === id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 flex justify-center">
          <iframe ref={frame} src={page} title="Storefront preview" onLoad={send}
            className="h-full min-h-[65vh] bg-white rounded-2xl border border-slate-200 shadow-sm transition-all duration-300"
            style={{ width, maxWidth: '100%' }} />
        </div>
      </div>
    </div>
  )
}
