import { prisma } from '@/lib/prisma'

async function getSocialSettings() {
  try {
    const keys = [
      'STORE_NAME', 'STORE_LOGO_URL', 'STORE_PHONE', 'STORE_EMAIL',
      'FACEBOOK_PAGE_ID', 'WHATSAPP_NUMBER',
      'CONTACT_INSTAGRAM', 'CONTACT_X', 'CONTACT_YOUTUBE',
    ]
    const rows = await prisma.appSetting.findMany({ where: { key: { in: keys } } })
    const cfg: Record<string, string> = {}
    for (const r of rows) cfg[r.key] = r.value
    return cfg
  } catch {
    return {}
  }
}

function facebookUrl(pageId: string) {
  if (!pageId) return ''
  if (pageId.startsWith('http')) return pageId
  return `https://facebook.com/${pageId}`
}

function whatsappUrl(number: string) {
  if (!number) return ''
  const clean = number.replace(/\D/g, '')
  return `https://wa.me/${clean}`
}

function instagramUrl(handle: string) {
  if (!handle) return ''
  if (handle.startsWith('http')) return handle
  const clean = handle.replace(/^@/, '')
  return `https://instagram.com/${clean}`
}

function xUrl(handle: string) {
  if (!handle) return ''
  if (handle.startsWith('http')) return handle
  const clean = handle.replace(/^@/, '')
  return `https://x.com/${clean}`
}

function youtubeUrl(channel: string) {
  if (!channel) return ''
  if (channel.startsWith('http')) return channel
  return `https://youtube.com/@${channel.replace(/^@/, '')}`
}

const PLATFORMS = [
  {
    key: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    lightBg: '#EBF3FF',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.696 4.533-4.696 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
      </svg>
    ),
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    lightBg: '#EAFAF1',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  {
    key: 'instagram',
    label: 'Instagram',
    color: '#E1306C',
    lightBg: '#FFF0F5',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
  },
  {
    key: 'x',
    label: 'X (Twitter)',
    color: '#000000',
    lightBg: '#F3F4F6',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zM17.083 19.77h1.833L7.084 4.126H5.117L17.083 19.77z"/>
      </svg>
    ),
  },
  {
    key: 'youtube',
    label: 'YouTube',
    color: '#FF0000',
    lightBg: '#FFF5F5',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
]

export default async function FollowPage() {
  const cfg = await getSocialSettings()

  const storeName = cfg.STORE_NAME || 'Balapasa'
  const logoUrl = cfg.STORE_LOGO_URL || ''
  const phone = cfg.STORE_PHONE || ''
  const email = cfg.STORE_EMAIL || ''

  const links: { platform: typeof PLATFORMS[number]; url: string }[] = []

  const fb = facebookUrl(cfg.FACEBOOK_PAGE_ID || '')
  if (fb) links.push({ platform: PLATFORMS[0], url: fb })

  const wa = whatsappUrl(cfg.WHATSAPP_NUMBER || '')
  if (wa) links.push({ platform: PLATFORMS[1], url: wa })

  const ig = instagramUrl(cfg.CONTACT_INSTAGRAM || '')
  if (ig) links.push({ platform: PLATFORMS[2], url: ig })

  const xLink = xUrl(cfg.CONTACT_X || '')
  if (xLink) links.push({ platform: PLATFORMS[3], url: xLink })

  const yt = youtubeUrl(cfg.CONTACT_YOUTUBE || '')
  if (yt) links.push({ platform: PLATFORMS[4], url: yt })

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 px-6 py-8 text-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={storeName}
              className="h-16 w-16 rounded-2xl object-contain bg-white/20 backdrop-blur-sm mx-auto mb-4 p-1"
            />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm mx-auto mb-4 flex items-center justify-center">
              <span className="text-white text-2xl font-black">{storeName[0]}</span>
            </div>
          )}
          <h1 className="text-white text-xl font-black tracking-tight">{storeName}</h1>
          <p className="text-emerald-100 text-sm mt-1">Stay connected with us</p>
        </div>

        {/* Social links */}
        <div className="px-5 py-6 space-y-3">
          {links.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">No social links configured yet.</p>
          ) : (
            links.map(({ platform, url }) => (
              <a
                key={platform.key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                style={{ backgroundColor: platform.lightBg, color: platform.color }}
              >
                <span className="flex-shrink-0" style={{ color: platform.color }}>
                  {platform.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: platform.color }}>
                    {platform.label}
                  </p>
                  <p className="text-xs opacity-60 truncate" style={{ color: platform.color }}>
                    Follow us on {platform.label}
                  </p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 flex-shrink-0 opacity-50">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Need help with your order?</p>
          <div className="flex flex-col gap-1.5">
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-emerald-600 transition-colors cursor-pointer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                {phone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-emerald-600 transition-colors cursor-pointer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                {email}
              </a>
            )}
            {!phone && !email && (
              <p className="text-xs text-gray-400">Reach out to us on any platform above</p>
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-400">Thank you for shopping with us</p>
    </main>
  )
}
