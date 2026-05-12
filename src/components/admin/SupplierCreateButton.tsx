'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import SupplierFormDialog from './SupplierFormDialog'

export default function SupplierCreateButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-dark transition-colors cursor-pointer shadow-md shadow-primary/20"
      >
        <Plus size={15} /> Add Supplier
      </button>
      <SupplierFormDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
