import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const pwa = VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['apple-touch-icon.png'],
  manifest: {
    name: 'DripCalc — Калькулятор автополива',
    short_name: 'DripCalc',
    description: 'Расчёт расписания автополива и рецептов питательного раствора',
    lang: 'ru',
    id: '.',
    start_url: '.',
    scope: '.',
    display: 'standalone',
    background_color: '#f5f6f9',
    theme_color: '#f5f6f9',
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
    globPatterns: ['**/*.{js,css,html}'],
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.destination === 'document',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages',
          expiration: { maxEntries: 10 }
        }
      },
      {
        urlPattern: ({ request }) =>
          ['style', 'script', 'image', 'font'].includes(request.destination),
        handler: 'CacheFirst',
        options: {
          cacheName: 'assets',
          expiration: { maxEntries: 50 }
        }
      }
    ]
  }
})

// https://vite.dev/config/
export default defineConfig({
  base: '/DripCalc/',
  plugins: [react(), pwa],
  server: {
    host: '0.0.0.0', // Доступ по IP адресу
    port: 5173,
  },
})
