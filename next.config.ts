import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.pathao.com' },
      // Daraz / Lazada CDN
      { protocol: 'https', hostname: '*.daraz.com.np' },
      { protocol: 'https', hostname: '*.daraz.com' },
      { protocol: 'https', hostname: '*.lazcdn.com' },
      { protocol: 'https', hostname: '*.slatic.net' },
      { protocol: 'http',  hostname: '185.194.218.69' },
    ],
  },
}

export default nextConfig
