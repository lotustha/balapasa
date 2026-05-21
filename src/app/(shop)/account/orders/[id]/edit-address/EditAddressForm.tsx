'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'
import NepalAddressSelector, { type NepalAddress } from '@/components/checkout/NepalAddressSelector'

interface Props {
  orderId: string
  initial: {
    address: string
    city:    string
    house:   string | null
    road:    string | null
    lat:     number | null
    lng:     number | null
  }
}

// Best-effort decompose of the stored flat `address` string back into the
// structured NepalAddress shape NepalAddressSelector expects. The order
// service originally composed this as:
//   "<tole>, <street>, Ward <n>, near <landmark>, <muni>, <district>, <province>"
// We attempt to recover ward + landmark from the substring patterns; the
// remaining pieces backfill from city + road + house if present.
function decompose(initial: Props['initial']): NepalAddress {
  const parts = (initial.address ?? '').split(',').map(s => s.trim()).filter(Boolean)
  // Province / district / municipality are the last three segments when
  // present; tole + street are the first two.
  const last3 = parts.slice(-3)
  const [tole, street] = parts
  const wardSeg     = parts.find(p => /^ward\s+/i.test(p))
  const landmarkSeg = parts.find(p => /^near\s+/i.test(p))
  return {
    province:     last3[2] ?? '',
    district:     last3[1] ?? '',
    municipality: last3[0] ?? initial.city ?? '',
    ward:         wardSeg     ? wardSeg.replace(/^ward\s+/i, '').trim() : '',
    street:       street ?? initial.road ?? '',
    tole:         tole   ?? '',
    landmark:     landmarkSeg ? landmarkSeg.replace(/^near\s+/i, '').trim() : undefined,
    lat:          initial.lat,
    lng:          initial.lng,
  }
}

export default function EditAddressForm({ orderId, initial }: Props) {
  const router = useRouter()
  const [addr, setAddr]   = useState<NepalAddress>(() => decompose(initial))
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [done,   setDone]   = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!addr.province || !addr.district || !addr.municipality || !addr.street.trim() || !addr.tole.trim()) {
      setError('Please complete province, district, municipality, street and tole.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/account/orders/${orderId}/update-address`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addr),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? `HTTP ${res.status}`)
        return
      }
      setDone(true)
      setTimeout(() => router.push('/account/orders?address=updated'), 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="glass-card p-6 flex items-center gap-3">
        <CheckCircle size={20} className="text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-slate-900">Address updated.</p>
          <p className="text-xs text-slate-500">Sending you back to your orders…</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="glass-card p-6">
        <NepalAddressSelector value={addr} onChange={setAddr} />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-red-700">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Link href="/account/orders"
          className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
          <ArrowLeft size={14} /> Back
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-bold text-sm shadow-md shadow-primary/20 cursor-pointer transition-colors"
        >
          {saving
            ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
            : 'Save new address'}
        </button>
      </div>
    </form>
  )
}
