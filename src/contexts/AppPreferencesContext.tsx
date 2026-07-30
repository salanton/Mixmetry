import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type AppLanguage = 'ru' | 'en'
export type ThemePreference = 'system' | 'light' | 'dark'

type TranslationKey =
  | 'nav.sections'
  | 'nav.calculator'
  | 'nav.fertilizers'
  | 'nav.fertilizersShort'
  | 'nav.recipe'
  | 'nav.recipeShort'
  | 'page.calculator'
  | 'page.fertilizers'
  | 'page.recipe'
  | 'settings.open'
  | 'actions.backToTop'
  | 'settings.title'
  | 'settings.close'
  | 'settings.appearance'
  | 'settings.appearanceHint'
  | 'settings.system'
  | 'settings.light'
  | 'settings.dark'
  | 'settings.language'
  | 'settings.languageHint'
  | 'settings.russian'
  | 'settings.english'

const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  ru: {
    'nav.sections': 'Разделы приложения',
    'nav.calculator': 'Полив',
    'nav.fertilizers': 'Мои удобрения',
    'nav.fertilizersShort': 'Удобрения',
    'nav.recipe': 'Мой рецепт',
    'nav.recipeShort': 'Рецепт',
    'page.calculator': 'Калькулятор автополива',
    'page.fertilizers': 'Мои удобрения',
    'page.recipe': 'Мой рецепт',
    'settings.open': 'Открыть настройки',
    'actions.backToTop': 'Вернуться наверх',
    'settings.title': 'Настройки',
    'settings.close': 'Закрыть настройки',
    'settings.appearance': 'Оформление',
    'settings.appearanceHint': 'Выберите тему интерфейса',
    'settings.system': 'Как в системе',
    'settings.light': 'Светлая',
    'settings.dark': 'Тёмная',
    'settings.language': 'Язык',
    'settings.languageHint': 'Язык интерфейса приложения',
    'settings.russian': 'Русский',
    'settings.english': 'English',
  },
  en: {
    'nav.sections': 'App sections',
    'nav.calculator': 'Watering',
    'nav.fertilizers': 'My nutrients',
    'nav.fertilizersShort': 'Nutrients',
    'nav.recipe': 'My recipe',
    'nav.recipeShort': 'Recipe',
    'page.calculator': 'Irrigation calculator',
    'page.fertilizers': 'My nutrients',
    'page.recipe': 'My recipe',
    'settings.open': 'Open settings',
    'actions.backToTop': 'Back to top',
    'settings.title': 'Settings',
    'settings.close': 'Close settings',
    'settings.appearance': 'Appearance',
    'settings.appearanceHint': 'Choose the interface theme',
    'settings.system': 'System',
    'settings.light': 'Light',
    'settings.dark': 'Dark',
    'settings.language': 'Language',
    'settings.languageHint': 'Application interface language',
    'settings.russian': 'Русский',
    'settings.english': 'English',
  },
}

type AppPreferencesContextValue = {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void
  resolvedTheme: 'light' | 'dark'
  t: (key: TranslationKey) => string
}

const STORAGE_KEY = 'dripcalc:preferences:v1'
const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null)

const getSystemTheme = (): 'light' | 'dark' =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const readPreferences = () => {
  const fallback = { language: 'ru' as AppLanguage, theme: 'system' as ThemePreference }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return fallback
    const parsed = JSON.parse(stored) as Partial<typeof fallback>
    return {
      // English remains hidden until every product flow is fully translated.
      language: 'ru' as AppLanguage,
      theme: parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system'
        ? parsed.theme
        : fallback.theme,
    }
  } catch {
    return fallback
  }
}

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [initialPreferences] = useState(readPreferences)
  const [language, setLanguage] = useState<AppLanguage>(initialPreferences.language)
  const [theme, setTheme] = useState<ThemePreference>(initialPreferences.theme)
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme)
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => setSystemTheme(media.matches ? 'dark' : 'light')
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.style.colorScheme = resolvedTheme
    const themeColor = resolvedTheme === 'dark' ? '#0f1715' : '#f4f7f6'
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', themeColor)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ language, theme }))
    } catch {
      // Preferences remain active for the current session when storage is unavailable.
    }
  }, [language, resolvedTheme, theme])

  const t = useCallback((key: TranslationKey) => translations[language][key], [language])
  const value = useMemo(
    () => ({ language, setLanguage, theme, setTheme, resolvedTheme, t }),
    [language, resolvedTheme, t, theme],
  )

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>
}

// This provider and its companion hook intentionally share one small module.
// eslint-disable-next-line react-refresh/only-export-components
export const useAppPreferences = () => {
  const context = useContext(AppPreferencesContext)
  if (!context) throw new Error('useAppPreferences must be used inside AppPreferencesProvider')
  return context
}
