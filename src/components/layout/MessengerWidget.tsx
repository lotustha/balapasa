'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    fbAsyncInit?: () => void
    FB?: { init: (opts: object) => void; CustomerChat?: { show: () => void } }
  }
}

export default function MessengerWidget() {
  useEffect(() => {
    fetch('/api/store-config').then(r => r.json()).then(d => {
      const pageId = d.FACEBOOK_PAGE_ID
      if (!pageId) return

      // Get theme color to match the store theme
      const primaryColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--clr-primary').trim() || '#16A34A'

      // Inject the Messenger customer chat SDK
      window.fbAsyncInit = function () {
        window.FB?.init({ xfbml: true, version: 'v19.0' })
      }

      if (!document.getElementById('facebook-jssdk')) {
        const script = document.createElement('script')
        script.id = 'facebook-jssdk'
        script.async = true
        script.defer = true
        script.crossOrigin = 'anonymous'
        script.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js'
        document.head.appendChild(script)
      }

      // Inject the chat plugin markup if not already present
      if (!document.getElementById('fb-messenger-widget')) {
        const root = document.createElement('div')
        root.id = 'fb-messenger-widget'
        root.innerHTML = `
          <div id="fb-root"></div>
          <div class="fb-customerchat"
            attribution="biz_inbox"
            page_id="${pageId}"
            theme_color="${primaryColor}"
            logged_in_greeting="Hi! How can we help you?"
            logged_out_greeting="Hi! How can we help you?">
          </div>
        `
        document.body.appendChild(root)
      }
    }).catch(() => {})
  }, [])

  return null
}
