'use client'

import { useState } from 'react'
import { Home, Building2, MapPin, Pencil, Trash2, Plus, Check, Star, Phone, User } from 'lucide-react'

export interface SavedAddress {
  id:           string
  label:        string
  name:         string
  phone:        string
  address:      string
  house:        string | null
  road:         string | null
  city:         string
  lat:          number | null
  lng:          number | null
  isDefault:    boolean
  province:     string | null
  district:     string | null
  municipality: string | null
  ward:         string | null
  street:       string | null
  tole:         string | null
}

interface Props {
  addresses:        SavedAddress[]
  selectedId:       string | null
  onSelect:         (addr: SavedAddress) => void
  onAddNew:         () => void
  onEdit:           (addr: SavedAddress) => void
  onDelete:         (id: string) => Promise<void>
  isAddingNew:      boolean
}

function labelIcon(label: string) {
  const l = label.toLowerCase()
  if (l.includes('home'))                            return Home
  if (l.includes('office') || l.includes('work'))    return Building2
  return MapPin
}

export default function SavedAddressPicker({
  addresses, selectedId, onSelect, onAddNew, onEdit, onDelete, isAddingNew,
}: Props) {
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Delete this saved address?')) return
    setDeleting(id)
    try {
      await onDelete(id)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        {addresses.map(addr => {
          const Icon       = labelIcon(addr.label)
          const isSelected = !isAddingNew && selectedId === addr.id

          return (
            <button
              key={addr.id}
              type="button"
              onClick={() => onSelect(addr)}
              className={`relative text-left p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-primary bg-primary-bg shadow-md'
                  : 'border-slate-100 bg-white/80 hover:border-slate-200 hover:bg-white'
              }`}
              style={{ backdropFilter: 'blur(8px)' }}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{addr.label}</p>
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 mt-0.5">
                        <Star size={9} fill="currentColor" /> Default
                      </span>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-1 text-xs text-slate-600">
                <p className="flex items-center gap-1.5">
                  <User size={11} className="text-slate-400 shrink-0" />
                  <span className="truncate">{addr.name}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone size={11} className="text-slate-400 shrink-0" />
                  <span>{addr.phone}</span>
                </p>
                <p className="flex items-start gap-1.5">
                  <MapPin size={11} className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{addr.address}</span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100/80">
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); onEdit(addr) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onEdit(addr) } }}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-500 hover:text-primary rounded-md hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <Pencil size={10} /> Edit
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); handleDelete(addr.id) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleDelete(addr.id) } }}
                  aria-disabled={deleting === addr.id}
                  className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded-md transition-colors cursor-pointer ${
                    deleting === addr.id ? 'opacity-50 pointer-events-none' : 'text-slate-500 hover:text-red-500 hover:bg-red-50'
                  }`}
                >
                  <Trash2 size={10} /> {deleting === addr.id ? 'Removing…' : 'Delete'}
                </span>
              </div>
            </button>
          )
        })}

        {/* Add new card */}
        <button
          type="button"
          onClick={onAddNew}
          className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer min-h-[180px] ${
            isAddingNew
              ? 'border-primary bg-primary-bg/50 text-primary'
              : 'border-slate-200 text-slate-400 hover:border-primary/40 hover:text-primary hover:bg-primary-bg/30'
          }`}
        >
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
            isAddingNew ? 'bg-primary text-white' : 'bg-slate-100'
          }`}>
            <Plus size={18} />
          </div>
          <span className="text-sm font-bold">
            {isAddingNew ? 'Filling new address' : 'Add new address'}
          </span>
          <span className="text-[11px] text-slate-400">Save it for next time</span>
        </button>
      </div>
    </div>
  )
}
