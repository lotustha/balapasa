import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Phone, Mail, Heart } from 'lucide-react'

interface FooterProps {
  siteName?:   string
  brandSplit?: { primary: string; accent: string }
  logoUrl?:    string
}

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

const LINKS = {
  Shop: [
    { href: '/products?category=electronics', label: 'Electronics' },
    { href: '/products?category=gadgets',     label: 'Gadgets' },
    { href: '/products?category=beauty',      label: 'Beauty & Skin' },
    { href: '/products',                      label: 'All Products' },
  ],
  Support: [
    { href: '/faq',      label: 'FAQ' },
    { href: '/shipping', label: 'Shipping Info' },
    { href: '/returns',  label: 'Returns' },
    { href: '/contact',  label: 'Contact Us' },
  ],
  Company: [
    { href: '/about',   label: 'About Us' },
    { href: '/blog',    label: 'Blog' },
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms',   label: 'Terms of Service' },
  ],
}

const SOCIALS = [
  { href: '#', icon: FacebookIcon,  label: 'Facebook'  },
  { href: '#', icon: InstagramIcon, label: 'Instagram' },
  { href: '#', icon: XIcon,         label: 'X'         },
  { href: '#', icon: YoutubeIcon,   label: 'YouTube'   },
]

export default function Footer({
  siteName   = 'Balapasa',
  brandSplit = { primary: 'Bala', accent: 'pasa' },
  logoUrl    = '/logo.png',
}: FooterProps = {}) {
  return (
    <footer
      className="relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #EEF2FF 0%, #F4F6FF 100%)' }}
    >
      {/* Blobs */}
      <div className="absolute top-0 left-0 w-72 h-72 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: '#8B5CF6' }} />
      <div className="absolute top-0 right-0 w-56 h-56 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: '#EC4899' }} />

      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5 cursor-pointer">
              <Image src={logoUrl} alt={siteName} width={40} height={40} className="rounded-2xl" />
              <span className="font-heading font-bold text-xl text-slate-800">
                {brandSplit.primary}
                {brandSplit.accent && <span className="iridescent-text">{brandSplit.accent}</span>}
              </span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              Your one-stop destination for premium electronics, gadgets, and beauty products — delivered fast across Nepal.
            </p>
            <div className="flex gap-2.5 mt-6">
              {SOCIALS.map(({ href, icon: Icon, label }) => (
                <a key={label} href={href} aria-label={label}
                  className="w-9 h-9 glass rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white/80 transition-all duration-200 cursor-pointer">
                  <Icon />
                </a>
              ))}
            </div>
            <div className="mt-6 space-y-2.5">
              {[
                { icon: MapPin, text: 'Kathmandu, Nepal' },
                { icon: Phone,  text: '+977 98XXXXXXXX' },
                { icon: Mail,   text: 'hello@balapasa.com' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-slate-500">
                  <Icon size={13} className="text-primary shrink-0" /> {text}
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-heading font-bold text-slate-800 text-sm uppercase tracking-wider mb-5">{title}</h4>
              <ul className="space-y-3">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400 flex items-center gap-1">
            Made with <Heart size={10} className="text-pink-500 fill-pink-500" /> in Nepal &middot;
            &copy; {new Date().getFullYear()} {siteName}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 mr-1">We accept</span>
            {/* eSewa logo */}
            <div className="px-2 py-1 glass rounded-lg shadow-sm flex items-center" style={{ height: 28 }}>
              <div className="relative" style={{ width: 52, height: 18 }}>
                <Image src="/esewa.png" alt="eSewa" fill className="object-contain" sizes="52px" />
              </div>
            </div>
            {/* Khalti logo */}
            <div className="px-2 py-1 glass rounded-lg shadow-sm flex items-center" style={{ height: 28 }}>
              <div className="relative" style={{ width: 46, height: 18 }}>
                <Image src="/khalti.png" alt="Khalti" fill className="object-contain" sizes="46px" />
              </div>
            </div>
            {/* COD text badge */}
            <span className="px-2.5 py-1 glass rounded-lg text-[10px] font-bold text-slate-600 shadow-sm">COD</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
