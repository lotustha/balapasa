'use client'

import { useEffect } from 'react'

// Injects admin-pasted markup (meta verification tags, inline pixels, external
// scripts) into <head> on the storefront. dangerouslySetInnerHTML can't be used
// for this — <script> nodes inserted as raw HTML never execute. We parse the
// snippet and re-create each node, rebuilding <script> elements so both inline
// and external scripts run. Idempotent via a data-bp-head marker.
export default function CustomHeadCode({ code }: { code: string }) {
  useEffect(() => {
    const snippet = code?.trim()
    if (!snippet) return
    if (document.head.querySelector('[data-bp-head]')) return

    const tpl = document.createElement('template')
    tpl.innerHTML = snippet

    const appended: Node[] = []
    tpl.content.childNodes.forEach(node => {
      let out: Node
      if (node.nodeName === 'SCRIPT') {
        const src = node as HTMLScriptElement
        const s = document.createElement('script')
        for (const attr of Array.from(src.attributes)) s.setAttribute(attr.name, attr.value)
        s.text = src.text
        out = s
      } else {
        out = node.cloneNode(true)
      }
      if (out instanceof Element) out.setAttribute('data-bp-head', '')
      document.head.appendChild(out)
      appended.push(out)
    })

    return () => {
      appended.forEach(n => { try { document.head.removeChild(n) } catch { /* already gone */ } })
    }
  }, [code])

  return null
}
