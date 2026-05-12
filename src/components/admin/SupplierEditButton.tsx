'use client'

import { useState } from 'react'
import { Edit2 } from 'lucide-react'
import SupplierFormDialog, { type SupplierForDialog } from './SupplierFormDialog'

export default function SupplierEditButton({ supplier }: { supplier: SupplierForDialog }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${supplier.name}`}
        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
      >
        <Edit2 size={13} />
      </button>
      <SupplierFormDialog open={open} onClose={() => setOpen(false)} supplier={supplier} />
    </>
  )
}
