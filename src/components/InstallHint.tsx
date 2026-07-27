import { useState } from 'react'

const STORAGE_KEY = 'dripcalc:install-hint-dismissed'

const InstallHint = () => {
  const [visible, setVisible] = useState(() => {
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
        Добавьте на экран «Домой» в Safari → Поделиться → «На экран «Домой» для работы офлайн.
      </div>
      <button type="button" className="text-btn" onClick={handleClose} aria-label="Закрыть">
        Закрыть
      </button>
    </div>
  )
}

export default InstallHint
