import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppPreferences } from '../contexts/AppPreferencesContext'
import type { AppLanguage, ThemePreference } from '../contexts/AppPreferencesContext'
import { useModalAccessibility } from '../hooks/useModalAccessibility'

const TuneIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h10M18 7h2M14 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM4 17h2M10 17h10M6 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m7 7 10 10M17 7 7 17" />
  </svg>
)

export default function AppSettings() {
  const [isOpen, setIsOpen] = useState(false)
  const { language, setLanguage, theme, setTheme, t } = useAppPreferences()
  useModalAccessibility(isOpen ? 'app-settings' : null, '.app-settings', () => setIsOpen(false))

  const themes: Array<{ value: ThemePreference; label: string }> = [
    { value: 'system', label: t('settings.system') },
    { value: 'light', label: t('settings.light') },
    { value: 'dark', label: t('settings.dark') },
  ]
  const languages: Array<{ value: AppLanguage; label: string }> = [
    { value: 'ru', label: t('settings.russian') },
    { value: 'en', label: t('settings.english') },
  ]

  return (
    <>
      <button
        className="settings-trigger"
        type="button"
        aria-label={t('settings.open')}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <TuneIcon />
      </button>

      {isOpen ? createPortal(
        <div className="app-settings-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsOpen(false)
        }}>
          <section
            className="app-settings"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-settings-title"
            tabIndex={-1}
          >
            <header className="app-settings__header">
              <div>
                <span className="app-settings__eyebrow">Mixmetry</span>
                <h2 id="app-settings-title">{t('settings.title')}</h2>
              </div>
              <button
                className="app-settings__close"
                type="button"
                aria-label={t('settings.close')}
                onClick={() => setIsOpen(false)}
              >
                <CloseIcon />
              </button>
            </header>

            <fieldset className="app-settings__group">
              <legend>{t('settings.appearance')}</legend>
              <p>{t('settings.appearanceHint')}</p>
              <div className="app-settings__segments">
                {themes.map((option) => (
                  <label className={theme === option.value ? 'app-settings__option app-settings__option--active' : 'app-settings__option'} key={option.value}>
                    <input
                      type="radio"
                      name="theme"
                      value={option.value}
                      checked={theme === option.value}
                      onChange={() => setTheme(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="app-settings__group">
              <legend>{t('settings.language')}</legend>
              <p>{t('settings.languageHint')}</p>
              <div className="app-settings__segments app-settings__segments--language">
                {languages.map((option) => (
                  <label className={language === option.value ? 'app-settings__option app-settings__option--active' : 'app-settings__option'} key={option.value}>
                    <input
                      type="radio"
                      name="language"
                      value={option.value}
                      checked={language === option.value}
                      onChange={() => setLanguage(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

          </section>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
