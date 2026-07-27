import { describe, expect, it } from 'vitest'
import type { Params } from '../types'
import {
  calcSchedule,
  calcVolumes,
  minutesToTimeString,
  timeStringToMinutes,
} from './calculations'

const params: Params = {
  lightHours: 18,
  onlyWhenLight: true,
  correctWatering: true,
  unlimitedWaterings: false,
  showCompensatedDripsCard: true,
  showTankCard: true,
  tankVolumeLiters: 80,
  recipeGrowMethodId: 'hydro',
  recipePlantStageId: 'veg',
  dailyConsumptionLiters: 6,
  lampOnTime: '08:00',
  plantCount: 3,
  dripRateLph: 2,
  dripCount: 4,
  wateringsPerDay: 3,
  durationMinutes: 5,
}

describe('time conversion', () => {
  it('normalizes values across midnight', () => {
    expect(minutesToTimeString(25 * 60 + 30)).toBe('01:30')
    expect(minutesToTimeString(-30)).toBe('23:30')
  })

  it('clamps invalid clock parts', () => {
    expect(timeStringToMinutes('25:90')).toBe(23 * 60 + 59)
    expect(timeStringToMinutes('invalid')).toBe(0)
  })
})

describe('irrigation calculations', () => {
  it('calculates per-watering and daily volumes', () => {
    expect(calcVolumes(params)).toEqual({
      durationHours: 5 / 60,
      volumePerPlant: 2 / 3,
      volumePerWatering: 2,
      dailyTotal: 6,
      dailyPerPlant: 2,
    })
  })

  it('spreads watering events through the guarded light window', () => {
    const volumes = calcVolumes(params)
    const schedule = calcSchedule(params, volumes)

    expect(schedule.availableDuration).toBe(17 * 60)
    expect(schedule.entries.map((entry) => entry.label)).toEqual(['08:30', '17:00', '01:30'])
  })

  it('centers a single watering in the available window', () => {
    const oneWatering = { ...params, wateringsPerDay: 1 }
    const schedule = calcSchedule(oneWatering, calcVolumes(oneWatering))

    expect(schedule.entries[0].label).toBe('17:00')
  })

  it('uses a full day when watering is not limited to the light window', () => {
    const unrestricted = { ...params, onlyWhenLight: false, correctWatering: false }
    const schedule = calcSchedule(unrestricted, calcVolumes(unrestricted))

    expect(schedule.availableDuration).toBe(24 * 60)
    expect(schedule.entries.map((entry) => entry.label)).toEqual(['08:00', '20:00', '08:00'])
  })
})
