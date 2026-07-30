import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AppErrorBoundary from './components/AppErrorBoundary.tsx'
import { AppPreferencesProvider } from './contexts/AppPreferencesContext.tsx'

const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)

document.documentElement.toggleAttribute('data-standalone', isStandalone)

if ('serviceWorker' in navigator) {
  let isReloadingForUpdate = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isReloadingForUpdate) return
    isReloadingForUpdate = true
    window.location.reload()
  })

  const requestServiceWorkerUpdate = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      await registration?.update()
    } catch {
      // Offline launches keep using the current cached application shell.
    }
  }

  window.addEventListener('load', () => {
    void requestServiceWorkerUpdate()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void requestServiceWorkerUpdate()
  })
}

const syncStandaloneViewportMode = () => {
  const systemInset = Math.max(0, window.screen.height - window.innerHeight)
  document.documentElement.toggleAttribute('data-system-constrained', isStandalone && systemInset > 24)
}

syncStandaloneViewportMode()
window.addEventListener('resize', syncStandaloneViewportMode)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AppPreferencesProvider>
        <App />
      </AppPreferencesProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
