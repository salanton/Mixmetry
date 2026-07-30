import { describe, expect, it } from 'vitest'
import { FERTILIZER_LIBRARY, PLANT_STAGES } from './fertilizerLibrary'
import type { FertilizerStageDosage } from '../types'

const stageIds = new Set(PLANT_STAGES.map((stage) => stage.id))

const validateSchedule = (schedule: FertilizerStageDosage[]) => {
  expect(schedule).toHaveLength(PLANT_STAGES.length)
  expect(new Set(schedule.map((dose) => dose.stageId)).size).toBe(schedule.length)
  schedule.forEach((dose) => {
    expect(stageIds.has(dose.stageId)).toBe(true)
    if (dose.amountMlPerLiter !== null) expect(dose.amountMlPerLiter).toBeGreaterThanOrEqual(0)
  })
}

describe('fertilizer library integrity', () => {
  it('contains unique, complete library records', () => {
    expect(FERTILIZER_LIBRARY.length).toBeGreaterThan(0)
    expect(new Set(FERTILIZER_LIBRARY.map((item) => item.id)).size).toBe(FERTILIZER_LIBRARY.length)
    FERTILIZER_LIBRARY.forEach((item) => {
      expect(item.id.trim()).not.toBe('')
      expect(item.name.trim()).not.toBe('')
      expect(item.manufacturer.trim()).not.toBe('')
      expect(item.shortDescription.trim()).not.toBe('')
      expect(item.description.trim()).not.toBe('')
      validateSchedule(item.stageDosages)

      Object.values(item.methodStageDosages ?? {}).forEach((schedule) => {
        if (schedule) validateSchedule(schedule)
      })
      item.components?.forEach((component) => {
        validateSchedule(component.stageDosages)
        Object.values(component.methodStageDosages ?? {}).forEach((schedule) => {
          if (schedule) validateSchedule(schedule)
        })
      })
    })
  })
})
