'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Renders nothing (just a sized placeholder) until the wrapper is within
 * `rootMargin` of the viewport. Then mounts its children. Once mounted, it
 * stays mounted — no flicker on scroll-back.
 *
 * Useful for below-the-fold sections of a long page where the React
 * reconciliation + image loading + sub-component hydration is wasted work
 * for the 80% of customers who never scroll that far.
 *
 * - `rootMargin` defaults to 600px so the section is ready before it enters
 *   the viewport — no perceptible pop-in on a normal-speed scroll.
 * - `minHeight` reserves layout space so subsequent sections don't shift
 *   when this one mounts.
 * - On older browsers without IntersectionObserver, mounts immediately.
 */
export default function DeferOnVisible({
  children,
  minHeight = 320,
  rootMargin = '600px',
}: {
  children: React.ReactNode
  minHeight?: number
  rootMargin?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (visible) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        setVisible(true)
        io.disconnect()
      }
    }, { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [visible, rootMargin])

  return (
    <div ref={ref} style={!visible ? { minHeight } : undefined}>
      {visible ? children : null}
    </div>
  )
}
