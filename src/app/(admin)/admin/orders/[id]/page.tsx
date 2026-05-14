'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft, Package, Phone, MapPin, CreditCard, Truck, Check,
  Loader2, ChevronDown, ExternalLink, AlertCircle, CheckCircle2,
  Edit3, Save, X, RefreshCw, User, Mail, Printer,
  Navigation, FileText, ChevronUp, Search, Plus, Minus,
} from 'lucide-react'
import NepalAddressSelector, { type NepalAddress } from '@/components/checkout/NepalAddressSelector'
import { formatPrice } from '@/lib/utils'

interface OrderItem { id: string; name: string; quantity: number; price: number; image?: string | null }
interface Order {
  id: string; name: string; phone: string; email: string | null
  address: string; house: string | null; road: string | null; city: string
  lat: number | null; lng: number | null
  paymentMethod: string; paymentStatus: string; status: string
  total: number; subtotal: number; deliveryCharge: number
  advancePaid: number | null; codAmount: number | null; advanceMethod: string | null
  notes: string | null; shippingOption: string | null; shippingProvider: string | null
  pathaoOrderId: string | null; trackingUrl: string | null
  createdAt: string; items: OrderItem[]
}

// What gets sent to each delivery API
interface DeliveryPayload {
  provider: string
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  city: string
  totalValue: number
  isCod: boolean
  codAmount: number
  serviceType?: string
  charge?: number
  eta?: string
}
interface ServiceOption { id: number; name: string; charge_after_discount: number; dropoff_eta: number }

const STATUS_FLOW = ['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED']
const STATUS_CLS: Record<string, string> = {
  PENDING:'bg-yellow-100 text-yellow-700', CONFIRMED:'bg-blue-100 text-blue-700',
  PROCESSING:'bg-purple-100 text-purple-700', SHIPPED:'bg-indigo-100 text-indigo-700',
  DELIVERED:'bg-green-100 text-green-700', CANCELLED:'bg-red-100 text-red-700',
}
const PAY_CLS: Record<string, string> = {
  UNPAID:'bg-slate-100 text-slate-500', PAID:'bg-green-100 text-green-700',
  FAILED:'bg-red-100 text-red-600', REFUNDED:'bg-amber-100 text-amber-700',
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white'

export default function OrderDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()

  const [order,   setOrder]   = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [toast,   setToast]   = useState('')

  // Customer edit
  const [editCustomer,  setEditCustomer]  = useState(false)
  const [showAdvanced,  setShowAdvanced]  = useState(false)
  const [customerDraft, setCustomerDraft] = useState({ name:'', phone:'', email:'', lat:'', lng:'' })
  const [addressDraft,  setAddressDraft]  = useState<NepalAddress>({ province:'', district:'', municipality:'', ward:'', street:'', tole:'' })
  const [savingCustomer,setSavingCustomer]= useState(false)

  function parseAddressToNepal(o: Order): NepalAddress {
    // Order address stored as "Tole, Street, Municipality, District, Province"
    const parts = (o.address ?? '').split(', ')
    const len = parts.length
    return {
      province:     len >= 1 ? parts[len-1]?.trim() : '',
      district:     len >= 2 ? parts[len-2]?.trim() : '',
      municipality: o.city?.trim() || (len >= 3 ? parts[len-3]?.trim() : ''),
      ward:         o.house?.trim() || '',
      street:       o.road?.trim()  || (len >= 4 ? parts[len-4]?.trim() : ''),
      tole:         len >= 5 ? parts.slice(0, len-4).join(', ').trim() : '',
    }
  }

  // Status
  const [statusOpen,  setStatusOpen]  = useState(false)
  const [payOpen,     setPayOpen]     = useState(false)
  const [savingStatus,setSavingStatus]= useState(false)

  // Notes
  const [editNotes,  setEditNotes]  = useState(false)
  const [notesDraft, setNotesDraft] = useState('')
  const [savingNotes,setSavingNotes]= useState(false)

  // Simple vs full delivery UI
  const [showModifyDelivery, setShowModifyDelivery] = useState(false)

  // Confirm before assign
  const [confirmPayload,   setConfirmPayload]   = useState<{ payload: DeliveryPayload; onConfirm: () => void } | null>(null)
  const [cancellingDelivery, setCancellingDelivery] = useState(false)
  const [showCancelConfirm,  setShowCancelConfirm]  = useState(false)

  // Order item editing
  const [editItems,    setEditItems]    = useState(false)
  const [itemSaving,   setItemSaving]   = useState<string | null>(null)
  const [addItemOpen,  setAddItemOpen]  = useState(false)
  const [productSearch,setProductSearch]= useState('')
  const [searchResults,setSearchResults]= useState<{ id:string; name:string; price:number; salePrice:number|null; images:string[] }[]>([])
  const [searching,    setSearching]    = useState(false)

  // Delivery
  const [deliveryTab,  setDeliveryTab]  = useState<'view'|'pathao'|'pickndrop'|'rider'|'manual'>('view')
  const [estimating,   setEstimating]   = useState(false)
  const [services,     setServices]     = useState<ServiceOption[]>([])
  const [pathaoSid,    setPathaoSid]    = useState('')
  const [selectedSvc,  setSelectedSvc]  = useState<ServiceOption | null>(null)
  const [assigning,    setAssigning]    = useState(false)
  const [delivNotes,   setDelivNotes]   = useState('')
  const [manualTracking, setManualTracking] = useState({ trackingNo:'', trackingUrl:'', charge:'', partner:'' })
  const [riders,       setRiders]       = useState<{ id:string; name:string|null; phone:string|null; role:string }[]>([])
  const [riderForm,    setRiderForm]    = useState({ riderId:'', riderName:'', riderPhone:'', vehicle:'', eta:'', charge:'', note:'' })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const patch = useCallback(async (data: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const updated = await res.json()
    if (res.ok) { setOrder(updated); return updated }
    throw new Error(updated.error ?? 'Failed')
  }, [id])

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/orders/${id}`).then(r => r.json()),
      fetch('/api/admin/riders').then(r => r.json()),
    ]).then(([o, rd]) => {
      setOrder(o)
      setNotesDraft(o.notes ?? '')
      setCustomerDraft({ name: o.name, phone: o.phone, email: o.email ?? '', lat: String(o.lat ?? ''), lng: String(o.lng ?? '') })
      setAddressDraft(parseAddressToNepal(o))
      setManualTracking({ trackingNo: o.pathaoOrderId ?? '', trackingUrl: o.trackingUrl ?? '', charge: String(o.deliveryCharge || ''), partner: o.shippingOption ?? '' })
      setRiders(rd.riders ?? [])
    })
      .catch(() => setError('Failed to load order'))
      .finally(() => setLoading(false))
  }, [id])

  async function saveCustomer() {
    setSavingCustomer(true)
    try {
      const a = addressDraft
      const fullAddress = [a.tole, a.street, a.municipality, a.district, a.province]
        .filter(Boolean).join(', ')
      await patch({
        name:    customerDraft.name,
        phone:   customerDraft.phone,
        email:   customerDraft.email || null,
        address: fullAddress || order?.address,
        city:    a.municipality || order?.city,
        house:   a.ward         || null,
        road:    a.street       || null,
        lat:     customerDraft.lat ? Number(customerDraft.lat) : null,
        lng:     customerDraft.lng ? Number(customerDraft.lng) : null,
      })
      setEditCustomer(false); showToast('Customer details updated')
    } catch (e) { setError(String(e)) }
    setSavingCustomer(false)
  }

  async function saveStatus(status: string) {
    setSavingStatus(true)
    try { await patch({ status }); showToast(`Status → ${status}`); setStatusOpen(false) }
    catch (e) { setError(String(e)) }
    setSavingStatus(false)
  }

  async function savePayStatus(ps: string) {
    try { await patch({ paymentStatus: ps }); showToast(`Payment → ${ps}`); setPayOpen(false) }
    catch (e) { setError(String(e)) }
  }

  async function saveNotes() {
    setSavingNotes(true)
    try { await patch({ notes: notesDraft }); setEditNotes(false); showToast('Notes saved') }
    catch (e) { setError(String(e)) }
    setSavingNotes(false)
  }

  // Pick & Drop state
  const [pndOptions,   setPndOptions]   = useState<{ id:string; name:string; charge_after_discount:number; dropoff_eta:number; type:string }[]>([])
  const [pndSelected,  setPndSelected]  = useState<typeof pndOptions[0] | null>(null)
  const [pndFromBranch,setPndFromBranch]= useState('KATHMANDU')
  const [pndToBranch,  setPndToBranch]  = useState('')

  async function estimatePathao() {
    if (!order) return
    setEstimating(true); setError(''); setServices([])
    const res  = await fetch(`/api/admin/orders/${id}/assign-delivery?provider=PATHAO`)
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Estimate failed'); setEstimating(false); return }
    setServices(data.data?.service_options ?? [])
    setPathaoSid(data.data?.sid ?? '')
    setEstimating(false)
  }

  async function estimatePnd() {
    if (!order) return
    setEstimating(true); setError(''); setPndOptions([])
    const res  = await fetch(`/api/admin/orders/${id}/assign-delivery?provider=PICKNDROP`)
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'PnD estimate failed'); setEstimating(false); return }
    setPndOptions(data.options ?? [])
    setPndToBranch(order.city.toUpperCase())
    setEstimating(false)
  }

  async function assignPickNDrop() {
    if (!pndSelected) return
    setAssigning(true); setError('')
    const res = await fetch(`/api/admin/orders/${id}/assign-delivery`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type:'PICKNDROP', fromBranch:pndFromBranch, toBranch:pndToBranch, serviceType:pndSelected.type, deliveryCharge:pndSelected.charge_after_discount, notes:delivNotes }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setAssigning(false); return }
    setOrder(data.order); setDeliveryTab('view'); showToast(`Pick & Drop assigned — Tracking: ${data.order?.pathaoOrderId} ✓`)
    setAssigning(false)
  }

  async function itemAction(action: string, data: Record<string, unknown>) {
    const key = (data.itemId ?? data.productId ?? 'new') as string
    setItemSaving(key)
    const res = await fetch(`/api/admin/orders/${id}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    })
    const result = await res.json()
    if (res.ok) {
      // Reload full order to get updated items + totals
      const r = await fetch(`/api/admin/orders/${id}`)
      const updated = await r.json()
      setOrder(updated)
      showToast(action === 'remove' ? 'Item removed' : action === 'add' ? 'Item added' : 'Quantity updated')
    } else {
      setError(result.error)
    }
    setItemSaving(null)
  }

  async function searchProducts(q: string) {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=8&admin=true`)
    const data = await res.json()
    setSearchResults(data.products ?? [])
    setSearching(false)
  }

  async function quickAssignPathao() {
    setAssigning(true); setError('')
    await estimatePathao()
    // estimatePathao sets `services` — auto-select cheapest after it loads
    // We need to wait a tick for state to update, so use a small delay
    setTimeout(() => {
      setServices(prev => {
        if (!prev.length) { setAssigning(false); setDeliveryTab('pathao'); setShowModifyDelivery(true); return prev }
        const best = prev.reduce((a, b) => a.charge_after_discount <= b.charge_after_discount ? a : b)
        setSelectedSvc(best)
        setConfirmPayload({ payload: buildPathaoPayload(), onConfirm: () => { assignPathao(); setShowModifyDelivery(false) } })
        setAssigning(false)
        return prev
      })
    }, 800)
  }

  async function quickAssignPnd() {
    setAssigning(true); setError('')
    await estimatePnd()
    setTimeout(() => {
      setPndOptions(prev => {
        if (!prev.length) { setAssigning(false); setDeliveryTab('pickndrop'); setShowModifyDelivery(true); return prev }
        const best = prev.find(o => o.type === 'STANDARD') ?? prev[0]
        setPndSelected(best)
        setConfirmPayload({ payload: buildPndPayload(), onConfirm: () => { assignPickNDrop(); setShowModifyDelivery(false) } })
        setAssigning(false)
        return prev
      })
    }, 800)
  }

  async function cancelDelivery() {
    setCancellingDelivery(true); setShowCancelConfirm(false); setError('')
    const res = await fetch(`/api/admin/orders/${id}/cancel-delivery`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setCancellingDelivery(false); return }
    setOrder(data.order)
    if (data.warnings?.length) setError(`Cancelled locally. Note: ${data.warnings.join('. ')}`)
    else showToast('Delivery cancelled — order reverted to Pending')
    setCancellingDelivery(false)
  }

  function buildPathaoPayload(): DeliveryPayload {
    return {
      provider: 'Pathao',
      receiverName:    order!.name,
      receiverPhone:   order!.phone,
      receiverAddress: order!.address,
      city:            order!.city,
      totalValue:      order!.total,
      isCod:           order!.paymentMethod === 'COD',
      codAmount:       order!.paymentMethod === 'COD' ? order!.total : 0,
      serviceType:     selectedSvc?.name,
      charge:          selectedSvc?.charge_after_discount,
      eta:             selectedSvc ? `~${Math.round(selectedSvc.dropoff_eta/60)} min` : undefined,
    }
  }

  function buildPndPayload(): DeliveryPayload {
    return {
      provider: 'Pick & Drop Nepal',
      receiverName:    order!.name,
      receiverPhone:   order!.phone,
      receiverAddress: order!.address,
      city:            order!.city,
      totalValue:      order!.total,
      isCod:           order!.paymentMethod === 'COD',
      codAmount:       order!.paymentMethod === 'COD' ? order!.total : 0,
      serviceType:     pndSelected?.name,
      charge:          pndSelected?.charge_after_discount,
      eta:             pndSelected ? `~${Math.round(pndSelected.dropoff_eta/3600)}h` : undefined,
    }
  }

  async function assignPathao() {
    if (!selectedSvc) return
    setAssigning(true); setError('')
    const res = await fetch(`/api/admin/orders/${id}/assign-delivery`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type:'PATHAO', sid:pathaoSid, serviceOptionId:selectedSvc.id, deliveryCharge:selectedSvc.charge_after_discount, notes:delivNotes }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setAssigning(false); return }
    setOrder(data.order); setDeliveryTab('view'); showToast('Assigned to Pathao ✓')
    setAssigning(false)
  }

  async function assignRider() {
    const name  = riderForm.riderName || riders.find(r => r.id === riderForm.riderId)?.name || 'Store Rider'
    const phone = riderForm.riderPhone || riders.find(r => r.id === riderForm.riderId)?.phone || ''
    const note  = [
      riderForm.vehicle  ? `Vehicle: ${riderForm.vehicle}` : '',
      riderForm.eta      ? `ETA: ${riderForm.eta}`         : '',
      phone              ? `Rider phone: ${phone}`          : '',
      riderForm.note,
    ].filter(Boolean).join(' | ')

    setAssigning(true); setError('')
    const res = await fetch(`/api/admin/orders/${id}/assign-delivery`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type:'MANUAL', trackingNumber: `RIDER-${name.replace(/\s+/g,'-').toUpperCase()}`, deliveryCharge: Number(riderForm.charge)||0, notes:`Store Rider: ${name}${note ? ' | '+note : ''}` }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setAssigning(false); return }
    setOrder(data.order); setDeliveryTab('view'); showToast(`Assigned to rider: ${name} ✓`)
    setAssigning(false)
  }

  async function assignManual() {
    setAssigning(true); setError('')
    const res = await fetch(`/api/admin/orders/${id}/assign-delivery`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type:'MANUAL', trackingNumber:manualTracking.trackingNo, trackingUrl:manualTracking.trackingUrl, deliveryCharge:Number(manualTracking.charge)||0, notes:`${manualTracking.partner ? manualTracking.partner+': ' : ''}${delivNotes}` }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setAssigning(false); return }
    setOrder(data.order); setDeliveryTab('view'); showToast('Delivery info saved ✓')
    setAssigning(false)
  }

  async function syncAddressToDelivery() {
    if (!order) return
    // Recompose the Nepal-format addressDraft into the order's flat schema fields
    // and push them via PATCH so the delivery integration sees the latest address.
    const composed = [addressDraft.tole, addressDraft.street, addressDraft.municipality, addressDraft.district, addressDraft.province]
      .map(s => s?.trim()).filter(Boolean).join(', ')
    await patch({
      address: composed || order.address,
      house:   addressDraft.ward     || null,
      road:    addressDraft.street   || null,
      city:    addressDraft.municipality || order.city,
      lat:     customerDraft.lat ? Number(customerDraft.lat) : null,
      lng:     customerDraft.lng ? Number(customerDraft.lng) : null,
    })
    showToast('Address synced to delivery')
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={28} className="animate-spin text-primary" /></div>
  if (!order)  return <div className="p-8"><div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-700">{error || 'Order not found'}</div></div>

  const isCancelled = order.status === 'CANCELLED'
  const statusIdx   = STATUS_FLOW.indexOf(order.status)
  const hasDelivery = !!(order.pathaoOrderId || order.trackingUrl)

  // Kathmandu Valley — all 3 districts (Kathmandu, Lalitpur, Bhaktapur)
  // Normalised: lowercase + no spaces for fuzzy matching
  const KTM_VALLEY_NORM = new Set([
    // Kathmandu district municipalities
    'kathmandu','kathmandumetropolitancity',
    'kirtipur','kirtipurmuncipality',
    'nagarjun','nagarjunmuncipality',
    'tokha','tokhamuncipality',
    'budhanilkantha','budhanilkanthamuncipality',
    'tarakeshwor','tarakeshwormuncipality',
    'shankharapur','shankhrapurmuncipality',
    'gokarneshwor','gokarneshwormuncipality',
    'kageshworimanohara',
    'chandragiri','chandragirimuncipality',
    'dakshinkali','dakshinkalimuncipality',
    // Lalitpur district
    'lalitpur','lalitpurmetropolitancity',
    'godawari','godawarimuncipality',
    'mahalaxmi','mahalaxmimuncipality',
    'bagmati','bagmatimuncipality',
    // Bhaktapur district
    'bhaktapur','bhaktapurmuncipality',
    'madhyapurthimi','madhyapurthimimuncipality',
    'suryabinayak','suryabinayakmuncipality',
    'changunarayan','changunarayanmuncipality',
  ])

  function isInKtmValley(city: string | null | undefined): boolean {
    if (!city) return false
    const key = city.toLowerCase().replace(/[\s-_]/g, '')
    // Direct match or partial match (e.g. "Kathmandu Metropolitan City" → "kathmandu")
    if (KTM_VALLEY_NORM.has(key)) return true
    // Also match if any KTM valley name starts with the city key or vice versa
    for (const v of KTM_VALLEY_NORM) {
      if (key.startsWith(v) || v.startsWith(key)) return true
    }
    return false
  }

  const isKtmValley = isInKtmValley(order?.city) || isInKtmValley(order?.address)

  // Detected customer's preferred provider
  const preferredProvider = order?.shippingProvider ?? (
    order?.shippingOption?.toLowerCase().includes('pathao') ? 'PATHAO' :
    order?.shippingOption?.toLowerCase().includes('pick') ? 'PICKNDROP' : null
  )

  return (
    <div className="p-4 md:p-6 max-w-6xl relative">

      {/* ── Confirm Delivery Modal ── */}
      {confirmPayload && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmPayload(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto animate-fade-in-up">
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="font-bold text-slate-900">Confirm Delivery Assignment</p>
                <p className="text-xs text-slate-400 mt-0.5">Review data before sending to {confirmPayload.payload.provider}</p>
              </div>
              <div className="p-5 space-y-2.5">
                {[
                  { label: 'Partner',   value: confirmPayload.payload.provider },
                  { label: 'Recipient', value: confirmPayload.payload.receiverName },
                  { label: 'Phone',     value: confirmPayload.payload.receiverPhone },
                  { label: 'Address',   value: `${confirmPayload.payload.receiverAddress}, ${confirmPayload.payload.city}` },
                  { label: 'Order Value', value: `NPR ${confirmPayload.payload.totalValue.toLocaleString()}` },
                  { label: 'COD',       value: confirmPayload.payload.isCod ? `Yes — collect NPR ${confirmPayload.payload.codAmount.toLocaleString()}` : 'No (prepaid)' },
                  ...(confirmPayload.payload.serviceType ? [{ label: 'Service', value: confirmPayload.payload.serviceType }] : []),
                  ...(confirmPayload.payload.charge      ? [{ label: 'Delivery Fee', value: `NPR ${confirmPayload.payload.charge}` }] : []),
                  ...(confirmPayload.payload.eta         ? [{ label: 'ETA', value: confirmPayload.payload.eta }] : []),
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">{r.label}</span>
                    <span className="font-semibold text-slate-800 text-right max-w-[60%]">{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 px-5 pb-5">
                <button onClick={() => setConfirmPayload(null)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                  Cancel
                </button>
                <button onClick={() => { confirmPayload.onConfirm(); setConfirmPayload(null) }}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl cursor-pointer transition-colors">
                  Confirm & Assign
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Cancel Delivery Confirm ── */}
      {showCancelConfirm && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs pointer-events-auto animate-fade-in-up p-6">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Truck size={22} className="text-red-500" />
              </div>
              <h3 className="font-bold text-slate-900 text-center mb-2">Cancel Delivery?</h3>
              <p className="text-xs text-slate-500 text-center leading-relaxed mb-5">
                {order?.shippingOption?.toLowerCase().includes('pathao')
                  ? 'This will cancel the Pathao parcel via their API and clear tracking info from this order.'
                  : 'This will clear the delivery assignment. For third-party couriers, cancel separately on their platform.'}
                <br /><br />
                Order status will revert to <strong>Pending</strong>.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                  Keep
                </button>
                <button onClick={cancelDelivery} disabled={cancellingDelivery}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold rounded-xl cursor-pointer transition-colors">
                  {cancellingDelivery ? <><Loader2 size={14} className="animate-spin" />Cancelling…</> : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-2xl animate-fade-in-up">
          <CheckCircle2 size={16} className="text-green-400" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 cursor-pointer transition-colors">
          <ArrowLeft size={16} className="text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-heading font-extrabold text-xl text-slate-900 font-mono">#{order.id.slice(0,8).toUpperCase()}</h1>
            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${STATUS_CLS[order.status]}`}>{order.status}</span>
            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${PAY_CLS[order.paymentStatus]}`}>{order.paymentStatus}</span>
          </div>
          <p className="text-slate-400 text-xs mt-0.5">{new Date(order.createdAt).toLocaleString('en-NP', {dateStyle:'medium',timeStyle:'short'})}</p>
        </div>

        {/* Status dropdown */}
        <div className="relative">
          <button onClick={() => { setStatusOpen(o => !o); setPayOpen(false) }} disabled={savingStatus}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
            {savingStatus ? <Loader2 size={13} className="animate-spin" /> : null}
            Order Status <ChevronDown size={13} />
          </button>
          {statusOpen && (
            <div className="absolute top-full right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden w-44">
              {[...STATUS_FLOW,'CANCELLED'].map(s => (
                <button key={s} onClick={() => saveStatus(s)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold hover:bg-slate-50 cursor-pointer ${s===order.status?'text-primary bg-primary-bg/50':''}`}>
                  {s} {s===order.status && <Check size={11} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Payment dropdown */}
        <div className="relative">
          <button onClick={() => { setPayOpen(o => !o); setStatusOpen(false) }}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
            Payment <ChevronDown size={13} />
          </button>
          {payOpen && (
            <div className="absolute top-full right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden w-36">
              {['UNPAID','PAID','REFUNDED','FAILED'].map(s => (
                <button key={s} onClick={() => savePayStatus(s)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold hover:bg-slate-50 cursor-pointer ${s===order.paymentStatus?'text-primary bg-primary-bg/50':''}`}>
                  {s} {s===order.paymentStatus && <Check size={11} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-5 flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {/* Status timeline */}
      {!isCancelled && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-5">
          <div className="flex items-center">
            {STATUS_FLOW.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <button onClick={() => saveStatus(s)} title={`Set to ${s}`}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all group-hover:scale-110 ${i<=statusIdx?'bg-primary border-primary':'border-slate-200 bg-white hover:border-primary/50'}`}>
                    {i<=statusIdx ? <Check size={14} className="text-white" /> : <span className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-primary/30" />}
                  </div>
                  <span className={`text-[10px] font-bold ${i===statusIdx?'text-primary':i<statusIdx?'text-slate-600':'text-slate-300'}`}>
                    {s.charAt(0)+s.slice(1).toLowerCase()}
                  </span>
                </button>
                {i<STATUS_FLOW.length-1 && <div className={`flex-1 h-0.5 mb-5 mx-1 ${i<statusIdx?'bg-primary':'bg-slate-100'}`} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* ── Customer Details (fully editable) ── */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2"><User size={14} className="text-primary" /> Customer Details</h2>
              {!editCustomer ? (
                <button onClick={() => { setEditCustomer(true); if (order) setAddressDraft(parseAddressToNepal(order)) }} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark cursor-pointer">
                  <Edit3 size={12} /> Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={syncAddressToDelivery} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1">
                    <Navigation size={11} /> Sync address to delivery
                  </button>
                  <button onClick={() => setEditCustomer(false)} className="text-xs text-slate-400 cursor-pointer">Cancel</button>
                  <button onClick={saveCustomer} disabled={savingCustomer}
                    className="flex items-center gap-1 text-xs font-bold text-white bg-primary hover:bg-primary-dark px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
                    {savingCustomer ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save
                  </button>
                </div>
              )}
            </div>

            {editCustomer ? (
              <div className="space-y-4">
                {/* Contact info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label:'Full Name', key:'name',  icon:User,  type:'text'  },
                    { label:'Phone',     key:'phone', icon:Phone, type:'tel'   },
                  ].map(({ label, key, icon: Icon, type }) => (
                    <div key={key}>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
                      <div className="relative">
                        <Icon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type={type} value={customerDraft[key as keyof typeof customerDraft]}
                          onChange={e => setCustomerDraft(d => ({ ...d, [key]: e.target.value }))}
                          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-primary bg-white" />
                      </div>
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label>
                    <div className="relative">
                      <Mail size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="email" value={customerDraft.email}
                        onChange={e => setCustomerDraft(d => ({ ...d, email: e.target.value }))}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-primary bg-white" />
                    </div>
                  </div>
                </div>

                {/* Nepal address selector — same as checkout */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Delivery Address</label>
                  <NepalAddressSelector
                    value={addressDraft}
                    onChange={setAddressDraft}
                    onComplete={addr => { setAddressDraft(addr); showToast('Address updated') }}
                  />
                </div>

                {/* Advanced: lat/lng */}
                <div>
                  <button type="button" onClick={() => setShowAdvanced(a => !a)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
                    {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    Advanced (GPS Coordinates)
                  </button>
                  {showAdvanced && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Latitude</label>
                        <input type="number" step="any" value={customerDraft.lat}
                          onChange={e => setCustomerDraft(d => ({ ...d, lat: e.target.value }))}
                          placeholder="27.7172" className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Longitude</label>
                        <input type="number" step="any" value={customerDraft.lng}
                          onChange={e => setCustomerDraft(d => ({ ...d, lng: e.target.value }))}
                          placeholder="85.3240" className={inputCls} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-bold text-slate-900">{order.name}</p>
                <div className="flex items-center gap-2 text-sm text-slate-500"><Phone size={12} /> {order.phone}</div>
                {order.email && <div className="flex items-center gap-2 text-sm text-slate-500"><Mail size={12} /> {order.email}</div>}
                <div className="flex items-start gap-2 text-sm text-slate-500">
                  <MapPin size={12} className="mt-0.5 shrink-0" />
                  <span>{[order.house, order.road, order.address, order.city].filter(Boolean).join(', ')}</span>
                </div>
                {order.lat && order.lng && (
                  <a href={`https://www.google.com/maps?q=${order.lat},${order.lng}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer">
                    <ExternalLink size={11} /> View on Google Maps
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── Order Items ── */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Package size={14} className="text-primary" /> Items ({order.items.length})
              </h2>
              <button onClick={() => setEditItems(e => !e)}
                className={`text-xs font-bold cursor-pointer px-3 py-1.5 rounded-lg transition-colors ${editItems ? 'bg-primary-bg text-primary' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                {editItems ? 'Done editing' : <><Edit3 size={11} className="inline mr-1" />Edit items</>}
              </button>
            </div>

            <div className="space-y-2">
              {order.items.map(item => (
                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${editItems ? 'bg-slate-50 border border-dashed border-slate-200' : 'bg-slate-50'}`}>
                  {item.image && (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white">
                      <Image src={item.image} alt={item.name} fill sizes="40px" className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-slate-400">{formatPrice(item.price)} each</p>
                  </div>

                  {editItems ? (
                    /* Edit mode: qty controls + remove */
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => itemAction('update', { itemId: item.id, quantity: item.quantity - 1 })}
                        disabled={itemSaving === item.id}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors disabled:opacity-40">
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center font-bold text-sm text-slate-900">{item.quantity}</span>
                      <button onClick={() => itemAction('update', { itemId: item.id, quantity: item.quantity + 1 })}
                        disabled={itemSaving === item.id}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors disabled:opacity-40">
                        <Plus size={12} />
                      </button>
                      <span className="text-sm font-bold text-slate-900 w-16 text-right">{formatPrice(item.price * item.quantity)}</span>
                      <button onClick={() => itemAction('remove', { itemId: item.id })}
                        disabled={itemSaving === item.id}
                        className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-600 cursor-pointer transition-colors ml-1 disabled:opacity-40">
                        {itemSaving === item.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                      </button>
                    </div>
                  ) : (
                    /* View mode */
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900 text-sm">{formatPrice(item.price * item.quantity)}</p>
                      <p className="text-[10px] text-slate-400">×{item.quantity}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add product button */}
            {editItems && (
              <div className="mt-3">
                {!addItemOpen ? (
                  <button onClick={() => setAddItemOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-primary/30 text-primary hover:border-primary hover:bg-primary-bg text-xs font-bold rounded-xl cursor-pointer transition-colors">
                    <Plus size={13} /> Add Product to Order
                  </button>
                ) : (
                  <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          value={productSearch}
                          onChange={e => { setProductSearch(e.target.value); searchProducts(e.target.value) }}
                          placeholder="Search product by name or SKU…"
                          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-primary bg-white" />
                      </div>
                      <button onClick={() => { setAddItemOpen(false); setProductSearch(''); setSearchResults([]) }}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={14} /></button>
                    </div>
                    {searching && <div className="text-center py-3"><Loader2 size={16} className="animate-spin text-primary mx-auto" /></div>}
                    {searchResults.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => {
                          itemAction('add', { productId: p.id, name: p.name, price: p.salePrice ?? p.price, quantity: 1, image: p.images[0] ?? null })
                          setAddItemOpen(false); setProductSearch(''); setSearchResults([])
                        }}
                        className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-left border border-transparent hover:border-slate-100">
                        {p.images[0] && (
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                          <p className="text-xs text-slate-400">{formatPrice(p.salePrice ?? p.price)}</p>
                        </div>
                        <Plus size={14} className="text-primary shrink-0" />
                      </button>
                    ))}
                    {productSearch && !searching && searchResults.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-2">No products found</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Delivery Management ── */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Truck size={14} className="text-primary" /> Delivery Assignment</h2>
              {hasDelivery && (
                <button onClick={() => setDeliveryTab('view')} className="text-[11px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <CheckCircle2 size={11} /> Assigned
                </button>
              )}
            </div>

            {/* ── Current delivery status card ── */}
            {hasDelivery ? (
              <div className="mb-4 rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <Check size={14} className="text-white" />
                    </div>
                    {(order.shippingProvider === 'PATHAO' || order.shippingOption?.toLowerCase().includes('pathao')) ? (
                      <div className="relative bg-white rounded-lg px-3 py-1.5 border border-green-200" style={{ width: 80, height: 32 }}>
                        <Image src="/pathao.webp" alt="Pathao" fill className="object-contain" sizes="80px" />
                      </div>
                    ) : (order.shippingProvider === 'PICKNDROP' || order.shippingOption?.toLowerCase().includes('pick')) ? (
                      <div className="relative bg-white rounded-lg px-3 py-1.5 border border-green-200" style={{ width: 96, height: 32 }}>
                        <Image src="/pick_n_drop.webp" alt="Pick & Drop" fill className="object-contain" sizes="96px" />
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-extrabold text-green-800">Delivery Assigned</p>
                        <p className="text-[10px] text-green-600">{order.shippingOption ?? 'Delivery partner'}</p>
                      </div>
                    )}
                    {(order.shippingProvider === 'PATHAO' || order.shippingProvider === 'PICKNDROP') && (
                      <p className="text-[10px] text-green-600 ml-1">{order.shippingOption}</p>
                    )}
                  </div>
                  {order.deliveryCharge > 0 && (
                    <span className="text-sm font-extrabold text-green-800">{formatPrice(order.deliveryCharge)}</span>
                  )}
                </div>

                {order.pathaoOrderId && (
                  <div className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2.5">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tracking Number</p>
                      <p className="font-mono font-extrabold text-slate-900 text-base">{order.pathaoOrderId}</p>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard?.writeText(order.pathaoOrderId!); showToast('Tracking number copied!') }}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-slate-700">
                      <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>
                    </button>
                  </div>
                )}

                {order.trackingUrl && (
                  <a href={order.trackingUrl} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors">
                    <ExternalLink size={13} /> Open Live Tracking
                  </a>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setDeliveryTab('pathao')}
                    className="flex-1 text-center text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer transition-colors py-1">
                    Re-assign →
                  </button>
                  <button onClick={() => setShowCancelConfirm(true)} disabled={cancellingDelivery}
                    className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg cursor-pointer transition-colors disabled:opacity-50">
                    {cancellingDelivery ? <Loader2 size={11} className="animate-spin" /> : null}
                    Cancel Delivery
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Truck size={16} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-800">No delivery assigned yet</p>
                  <p className="text-xs text-amber-600">Choose a delivery partner below to assign this order</p>
                </div>
              </div>
            )}

            {/* ── Quick Assign from customer's chosen partner ── */}
            {preferredProvider && !hasDelivery && (preferredProvider !== 'PATHAO' || isKtmValley) && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-white"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 11H9v-2h2v2zm0-4H9V6h2v3z"/></svg>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative bg-white rounded-lg px-3 py-1.5 border border-blue-100" style={{ width: preferredProvider === 'PATHAO' ? 80 : 96, height: 32 }}>
                      <Image
                        src={preferredProvider === 'PATHAO' ? '/pathao.webp' : '/pick_n_drop.webp'}
                        alt={preferredProvider === 'PATHAO' ? 'Pathao' : 'Pick & Drop'}
                        fill className="object-contain" sizes="68px"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-blue-800">Customer chose this</p>
                      <p className="text-[10px] text-blue-500">{order?.shippingOption}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (preferredProvider === 'PATHAO') {
                      setDeliveryTab('pathao')
                      await estimatePathao()
                    } else {
                      setDeliveryTab('pickndrop')
                      await estimatePnd()
                    }
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2">
                  <Truck size={13} /> Quick Assign via {preferredProvider === 'PATHAO' ? 'Pathao' : 'Pick & Drop'} →
                </button>
              </div>
            )}

            {/* ── Delivery assignment ── */}
            {!showModifyDelivery ? (
              /* ── One-click: use customer's exact selection ── */
              <div className="space-y-3">
                {order.shippingProvider && order.shippingOption ? (
                  <>
                    {/* Show what customer selected */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer selected</p>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{order.shippingOption}</p>
                          {order.deliveryCharge > 0 && (
                            <p className="text-xs text-slate-500">Agreed price: <strong>{formatPrice(order.deliveryCharge)}</strong></p>
                          )}
                        </div>
                        <div className="relative shrink-0" style={{ width: order.shippingProvider === 'PATHAO' ? 80 : 100, height: 36 }}>
                          <Image
                            src={order.shippingProvider === 'PATHAO' ? '/pathao.webp' : '/pick_n_drop.webp'}
                            alt={order.shippingProvider}
                            fill className="object-contain object-right" sizes="100px"
                          />
                        </div>
                      </div>
                    </div>

                    {/* One-click assign */}
                    <button
                      disabled={assigning}
                      onClick={order.shippingProvider === 'PATHAO' ? quickAssignPathao : quickAssignPnd}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-extrabold text-sm rounded-2xl cursor-pointer transition-all shadow-md shadow-primary/20">
                      {assigning
                        ? <><Loader2 size={16} className="animate-spin" /> Getting rates…</>
                        : <><Truck size={16} /> Confirm &amp; Assign Delivery</>
                      }
                    </button>
                  </>
                ) : (
                  /* No preference stored — show simple prompt */
                  <button onClick={() => setShowModifyDelivery(true)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-2xl cursor-pointer transition-all shadow-md shadow-primary/20">
                    <Truck size={16} /> Choose Delivery Partner
                  </button>
                )}

                <button onClick={() => setShowModifyDelivery(true)}
                  className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer py-1 transition-colors">
                  Use a different partner →
                </button>
              </div>
            ) : (
              /* ── Full modify mode ── */
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Choose Delivery Partner</p>
                  <button onClick={() => { setShowModifyDelivery(false); setDeliveryTab('view') }}
                    className="text-[11px] text-primary hover:text-primary-dark cursor-pointer font-semibold">← Back</button>
                </div>
                {!isKtmValley && (
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <AlertCircle size={10} className="text-amber-400 shrink-0" />
                    Pathao unavailable — {order?.city} is outside Kathmandu Valley
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    ...(isKtmValley ? [{ key:'pathao', label:'Pathao', sub:'On-demand, real-time', logo:'/pathao.webp', color:'bg-orange-50 border-orange-200', onClick: () => { setDeliveryTab('pathao'); estimatePathao() } }] : []),
                    { key:'pickndrop', label:'Pick & Drop', sub:'Branch-to-branch, Nepal', logo:'/pick_n_drop.webp', color:'bg-blue-50 border-blue-200',   onClick: () => { setDeliveryTab('pickndrop'); estimatePnd() } },
                    { key:'rider',     label:'Store Rider', sub:'Your own staff',           logo:null,               color:'bg-green-50 border-green-200', onClick: () => setDeliveryTab('rider') },
                    { key:'manual',    label:'Manual',      sub:'Any other courier',        logo:null,               color:'bg-slate-50 border-slate-200', onClick: () => setDeliveryTab('manual') },
                  ].map(p => (
                    <button key={p.key} onClick={p.onClick}
                      className={`flex items-center justify-between gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer text-left hover:scale-[1.02] min-h-[64px] ${deliveryTab===p.key ? p.color+' scale-[1.02] shadow-sm opacity-100' : p.color+'/50 opacity-70 hover:opacity-100'}`}>
                      <div className="flex flex-col min-w-0">
                        {!p.logo && <span className="font-extrabold text-sm text-slate-700 leading-tight">{p.label}</span>}
                        <span className="text-[10px] text-slate-500 leading-tight mt-0.5">{p.sub}</span>
                      </div>
                      {p.logo && (
                        <div className="relative shrink-0" style={{ width: p.key === 'pathao' ? 90 : 110, height: 40 }}>
                          <Image src={p.logo} alt={p.label} fill className="object-contain object-right" sizes="110px" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}


            {/* Pathao */}
            {deliveryTab === 'pathao' && (
              <div className="border border-orange-100 rounded-2xl p-4 bg-orange-50/30 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-orange-800">Pathao On-Demand Delivery</p>
                  <button onClick={() => setDeliveryTab('view')} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={14} /></button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Estimating for: <strong>{order.address}, {order.city}</strong></p>
                  <button onClick={estimatePathao} disabled={estimating} className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-dark cursor-pointer">
                    <RefreshCw size={11} className={estimating?'animate-spin':''} /> Re-estimate
                  </button>
                </div>

                {estimating ? (
                  <div className="flex items-center gap-2 py-6 justify-center text-slate-400 text-sm">
                    <Loader2 size={18} className="animate-spin text-primary" /> Getting delivery options…
                  </div>
                ) : services.length > 0 ? (
                  <div className="space-y-2">
                    {services.map(svc => (
                      <button key={svc.id} onClick={() => setSelectedSvc(svc)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer text-left ${selectedSvc?.id===svc.id?'border-primary bg-primary-bg':'border-slate-100 hover:border-slate-300 bg-slate-50/50'}`}>
                        <div>
                          <p className="font-bold text-slate-800">{svc.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">ETA: ~{Math.round(svc.dropoff_eta/60)} min</p>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-xl text-slate-900">{formatPrice(svc.charge_after_discount)}</p>
                          {selectedSvc?.id===svc.id && <p className="text-[10px] text-primary font-bold">Selected</p>}
                        </div>
                      </button>
                    ))}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Delivery Note</label>
                      <input value={delivNotes} onChange={e => setDelivNotes(e.target.value)} placeholder="Handle with care, leave at door…" className={inputCls} />
                    </div>
                    <button
                      onClick={() => setConfirmPayload({ payload: buildPathaoPayload(), onConfirm: assignPathao })}
                      disabled={!selectedSvc||assigning}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer transition-colors">
                      {assigning?<><Loader2 size={14} className="animate-spin"/>Creating parcel…</>:<><Truck size={14}/>Review & Assign to Pathao</>}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    {error ? <span className="text-red-500">{error}</span> : 'Click Re-estimate to load options'}
                  </div>
                )}
              </div>
            )}

            {/* Pick & Drop */}
            {deliveryTab === 'pickndrop' && (
              <div className="border border-blue-100 rounded-2xl p-4 bg-blue-50/30 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-blue-800">Pick & Drop Nepal</p>
                  <button onClick={() => setDeliveryTab('view')} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={14} /></button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Nepal branch-to-branch delivery</p>
                  <button onClick={estimatePnd} disabled={estimating} className="flex items-center gap-1 text-xs font-bold text-blue-600 cursor-pointer">
                    <RefreshCw size={11} className={estimating?'animate-spin':''} /> Get rates
                  </button>
                </div>

                {/* Branch selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">From Branch</label>
                    <select value={pndFromBranch} onChange={e => setPndFromBranch(e.target.value)} className={inputCls}>
                      {['KATHMANDU','LALITPUR','BHAKTAPUR','POKHARA','CHITWAN','BUTWAL','BIRATNAGAR'].map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">To Branch (Customer City)</label>
                    <select value={pndToBranch} onChange={e => setPndToBranch(e.target.value)} className={inputCls}>
                      {['KATHMANDU','LALITPUR','BHAKTAPUR','POKHARA','CHITWAN','BUTWAL','BIRATNAGAR'].map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                {estimating ? (
                  <div className="flex items-center gap-2 py-6 justify-center text-slate-400 text-sm">
                    <Loader2 size={18} className="animate-spin text-blue-500" /> Getting rates…
                  </div>
                ) : pndOptions.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      {pndOptions.map(opt => (
                        <button key={opt.id} onClick={() => setPndSelected(opt)}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer text-left ${pndSelected?.id===opt.id?'border-blue-500 bg-blue-50':'border-slate-100 hover:border-slate-300'}`}>
                          <div>
                            <p className="font-bold text-slate-800">{opt.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">ETA: ~{Math.round(opt.dropoff_eta/3600)}h</p>
                          </div>
                          <div className="text-right">
                            <p className="font-extrabold text-xl text-slate-900">NPR {opt.charge_after_discount}</p>
                            {pndSelected?.id===opt.id && <p className="text-[10px] text-blue-500 font-bold">Selected</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Note</label>
                      <input value={delivNotes} onChange={e => setDelivNotes(e.target.value)} placeholder="Fragile, handle with care…" className={inputCls} />
                    </div>
                    <button
                      onClick={() => setConfirmPayload({ payload: buildPndPayload(), onConfirm: assignPickNDrop })}
                      disabled={!pndSelected||assigning}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer transition-colors">
                      {assigning?<><Loader2 size={14} className="animate-spin"/>Creating order…</>:<><Truck size={14}/>Review & Assign to Pick & Drop</>}
                    </button>
                  </>
                ) : (
                  <p className="text-center py-6 text-slate-400 text-sm">Click "Get rates" to load service options</p>
                )}
              </div>
            )}

            {/* Store Rider */}
            {deliveryTab === 'rider' && (
              <div className="border border-green-100 rounded-2xl p-4 bg-green-50/30 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-green-800">Assign Store Rider</p>
                  <button onClick={() => setDeliveryTab('view')} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={14} /></button>
                </div>
                <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700 font-semibold">
                  Assign this order to one of your store's own delivery riders.
                </div>

                {/* Select from staff */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Rider (Staff)</label>
                  {riders.length > 0 ? (
                    <select value={riderForm.riderId}
                      onChange={e => {
                        const r = riders.find(x => x.id === e.target.value)
                        setRiderForm(d => ({ ...d, riderId: e.target.value, riderName: r?.name ?? '', riderPhone: r?.phone ?? '' }))
                      }}
                      className={inputCls}>
                      <option value="">— Select staff member —</option>
                      {riders.map(r => (
                        <option key={r.id} value={r.id}>{r.name ?? r.id} ({r.role}){r.phone ? ` · ${r.phone}` : ''}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2">No staff accounts found. Add staff in Settings.</p>
                  )}
                </div>

                {/* Or custom name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rider Name <span className="normal-case font-normal">(or override)</span></label>
                    <input value={riderForm.riderName} onChange={e => setRiderForm(d => ({ ...d, riderName: e.target.value }))}
                      placeholder="e.g. Ramesh Thapa" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rider Phone</label>
                    <input value={riderForm.riderPhone} onChange={e => setRiderForm(d => ({ ...d, riderPhone: e.target.value }))}
                      placeholder="98XXXXXXXX" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle</label>
                    <select value={riderForm.vehicle} onChange={e => setRiderForm(d => ({ ...d, vehicle: e.target.value }))} className={inputCls}>
                      <option value="">Select vehicle</option>
                      {['Motorcycle','Bicycle','Car','Electric Scooter','On foot'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ETA</label>
                    <input value={riderForm.eta} onChange={e => setRiderForm(d => ({ ...d, eta: e.target.value }))}
                      placeholder="e.g. 30-45 mins, 2pm" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Delivery Fee (NPR)</label>
                    <input type="number" value={riderForm.charge} onChange={e => setRiderForm(d => ({ ...d, charge: e.target.value }))}
                      placeholder="0" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Note</label>
                    <input value={riderForm.note} onChange={e => setRiderForm(d => ({ ...d, note: e.target.value }))}
                      placeholder="Instructions for rider" className={inputCls} />
                  </div>
                </div>

                <button onClick={assignRider} disabled={assigning || (!riderForm.riderId && !riderForm.riderName)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer transition-colors">
                  {assigning ? <><Loader2 size={14} className="animate-spin" />Assigning…</> : <><Truck size={14} />Assign to Store Rider</>}
                </button>
              </div>
            )}

            {/* Manual */}
            {deliveryTab === 'manual' && (
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-slate-700">Manual Tracking</p>
                  <button onClick={() => setDeliveryTab('view')} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={14} /></button>
                </div>
                {[
                  { label:'Delivery Partner/Service', key:'partner',    placeholder:'e.g. Pathao, Own rider, Sajha…' },
                  { label:'Tracking Number',          key:'trackingNo', placeholder:'e.g. PTH-123456' },
                  { label:'Tracking URL',             key:'trackingUrl',placeholder:'https://…' },
                  { label:'Delivery Fee (NPR)',        key:'charge',     placeholder:'0' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{f.label}</label>
                    <input value={manualTracking[f.key as keyof typeof manualTracking]}
                      onChange={e => setManualTracking(d => ({ ...d, [f.key]: e.target.value }))}
                      placeholder={f.placeholder} className={inputCls} />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Note</label>
                  <input value={delivNotes} onChange={e => setDelivNotes(e.target.value)} placeholder="Pickup time, instructions…" className={inputCls} />
                </div>
                <button onClick={assignManual} disabled={assigning}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer transition-colors">
                  {assigning?<><Loader2 size={14} className="animate-spin"/>Saving…</>:<><Save size={14}/>Save Delivery Info</>}
                </button>
              </div>
            )}

          </div>

          {/* ── Notes ── */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2"><FileText size={14} className="text-primary" /> Internal Notes</h2>
              {!editNotes
                ? <button onClick={() => setEditNotes(true)} className="text-xs font-bold text-primary cursor-pointer flex items-center gap-1"><Edit3 size={11} /> Edit</button>
                : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditNotes(false)} className="text-xs text-slate-400 cursor-pointer">Cancel</button>
                    <button onClick={saveNotes} disabled={savingNotes}
                      className="flex items-center gap-1 text-xs font-bold text-white bg-primary hover:bg-primary-dark px-3 py-1.5 rounded-lg cursor-pointer">
                      {savingNotes?<Loader2 size={11} className="animate-spin"/>:<Save size={11}/>} Save
                    </button>
                  </div>
                )}
            </div>
            {editNotes
              ? <textarea value={notesDraft} onChange={e => setNotesDraft(e.target.value)} rows={3} placeholder="Internal notes…" className={`${inputCls} resize-none`} />
              : <p className="text-sm text-slate-600 leading-relaxed">{order.notes || <span className="text-slate-300 italic">No notes yet</span>}</p>
            }
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">
          {/* Order summary */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 sticky top-5">
            <h2 className="font-bold text-slate-800 text-sm mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal ({order.items.reduce((s,i)=>s+i.quantity,0)} items)</span>
                <span className="font-semibold text-slate-800">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Delivery</span>
                <span className={`font-semibold ${order.deliveryCharge>0?'text-slate-800':'text-green-600'}`}>
                  {order.deliveryCharge>0?formatPrice(order.deliveryCharge):'Free'}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary">{formatPrice(order.total)}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs">
              {/* Partial COD breakdown */}
              {order.paymentMethod === 'PARTIAL_COD' && order.advancePaid && (
                <div className="mb-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Partial Payment</p>
                  <div className="flex justify-between text-amber-800">
                    <span>Advance paid ({order.advanceMethod})</span>
                    <span className="font-bold">{formatPrice(order.advancePaid)}</span>
                  </div>
                  <div className="flex justify-between text-amber-800">
                    <span>Collect on delivery</span>
                    <span className="font-bold">{formatPrice(order.codAmount ?? (order.total - order.advancePaid))}</span>
                  </div>
                </div>
              )}
              {[
                { label:'Payment method', value: order.paymentMethod === 'PARTIAL_COD' ? 'Partial COD' : order.paymentMethod },
                { label:'Payment status', value:order.paymentStatus },
                { label:'Ordered', value:new Date(order.createdAt).toLocaleDateString('en-NP',{day:'numeric',month:'short',year:'numeric'}) },
                ...(order.shippingOption?[{label:'Shipping',value:order.shippingOption}]:[]),
              ].map(r => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-slate-400">{r.label}</span>
                  <span className="font-semibold text-slate-700 text-right max-w-[60%] truncate" title={r.value}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              {/* Print + Download options */}
              {[
                { type:'shipping', label:'Shipping Label', requiresDelivery: true  },
                { type:'invoice',  label:'Tax Invoice',    requiresDelivery: false },
                { type:'packing',  label:'Packing Slip',   requiresDelivery: false },
                { type:'all',      label:'All Documents',  requiresDelivery: true  },
              ].map(d => {
                const orderId = order!.id
                const blocked = d.requiresDelivery && !hasDelivery

                async function fetchHtml() {
                  const res = await fetch('/api/admin/orders/print', {
                    method:'POST', headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({ ids:[orderId], type:d.type }),
                  })
                  return res.text()
                }

                async function handlePrint() {
                  const html = await fetchHtml()
                  const win = window.open('','_blank')
                  if (win) { win.document.write(html); win.document.close() }
                }

                async function handleDownload() {
                  const html = await fetchHtml()
                  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
                  const url  = URL.createObjectURL(blob)
                  const a    = document.createElement('a')
                  a.href     = url
                  a.download = `${d.type}-${orderId.slice(0,8).toUpperCase()}.html`
                  a.click()
                  URL.revokeObjectURL(url)
                }

                return (
                  <div key={d.type} title={blocked ? 'Assign a delivery partner first' : undefined}>
                    <div className={`flex gap-1 ${blocked ? 'opacity-40 pointer-events-none' : ''}`}>
                      <button onClick={handlePrint} disabled={blocked}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-l-xl cursor-pointer transition-colors">
                        <Printer size={11} /> {d.label}
                      </button>
                      <button onClick={handleDownload} disabled={blocked}
                        title={`Download ${d.label} as HTML`}
                        className="px-3 py-2 border border-l-0 border-slate-200 text-slate-400 hover:text-primary hover:bg-primary-bg rounded-r-xl cursor-pointer transition-colors">
                        <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-current"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                      </button>
                    </div>
                    {blocked && <p className="text-[9px] text-slate-400 text-center mt-0.5">Assign delivery first</p>}
                  </div>
                )
              })}
              <div className="border-t border-slate-100 pt-2" />
              <Link href={`/track-order?id=${order.id}`} target="_blank"
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                <ExternalLink size={13} /> Customer tracking view
              </Link>
              {order.paymentStatus !== 'PAID' && (
                <button onClick={() => patch({ paymentStatus:'PAID' }).then(() => showToast('Marked as paid'))}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded-xl hover:bg-green-100 cursor-pointer transition-colors">
                  <CheckCircle2 size={13} /> Mark as Paid
                </button>
              )}
              {order.status !== 'CANCELLED' && (
                <button onClick={() => { if (confirm('Cancel this order?')) saveStatus('CANCELLED') }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 cursor-pointer transition-colors">
                  <X size={13} /> Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
