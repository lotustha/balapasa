import type { ReactNode } from 'react'

interface PageShellProps {
  eyebrow?: string         // small tag above title (e.g. "Legal", "Help")
  title:    string
  intro?:   string         // optional short paragraph under title
  children: ReactNode
}

/**
 * Shared chrome for legal / about / contact / FAQ pages.
 * Mirrors the glass + blob aesthetic used across the storefront, so all
 * content pages feel like part of the same site without duplicating layout.
 */
export default function PageShell({ eyebrow, title, intro, children }: PageShellProps) {
  return (
    <section
      className="relative min-h-screen pt-16 pb-24 overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#F8F7FF 0%,#F4F6FF 40%,#FFF5FB 70%,#F0FDF4 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="blob animate-blob-morph animate-blob-float-a absolute -top-32 -left-24 w-[28rem] h-[28rem]"
          style={{ background: '#8B5CF6', opacity: 0.16 }}
        />
        <div
          className="blob animate-blob-morph animate-blob-float-b absolute -bottom-32 -right-24 w-[26rem] h-[26rem]"
          style={{ background: '#06B6D4', opacity: 0.14, animationDelay: '2s' }}
        />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <header className="mb-10 animate-fade-in-up">
          {eyebrow && (
            <div className="inline-flex items-center px-3 py-1 glass rounded-full mb-4">
              <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">{eyebrow}</span>
            </div>
          )}
          <h1 className="font-heading font-extrabold text-4xl sm:text-5xl text-slate-900 leading-tight">
            {title}
          </h1>
          {intro && (
            <p className="mt-4 text-slate-500 text-lg max-w-2xl leading-relaxed">{intro}</p>
          )}
        </header>

        {/* Content card */}
        <div className="glass-card rounded-3xl p-6 sm:p-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {children}
        </div>
      </div>
    </section>
  )
}
