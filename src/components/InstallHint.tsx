import { useState } from 'react'
import { useAppPreferences } from '../contexts/AppPreferencesContext'

const STORAGE_KEY = 'dripcalc:install-hint-dismissed'

const isInstalledPwa = () => window.matchMedia('(display-mode: standalone)').matches
  || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)

const isMobileBrowser = () => window.matchMedia('(max-width: 639px)').matches

const InstallHint = () => {
  const { language } = useAppPreferences()
  const [visible, setVisible] = useState(() => {
    if (!isMobileBrowser() || isInstalledPwa()) return false
    try {
      return !localStorage.getItem(STORAGE_KEY)
    } catch {
      return true
    }
  })

  const handleClose = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // Dismissing still works for the current session without persistent storage.
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="install-hint" role="note">
      <div>
        {language === 'ru'
          ? 'Добавьте приложение на экран «Домой»: в Safari нажмите «Поделиться» → «На экран „Домой“». После этого оно будет доступно офлайн.'
          : 'Add the app to your Home Screen: in Safari, tap Share → Add to Home Screen. It will then be available offline.'}
      </div>
      <button type="button" className="text-btn" onClick={handleClose} aria-label={language === 'ru' ? 'Закрыть' : 'Close'}>
        {language === 'ru' ? 'Закрыть' : 'Close'}
      </button>
    </div>
  )
}

export default InstallHint
