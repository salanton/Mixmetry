import { describe, expect, it } from 'vitest'
import { DEFAULT_PARAMS, PARAM_LIMITS, sanitizeParams } from './usePersistentParams'

describe('sanitizeParams', () => {
  it('clamps numeric values to supported limits', () => {
    const params = sanitizeParams({
      lightHours: 100,
      plantCount: -4,
      dripRateLph: Number.POSITIVE_INFINITY,
      tankVolumeLiters: 999,
      wateringsPerDay: 80,
      unlimitedWaterings: false,
    })

    expect(params.lightHours).toBe(PARAM_LIMITS.lightHours.max)
    expect(params.plantCount).toBe(PARAM_LIMITS.plantCount.min)
    expect(params.dripRateLph).toBe(DEFAULT_PARAMS.dripRateLph)
    expect(params.tankVolumeLiters).toBe(PARAM_LIMITS.tankVolumeLiters.max)
    expect(params.wateringsPerDay).toBe(4)
  })

  it('allows the extended watering limit only in unlimited mode', () => {
    expect(sanitizeParams({ wateringsPerDay: 80, unlimitedWaterings: true }).wateringsPerDay).toBe(80)
  })

  it('replaces invalid time and recipe identifiers with defaults', () => {
    const params = sanitizeParams({
      lampOnTime: '29:90',
      recipeGrowMethodId: 'invalid' as never,
      recipePlantStageId: 'invalid' as never,
    })

    expect(params.lampOnTime).toBe(DEFAULT_PARAMS.lampOnTime)
    expect(params.recipeGrowMethodId).toBe(DEFAULT_PARAMS.recipeGrowMethodId)
    expect(params.recipePlantStageId).toBe(DEFAULT_PARAMS.recipePlantStageId)
  })

  it('replaces non-numeric and non-finite persisted values with defaults', () => {
    const params = sanitizeParams({
      lightHours: Number.NaN,
      dailyConsumptionLiters: 'broken' as never,
      plantCount: Number.NEGATIVE_INFINITY,
      dripCount: null as never,
    })

    expect(params.lightHours).toBe(DEFAULT_PARAMS.lightHours)
    expect(params.dailyConsumptionLiters).toBe(DEFAULT_PARAMS.dailyConsumptionLiters)
    expect(params.plantCount).toBe(DEFAULT_PARAMS.plantCount)
    expect(params.dripCount).toBe(DEFAULT_PARAMS.dripCount)
  })

  it('accepts only real booleans from persisted settings', () => {
    const params = sanitizeParams({
      correctWatering: 'false' as never,
      unlimitedWaterings: 1 as never,
      showCompensatedDripsCard: null as never,
      showTankCard: true,
      wateringsPerDay: 80,
    })

    expect(params.correctWatering).toBe(DEFAULT_PARAMS.correctWatering)
    expect(params.unlimitedWaterings).toBe(DEFAULT_PARAMS.unlimitedWaterings)
    expect(params.showCompensatedDripsCard).toBe(DEFAULT_PARAMS.showCompensatedDripsCard)
    expect(params.showTankCard).toBe(true)
    expect(params.wateringsPerDay).toBe(4)
  })
})
