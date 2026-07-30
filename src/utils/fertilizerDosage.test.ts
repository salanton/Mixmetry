import { describe, expect, it } from 'vitest'
import { FERTILIZER_LIBRARY } from '../data/fertilizerLibrary'
import {
  formatBaseComponentCount,
  formatFertilizerBadge,
  formatRecipePerLiterValue,
  formatRecipeTotalValue,
  getStageAmount,
  localizeDosageText,
} from './fertilizerDosage'

describe('fertilizer dosage formatting', () => {
  it('creates compact badges without losing a plus suffix', () => {
    expect(formatFertilizerBadge('КалМаг Плюс')).toBe('КМ+')
    expect(formatFertilizerBadge('PKB')).toBe('PK')
  })

  it('localizes units and strips units from recipe table values', () => {
    expect(localizeDosageText('1.5 мл/л', 'en')).toBe('1.5 mL/L')
    expect(formatRecipePerLiterValue('1.5 мл/л', 'ru')).toBe('1.5')
    expect(formatRecipeTotalValue('37.50 мл', 'ru')).toBe('37.50')
  })

  it('reads stage amounts from the library and summarizes base components', () => {
    const base = FERTILIZER_LIBRARY.find((item) => item.categoryId === 'base' && item.components?.length)
    expect(base).toBeDefined()
    expect(getStageAmount(base!, 'seedling', base!.growMethodId, base!.components![0])).not.toBeNull()
    expect(formatBaseComponentCount(base!)).toMatch(/^\d+x(?:\+\d+x)*$/)
  })
})
