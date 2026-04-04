import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.svg', 'icons/icon-512.svg'],
      manifest: {
        name: 'Kavaach',
        short_name: 'Kavaach',
        theme_color: '#1A3A2A',
        background_color: '#F7F5F0',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: 'icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/localhost:8000\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'kavaach-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
})
