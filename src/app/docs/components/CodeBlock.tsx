'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export default function CodeBlock({
  code,
  language,
  title,
}: {
  code: string
  language?: string
  title?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  }

  const showBar = Boolean(title || language)

  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-slate-700/60 bg-slate-800">
      {showBar && (
        <div className="flex items-center justify-between border-b border-slate-700/60 bg-slate-800/80 px-4 py-2">
          <span className="font-[family-name:var(--font-jetbrains)] text-xs text-slate-400">
            {title ?? language}
          </span>
          {title && language && (
            <span className="font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-wide text-slate-500">
              {language}
            </span>
          )}
        </div>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code to clipboard"
          className="absolute right-3 top-3 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-700/70 px-2.5 py-1.5 text-xs text-slate-300 ring-1 ring-inset ring-slate-600/60 transition-colors duration-200 hover:bg-slate-700 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
        <pre className="overflow-x-auto px-4 py-4 text-sm leading-relaxed">
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-200">
            {code}
          </code>
        </pre>
      </div>
    </div>
  )
}
