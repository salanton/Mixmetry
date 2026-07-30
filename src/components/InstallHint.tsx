import { useState } from 'react'
import { useAppPreferences } from '../contexts/AppPreferencesContext'
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS, readMigratedStorage } from '../utils/storage'

const STORAGE_KEY = STORAGE_KEYS.installHintDismissed

const isInstalledPwa = () => window.matchMedia('(display-mode: standalone)').matches
  || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)

const isMobileBrowser = () => window.matchMedia('(max-width: 639px)').matches

const getInstallInstructions = (language: 'ru' | 'en') => {
  const userAgent = navigator.userAgent.toLowerCase()
  const isIos = /iphone|ipad|ipod/.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isAndroid = userAgent.includes('android')

  if (isIos) {
    return language === 'ru'
      ? 'Добавьте приложение на экран «Домой»: в Safari нажмите «Поделиться» → «На экран „Домой“». После этого оно будет доступно офлайн.'
      : 'Add the app to your Home Screen: in Safari, tap Share → Add to Home Screen. It will then be available offline.'
  }

  if (isAndroid) {
    return language === 'ru'
      ? 'Установите приложение через меню браузера: выберите «Установить приложение» или «Добавить на главный экран». После этого оно будет доступно офлайн.'
      : 'Install the app from your browser menu: choose Install app or Add to Home screen. It will then be available offline.'
  }

  return language === 'ru'
    ? 'Установите приложение через меню мобильного браузера, чтобы оно было доступно с главного экрана и работало офлайн.'
    : 'Install the app from your mobile browser menu to add it to your Home Screen and make it available offline.'
}

const InstallHint = () => {
  const { language } = useAppPreferences()
  const [visible, setVisible] = useState(() => {
    if (!isMobileBrowser() || isInstalledPwa()) return false
    try {
      return !readMigratedStorage(STORAGE_KEY, LEGACY_STORAGE_KEYS.installHintDismissed)
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
        {getInstallInstructions(language)}
      </div>
      <button type="button" className="text-btn" onClick={handleClose} aria-label={language === 'ru' ? 'Закрыть' : 'Close'}>
        {language === 'ru' ? 'Закрыть' : 'Close'}
      </button>
    </div>
  )
}

export default InstallHint
