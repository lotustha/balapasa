import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import CheckoutClient from './CheckoutClient'
import type { SavedAddress } from '@/components/checkout/SavedAddressPicker'
import Link from 'next/link'
import { getSiteSettings } from '@/lib/site-settings'
import { hasRole } from '@/lib/admin-access'
import { ordersBlocked, ORDERS_PAUSED_FALLBACK_MESSAGE } from '@/lib/site-settings-shared'

export const dynamic = 'force-dynamic'

async function fetchAddresses(userId: string): Promise<SavedAddress[]> {
  try {
    const rows = await prisma.address.findMany({
      where:   { userId },
      orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
    })
    return rows.map(r => ({
      id:           r.id,
      label:        r.label,
      name:         r.name,
      phone:        r.phone,
      address:      r.address,
      house:        r.house,
      road:         r.road,
      city:         r.city,
      lat:          r.lat,
      lng:          r.lng,
      isDefault:    r.isDefault,
      province:     r.province,
      district:     r.district,
      municipality: r.municipality,
      ward:         r.ward,
      street:       r.street,
      tole:         r.tole,
      landmark:     r.landmark,
    }))
  } catch {
    return []
  }
}

export default async function CheckoutPage() {
  const user      = await getCurrentUser()
  const { maintenance } = await getSiteSettings()
  if (ordersBlocked(maintenance) && !hasRole(user?.role, 'STAFF')) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center" data-maintenance="orders-paused">
        <h1 className="font-heading font-extrabold text-2xl text-slate-900">Ordering is paused</h1>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed whitespace-pre-line">{maintenance.message.trim() || ORDERS_PAUSED_FALLBACK_MESSAGE}</p>
        <p className="mt-2 text-sm text-slate-500">Your cart is saved and will be here when we reopen.</p>
        <Link href="/products" className="mt-6 inline-flex px-5 py-2.5 bg-primary text-white rounded-2xl text-sm font-semibold hover:bg-primary-dark transition-colors">
          Keep browsing
        </Link>
      </div>
    )
  }
  const addresses = user ? await fetchAddresses(user.sub) : []
  return (
    <CheckoutClient
      user={user ? { sub: user.sub, email: user.email, name: user.name ?? null } : null}
      initialAddresses={addresses}
    />
  )
}
