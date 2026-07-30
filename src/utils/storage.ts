export const STORAGE_KEYS = {
  preferences: 'mixmetry:preferences:v1',
  params: 'mixmetry:params:v2',
  fertilizers: 'mixmetry:fertilizers:v1',
  installHintDismissed: 'mixmetry:install-hint-dismissed',
} as const

export const LEGACY_STORAGE_KEYS = {
  preferences: 'dripcalc:preferences:v1',
  params: 'dripcalc:params:v2',
  fertilizers: 'dripcalc:fertilizers:v1',
  installHintDismissed: 'dripcalc:install-hint-dismissed',
} as const

export const readMigratedStorage = (key: string, legacyKey: string) => {
  const currentValue = localStorage.getItem(key)
  if (currentValue !== null) return currentValue

  const legacyValue = localStorage.getItem(legacyKey)
  if (legacyValue === null) return null

  try {
    localStorage.setItem(key, legacyValue)
  } catch {
    // Reading the legacy value is still useful when storage is read-only.
  }
  return legacyValue
}
