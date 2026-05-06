import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import AstroPWA from '@vite-pwa/astro'

export default defineConfig({
  devToolbar: { enabled: false },
  integrations: [
    react(),
    AstroPWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'CHORDEE.svg',
        'CHORDEE.png',
        'apple-touch-icon.png',
      ],
      manifest: {
        name: 'Chordee',
        short_name: 'Chordee',
        description: 'Chord chart editor — Pretext-driven layout, Nashville notation, cloud save.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // SPA shell fallback so /c/<code> deep links resolve to the app shell
        // when there's no matching pre-rendered route.
        navigateFallback: '/',
        navigateFallbackDenylist: [/^\/api\//, /^\/_/],
        globPatterns: ['**/*.{css,js,html,svg,png,ico,txt,woff2,ttf,otf,wasm}'],
        // The SMuFL fonts are large; load them on demand from network instead.
        globIgnores: ['**/Petaluma*.woff2', '**/Bravura*.woff2'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  vite: {
    optimizeDeps: {
      include: ['@chenglou/pretext'],
    },
  },
})
