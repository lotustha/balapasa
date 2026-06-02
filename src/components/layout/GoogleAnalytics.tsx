'use client'

import Script from 'next/script'

// Loads GA4 (gtag.js) site-wide when an admin has configured a Measurement ID.
// next/script (afterInteractive) is the correct mechanism — an external loader
// injected via dangerouslySetInnerHTML would NOT execute. GA4 auto-tracks SPA
// route changes via History events, so no manual pageview wiring is needed.
export default function GoogleAnalytics({ gaId }: { gaId: string }) {
  const id = gaId?.trim()
  if (!id || !/^G-[A-Z0-9]+$/i.test(id)) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  )
}
