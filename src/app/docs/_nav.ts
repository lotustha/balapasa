export type NavItem = { label: string; href: string }

export const nav: NavItem[] = [
  { label: 'Overview', href: '/docs' },
  { label: 'Getting Started', href: '/docs/getting-started' },
  { label: 'Authentication', href: '/docs/getting-started#auth' },
  { label: 'Customer App', href: '/docs/customer-app' },
  { label: 'Rider App', href: '/docs/rider-app' },
  { label: 'Store App', href: '/docs/store-app' },
  { label: 'API Reference', href: '/docs/reference' },
  { label: 'Mobile: Flutter', href: '/docs/mobile/flutter' },
  { label: 'Mobile: React Native', href: '/docs/mobile/react-native' },
  { label: 'Push Notifications (FCM)', href: '/docs/notifications' },
]
