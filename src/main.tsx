import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AppErrorBoundary from './components/AppErrorBoundary.tsx'
import { AppPreferencesProvider } from './contexts/AppPreferencesContext.tsx'

const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)

document.documentElement.toggleAttribute('data-standalone', isStandalone)

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
