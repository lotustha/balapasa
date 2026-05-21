import type { Metadata } from 'next'
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react'
import { getSiteSettings } from '@/lib/site-settings'
import PageShell from '@/components/legal/PageShell'

function FacebookIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
}
function InstagramIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
}
function XIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.625L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
}
function YoutubeIcon() {
  return <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
}

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, storeUrl } = await getSiteSettings()
  const title = `Contact us — ${siteName}`
  const description = `Reach the ${siteName} team by email, phone, WhatsApp, or social.`
  return {
    title,
    description,
    alternates: { canonical: `${storeUrl}/contact` },
    openGraph: { title, description, url: `${storeUrl}/contact`, siteName, type: 'website' },
  }
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  href?: string
}) {
  if (!value) return null
  const inner = (
    <>
      <div className="w-10 h-10 rounded-xl glass-md flex items-center justify-center shrink-0">
        <Icon size={16} className="text-primary" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
        <div className="text-slate-700 font-medium break-words">{value}</div>
      </div>
    </>
  )
  return href ? (
    <a href={href} className="flex items-start gap-3 group hover:opacity-80 transition-opacity">{inner}</a>
  ) : (
    <div className="flex items-start gap-3">{inner}</div>
  )
}

export default async function ContactPage() {
  const s = await getSiteSettings()
  const c = s.content.contact

  const waLink =
    s.whatsappNumber
      ? `https://wa.me/${s.whatsappNumber.replace(/[^\d]/g, '')}`
      : ''

  const fbLink = s.facebookPageId ? `https://facebook.com/${s.facebookPageId}` : ''

  const socials = [
    { name: 'Facebook',  href: fbLink,       Icon: FacebookIcon  },
    { name: 'Instagram', href: c.instagram,  Icon: InstagramIcon },
    { name: 'X',         href: c.x,          Icon: XIcon         },
    { name: 'YouTube',   href: c.youtube,    Icon: YoutubeIcon   },
  ].filter(s => s.href)

  return (
    <PageShell
      eyebrow="Get in touch"
      title="Contact us"
      intro="Questions about an order, a product, or anything else? We're here to help."
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* Channels */}
        <div className="space-y-5">
          <ContactRow icon={Mail}   label="Email"    value={s.storeEmail}   href={s.storeEmail ? `mailto:${s.storeEmail}` : undefined} />
          <ContactRow icon={Phone}  label="Phone"    value={s.storePhone}   href={s.storePhone ? `tel:${s.storePhone}` : undefined} />
          {s.whatsappNumber && (
            <ContactRow icon={MessageCircle} label="WhatsApp" value={s.whatsappNumber} href={waLink} />
          )}
          <ContactRow icon={MapPin} label="Address"  value={s.storeAddress} />
          <ContactRow icon={Clock}  label="Hours"    value={c.hours} />

          {socials.length > 0 && (
            <div className="pt-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Find us on</div>
              <div className="flex items-center gap-3">
                {socials.map(({ name, href, Icon }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={name}
                    className="w-10 h-10 rounded-xl glass-md flex items-center justify-center text-slate-600 hover:text-primary transition-colors"
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick message card */}
        <div className="glass rounded-2xl p-5">
          <h2 className="font-heading font-bold text-lg text-slate-800 mb-2">Quick message</h2>
          <p className="text-sm text-slate-500 mb-4 leading-relaxed">
            The fastest way to reach us is on WhatsApp or email — we typically reply within
            a few hours during business days.
          </p>
          <div className="flex flex-col gap-2">
            {s.whatsappNumber && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors"
              >
                <MessageCircle size={16} /> WhatsApp us
              </a>
            )}
            {s.storeEmail && (
              <a
                href={`mailto:${s.storeEmail}`}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                <Mail size={16} /> Email us
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Map embed */}
      {c.mapEmbed && (
        <div className="mt-8 rounded-2xl overflow-hidden border border-slate-200 aspect-[16/9]">
          <iframe
            src={c.mapEmbed}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Our location"
          />
        </div>
      )}
    </PageShell>
  )
}
