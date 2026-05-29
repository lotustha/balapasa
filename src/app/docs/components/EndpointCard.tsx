import type { ReactNode } from 'react'
import MethodBadge from './MethodBadge'

export default function EndpointCard({
  method,
  path,
  auth,
  title,
  children,
}: {
  method: string
  path: string
  auth?: string
  title?: string
  children?: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-slate-700/60 bg-slate-800/40">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-700/60 bg-slate-800/60 px-4 py-3">
        <MethodBadge method={method} />
        <code className="font-[family-name:var(--font-jetbrains)] text-sm text-slate-200 break-all">
          {path}
        </code>
        {auth && (
          <span className="ml-auto inline-flex items-center rounded-md bg-slate-700/60 px-2 py-1 text-xs text-slate-300 ring-1 ring-inset ring-slate-600/50">
            {auth}
          </span>
        )}
      </div>
      {(title || children) && (
        <div className="px-4 py-4 text-sm text-slate-300">
          {title && (
            <h4 className="mb-2 font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
              {title}
            </h4>
          )}
          {children}
        </div>
      )}
    </div>
  )
}
