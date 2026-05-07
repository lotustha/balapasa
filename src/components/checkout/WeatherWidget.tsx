'use client'

import { Droplets, Wind, MapPin, Store as StoreIcon, AlertTriangle, CheckCircle2, CloudLightning, Info, Cloud } from 'lucide-react'

export interface WeatherData {
  weather: { id: number; main: string; description: string }[]
  main:    { temp: number; feels_like: number; humidity: number }
  wind:    { speed: number }
  name:    string
}

interface Props {
  store:       WeatherData | null
  destination: WeatherData | null
}

type Cond = 'clear' | 'partly-cloudy' | 'cloudy' | 'rain' | 'drizzle' | 'storm' | 'snow' | 'mist'

function cond(id: number): Cond {
  if (id === 800) return 'clear'
  if (id === 801 || id === 802) return 'partly-cloudy'
  if (id >= 803) return 'cloudy'
  if (id >= 200 && id < 300) return 'storm'
  if (id >= 300 && id < 400) return 'drizzle'
  if (id >= 500 && id < 600) return 'rain'
  if (id >= 600 && id < 700) return 'snow'
  return 'mist'
}

function impact(id: number) {
  if (id >= 200 && id < 300) return { Icon: CloudLightning, msg: 'Thunderstorm at destination — significant delivery delays expected', cls: 'bg-red-50 border-red-200 text-red-700', ic: 'text-red-500' }
  if (id >= 300 && id < 400) return { Icon: Info,           msg: 'Light drizzle — minimal impact on delivery time',                  cls: 'bg-slate-50 border-slate-200 text-slate-600', ic: 'text-slate-400' }
  if (id >= 500 && id < 600) return { Icon: AlertTriangle,  msg: 'Rain at destination — add 20–30 min to estimated delivery time',   cls: 'bg-amber-50 border-amber-200 text-amber-700', ic: 'text-amber-500' }
  if (id >= 600 && id < 700) return { Icon: AlertTriangle,  msg: 'Snowfall expected — delivery may be delayed by 1–2 hours',        cls: 'bg-blue-50 border-blue-200 text-blue-700',   ic: 'text-blue-500' }
  if (id >= 700 && id < 800) return { Icon: Info,           msg: 'Low visibility / fog — slight delays possible',                   cls: 'bg-slate-50 border-slate-200 text-slate-600', ic: 'text-slate-400' }
  return                             { Icon: CheckCircle2,  msg: 'Clear skies — perfect conditions, delivery expected on time',      cls: 'bg-green-50 border-green-200 text-green-700', ic: 'text-green-500' }
}

const CARD_BG: Record<Cond, string> = {
  'clear':         'from-amber-50 to-yellow-50 border-amber-200',
  'partly-cloudy': 'from-sky-50 to-blue-50 border-sky-200',
  'cloudy':        'from-slate-50 to-slate-100 border-slate-200',
  'rain':          'from-blue-50 to-indigo-50 border-blue-200',
  'drizzle':       'from-cyan-50 to-sky-50 border-cyan-200',
  'storm':         'from-slate-100 to-gray-100 border-slate-300',
  'snow':          'from-blue-50 to-sky-50 border-blue-100',
  'mist':          'from-slate-50 to-gray-50 border-slate-200',
}

// ─── CSS Keyframes (injected once per mount) ──────────────────────────────────
const ANIMATIONS = `
  @keyframes wt-spin  { to { transform: rotate(360deg); } }
  @keyframes wt-glow  { 0%,100%{ transform:scale(1); opacity:.12; } 50%{ transform:scale(1.18); opacity:.28; } }
  @keyframes wt-drift { 0%,100%{ transform:translateX(0); } 50%{ transform:translateX(4px); } }
  @keyframes wt-rain  { 0%{ transform:translateY(0); opacity:1; } 100%{ transform:translateY(14px); opacity:0; } }
  @keyframes wt-drop  { 0%{ transform:translateY(0) scale(1); opacity:1; } 100%{ transform:translateY(10px) scale(.4); opacity:0; } }
  @keyframes wt-snow  { 0%{ transform:translateY(0); opacity:1; } 100%{ transform:translateY(16px); opacity:0; } }
  @keyframes wt-bolt  { 0%,82%,84%,86%,100%{ opacity:1; } 83%,85%{ opacity:.05; } }
  @keyframes wt-mist  { 0%,100%{ opacity:.18; } 50%{ opacity:.7; } }
`

// ─── Animated SVG Icons ───────────────────────────────────────────────────────

function SunIcon() {
  const rays = [0,45,90,135,180,225,270,315]
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
      <circle cx="26" cy="26" r="14" fill="#FCD34D" fillOpacity=".14"
        style={{ animation: 'wt-glow 2.2s ease-in-out infinite' }} />
      <g style={{ animation: 'wt-spin 10s linear infinite', transformOrigin: '26px 26px' }}>
        {rays.map(d => (
          <line key={d} x1="26" y1="5" x2="26" y2="12"
            stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round"
            transform={`rotate(${d} 26 26)`} />
        ))}
      </g>
      <circle cx="26" cy="26" r="9" fill="#FCD34D" />
    </svg>
  )
}

function PartlyCloudyIcon() {
  const rays = [0,60,120,180,240,300]
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
      <circle cx="16" cy="24" r="9" fill="#FCD34D" />
      <g style={{ animation: 'wt-spin 12s linear infinite', transformOrigin: '16px 24px' }}>
        {rays.map(d => (
          <line key={d} x1="16" y1="9" x2="16" y2="13"
            stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"
            transform={`rotate(${d} 16 24)`} />
        ))}
      </g>
      <g style={{ animation: 'wt-drift 4s ease-in-out infinite' }}>
        <ellipse cx="32" cy="28" rx="13" ry="8" fill="white" />
        <ellipse cx="22" cy="32" rx="8" ry="6" fill="white" />
        <rect x="16" y="27" width="29" height="11" rx="5.5" fill="white" />
      </g>
    </svg>
  )
}

function CloudyIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
      <g style={{ animation: 'wt-drift 6s .6s ease-in-out infinite' }}>
        <ellipse cx="31" cy="20" rx="14" ry="9" fill="#CBD5E1" />
        <ellipse cx="19" cy="24" rx="9" ry="7" fill="#CBD5E1" />
        <rect x="12" y="20" width="31" height="11" rx="5.5" fill="#CBD5E1" />
      </g>
      <g style={{ animation: 'wt-drift 4.5s ease-in-out infinite' }}>
        <ellipse cx="30" cy="31" rx="13" ry="8" fill="#E2E8F0" />
        <ellipse cx="19" cy="35" rx="8" ry="6" fill="#E2E8F0" />
        <rect x="13" y="31" width="28" height="10" rx="5" fill="#E2E8F0" />
      </g>
    </svg>
  )
}

function RainIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
      <ellipse cx="30" cy="17" rx="14" ry="9" fill="#93C5FD" />
      <ellipse cx="18" cy="21" rx="9" ry="7" fill="#93C5FD" />
      <rect x="11" y="17" width="31" height="11" rx="5.5" fill="#93C5FD" />
      {[13, 22, 31, 40].map((x, i) => (
        <line key={x} x1={x} y1="31" x2={x - 3} y2="44"
          stroke="#60A5FA" strokeWidth="2" strokeLinecap="round"
          style={{ animation: `wt-rain .9s ${(i * .2).toFixed(1)}s ease-in infinite` }} />
      ))}
    </svg>
  )
}

function DrizzleIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
      <ellipse cx="30" cy="17" rx="14" ry="9" fill="#BAE6FD" />
      <ellipse cx="18" cy="21" rx="9" ry="7" fill="#BAE6FD" />
      <rect x="11" y="17" width="31" height="11" rx="5.5" fill="#BAE6FD" />
      {[16, 27, 38].map((x, i) => (
        <circle key={x} cx={x} cy={34} r="3"
          fill="#7DD3FC"
          style={{ animation: `wt-drop 1.2s ${(i * .28).toFixed(2)}s ease-in infinite` }} />
      ))}
    </svg>
  )
}

function StormIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
      <ellipse cx="30" cy="15" rx="14" ry="9" fill="#475569" />
      <ellipse cx="18" cy="19" rx="9" ry="7" fill="#475569" />
      <rect x="11" y="15" width="31" height="11" rx="5.5" fill="#475569" />
      <path d="M27 26 L20 38 L26 38 L22 50 L35 33 L28 33 Z"
        fill="#FCD34D"
        style={{ animation: 'wt-bolt 3s ease-in-out infinite' }} />
      {[11, 41].map((x, i) => (
        <line key={x} x1={x} y1="28" x2={x - 3} y2="38"
          stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round"
          style={{ animation: `wt-rain .75s ${(i * .35).toFixed(2)}s ease-in infinite` }} />
      ))}
    </svg>
  )
}

function SnowIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
      <ellipse cx="30" cy="17" rx="14" ry="9" fill="#BAE6FD" />
      <ellipse cx="18" cy="21" rx="9" ry="7" fill="#BAE6FD" />
      <rect x="11" y="17" width="31" height="11" rx="5.5" fill="#BAE6FD" />
      {[15, 27, 39].map((x, i) => (
        <g key={x} style={{ animation: `wt-snow ${1.4 + i * .15}s ${(i * .3).toFixed(1)}s ease-in infinite` }}>
          <line x1={x} y1="30" x2={x} y2="44" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1={x-5} y1="37" x2={x+5} y2="37" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1={x-3} y1="33" x2={x+3} y2="41" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <line x1={x+3} y1="33" x2={x-3} y2="41" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  )
}

function MistIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
      {[8, 18, 28, 40].map((y, i) => (
        <rect key={y} x={i % 2 === 0 ? 4 : 10} y={y} width={i % 2 === 0 ? 44 : 32} height="5" rx="2.5"
          fill="#94A3B8"
          style={{ animation: `wt-mist ${1.6 + i * .3}s ${(i * .2).toFixed(1)}s ease-in-out infinite` }} />
      ))}
    </svg>
  )
}

const ICONS: Record<Cond, () => React.JSX.Element> = {
  'clear': SunIcon, 'partly-cloudy': PartlyCloudyIcon, 'cloudy': CloudyIcon,
  'rain': RainIcon, 'drizzle': DrizzleIcon, 'storm': StormIcon,
  'snow': SnowIcon, 'mist': MistIcon,
}

function WeatherCard({ data, isStore }: { data: WeatherData; isStore: boolean }) {
  const c    = cond(data.weather[0].id)
  const Icon = ICONS[c]
  return (
    <div className={`flex-1 p-4 rounded-2xl border bg-gradient-to-br ${CARD_BG[c]}`}>
      <div className="flex items-center gap-1.5 mb-3">
        {isStore
          ? <StoreIcon size={11} className="text-slate-500 shrink-0" />
          : <MapPin   size={11} className="text-slate-500 shrink-0" />
        }
        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
          {isStore ? 'Store · Kathmandu' : 'Your Destination'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Icon />
        <div>
          <p className="font-extrabold text-2xl text-slate-900 leading-none">{Math.round(data.main.temp)}°C</p>
          <p className="text-xs text-slate-500 mt-1 capitalize leading-snug">{data.weather[0].description}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{data.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-black/5">
        <span className="flex items-center gap-1 text-[10px] text-slate-500">
          <Droplets size={10} /> {data.main.humidity}%
        </span>
        <span className="flex items-center gap-1 text-[10px] text-slate-500">
          <Wind size={10} /> {data.wind.speed} m/s
        </span>
        <span className="text-[10px] text-slate-400">Feels {Math.round(data.main.feels_like)}°</span>
      </div>
    </div>
  )
}

export default function WeatherWidget({ store, destination }: Props) {
  if (!store && !destination) return null

  const impactData   = destination ?? store
  const imp          = impactData ? impact(impactData.weather[0].id) : null
  const sameCity     = store && destination && store.name === destination.name
  const showDest     = destination && !sameCity

  return (
    <div className="glass-card overflow-hidden animate-fade-in-up">
      <style>{ANIMATIONS}</style>

      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
        <Cloud size={16} className="text-primary" />
        <h3 className="font-heading font-bold text-slate-900 text-sm">Weather Conditions</h3>
        <span className="ml-auto text-[10px] text-slate-400 tabular-nums">Live · ~10 min cache</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Cards — one or two depending on same/different city */}
        <div className={`flex gap-3 ${!showDest ? 'justify-center' : ''}`}>
          {store      && <WeatherCard data={store}       isStore />}
          {showDest   && <WeatherCard data={destination!} isStore={false} />}
        </div>

        {/* Delivery impact banner */}
        {imp && (
          <div className={`flex items-start gap-2.5 px-4 py-3 rounded-2xl border ${imp.cls}`}>
            <imp.Icon size={14} className={`${imp.ic} shrink-0 mt-0.5`} />
            <p className="text-xs font-medium leading-relaxed">{imp.msg}</p>
          </div>
        )}
      </div>
    </div>
  )
}
