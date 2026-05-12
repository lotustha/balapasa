'use client'

// Root-level error boundary that replaces the whole document when the root
// layout itself crashes. Must declare its own <html>/<body>.

import { useEffect } from 'react'

export default function GlobalRootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[global-error.tsx]', error)
  }, [error])

  return (
    <html lang="en">
      <body style={{
        margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif', background: '#F4F6FF', color: '#0f172a',
      }}>
        <div style={{ textAlign: 'center', padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#64748b', marginBottom: 24 }}>
            We couldn&apos;t load the page. Please try again.
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#94a3b8', marginBottom: 16 }}>
              Ref: {error.digest}
            </p>
          )}
          <button onClick={reset} style={{
            padding: '12px 24px', background: '#16A34A', color: 'white', border: 'none',
            borderRadius: 16, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>Try again</button>
        </div>
      </body>
    </html>
  )
}
