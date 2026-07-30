import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const pwa = VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['apple-touch-icon.png'],
  manifest: {
    name: 'Mixmetry — Полив и питание растений',
    short_name: 'Mixmetry',
    description: 'Расчёт расписания автополива и рецептов питательного раствора',
    lang: 'ru',
    id: '.',
    start_url: '.',
    scope: '.',
    display: 'standalone',
    background_color: '#f4f7f6',
    theme_color: '#f4f7f6',
    icons: [
      {
        src: 'icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: 'icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png}'],
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true,
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.destination === 'document',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages',
          expiration: { maxEntries: 10 }
        }
      }
    ]
  }
})

// https://vite.dev/config/
export default defineConfig({
  base: '/Mixmetry/',
  plugins: [react(), pwa],
  server: {
    host: '0.0.0.0', // Доступ по IP адресу
    port: 5173,
  },
})
