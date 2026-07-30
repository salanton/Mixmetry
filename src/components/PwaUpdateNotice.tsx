import { useEffect, useState } from 'react'
import { useAppPreferences } from '../contexts/AppPreferencesContext'

const PwaUpdateNotice = () => {
  const { language } = useAppPreferences()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const hadController = Boolean(navigator.serviceWorker.controller)
    const handleControllerChange = () => {
      if (hadController) setVisible(true)
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
  }, [])

  if (!visible) return null

  return (
    <div className="pwa-update-notice" role="status">
      <span>
        {language === 'ru'
          ? 'Доступна новая версия приложения.'
          : 'A new version of the app is available.'}
      </span>
      <button type="button" className="text-btn" onClick={() => window.location.reload()}>
        {language === 'ru' ? 'Обновить' : 'Reload'}
      </button>
    </div>
  )
}

export default PwaUpdateNotice
