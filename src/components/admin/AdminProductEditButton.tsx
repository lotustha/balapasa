'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Pencil } from 'lucide-react'

// Floating "Edit product" shortcut shown on the storefront product page ONLY to
// signed-in staff (MANAGER/ADMIN — the roles that can reach the admin product
// editor). Renders nothing for customers / logged-out visitors. Self-contained:
// it checks the session via /api/auth/me, same as AdminNav.
export default function AdminProductEditButton({ productId }: { productId: string }) {
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!cancelled && (d?.role === 'ADMIN' || d?.role === 'MANAGER')) setCanEdit(true)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!canEdit) return null

  return (
    <Link
      href={`/admin/products/${productId}/edit`}
      // Bottom-LEFT so it clears the WhatsApp button (bottom-right) and sits
      // above the mobile bottom nav.
      className="fixed bottom-24 left-4 md:bottom-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full
                 bg-slate-900 text-white text-sm font-bold shadow-lg shadow-slate-900/25
                 hover:bg-slate-800 transition-colors"
      title="Edit this product in admin"
    >
      <Pencil size={15} /> Edit product
    </Link>
  )
}
