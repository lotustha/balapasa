import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import CheckoutClient from './CheckoutClient'
import type { SavedAddress } from '@/components/checkout/SavedAddressPicker'

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
    }))
  } catch {
    return []
  }
}

export default async function CheckoutPage() {
  const user      = await getCurrentUser()
  const addresses = user ? await fetchAddresses(user.sub) : []
  return (
    <CheckoutClient
      user={user ? { sub: user.sub, email: user.email, name: user.name ?? null } : null}
      initialAddresses={addresses}
    />
  )
}
