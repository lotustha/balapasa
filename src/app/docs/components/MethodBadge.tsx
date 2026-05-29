const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
  POST: 'bg-sky-500/15 text-sky-400 ring-sky-500/30',
  PUT: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  PATCH: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  DELETE: 'bg-rose-500/15 text-rose-400 ring-rose-500/30',
}

export default function MethodBadge({ method }: { method: string }) {
  const key = method.toUpperCase()
  const style = METHOD_STYLES[key] ?? 'bg-slate-700/50 text-slate-300 ring-slate-600/50'

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset font-[family-name:var(--font-jetbrains)] ${style}`}
    >
      {key}
    </span>
  )
}
