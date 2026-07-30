import { afterEach, describe, expect, it, vi } from 'vitest'
import { readMigratedStorage } from './storage'

const createStorage = (entries: Record<string, string> = {}) => {
  const values = new Map(Object.entries(entries))
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('storage key migration', () => {
  it('prefers an existing Mixmetry value', () => {
    const storage = createStorage({ current: 'new', legacy: 'old' })
    vi.stubGlobal('localStorage', storage)

    expect(readMigratedStorage('current', 'legacy')).toBe('new')
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('copies a legacy DripCalc value into the Mixmetry key', () => {
    const storage = createStorage({ legacy: 'saved' })
    vi.stubGlobal('localStorage', storage)

    expect(readMigratedStorage('current', 'legacy')).toBe('saved')
    expect(storage.setItem).toHaveBeenCalledWith('current', 'saved')
  })

  it('returns null when neither key exists', () => {
    const storage = createStorage()
    vi.stubGlobal('localStorage', storage)

    expect(readMigratedStorage('current', 'legacy')).toBeNull()
  })
})
