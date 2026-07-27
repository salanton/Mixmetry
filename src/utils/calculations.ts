import type { Params, ScheduleResult, Volumes } from '../types'

export const EDGE_OFFSET_MIN = 30
const MINUTES_PER_DAY = 24 * 60

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const timeStringToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0
  return clamp(hours, 0, 23) * 60 + clamp(minutes, 0, 59)
}

export const minutesToTimeString = (totalMinutes: number): string => {
  const normalized =
    ((Math.round(totalMinutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  const pad = (v: number) => v.toString().padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}`
}

export const calcVolumes = (params: Params): Volumes => {
  const durationHours = params.durationMinutes / 60
  const volumePerPlant = params.dripRateLph * durationHours * params.dripCount
  const volumePerWatering = volumePerPlant * params.plantCount
  const dailyTotal = volumePerWatering * params.wateringsPerDay
  const dailyPerPlant = volumePerPlant * params.wateringsPerDay

  return { durationHours, volumePerWatering, volumePerPlant, dailyTotal, dailyPerPlant }
}

export const calcSchedule = (params: Params, volumes: Volumes): ScheduleResult => {
  const lampStart = timeStringToMinutes(params.lampOnTime)
  const lightDuration = (params.onlyWhenLight ? params.lightHours : 24) * 60
  const edgeOffset = params.onlyWhenLight && params.correctWatering ? EDGE_OFFSET_MIN : 0
  const availableDuration = Math.max(lightDuration - edgeOffset * 2, 0)
  const windowStart = lampStart + edgeOffset
  const windowEnd = windowStart + availableDuration
  const count = Math.max(1, params.wateringsPerDay)

  const times: number[] = []
  if (availableDuration <= 0) {
    times.push(windowStart)
  } else if (count === 1) {
    times.push(windowStart + availableDuration / 2)
  } else {
    const step = availableDuration / (count - 1)
    for (let i = 0; i < count; i += 1) {
      times.push(windowStart + step * i)
    }
  }

  const entries = times.map((absoluteMinutes) => ({
    absoluteMinutes,
    label: minutesToTimeString(absoluteMinutes),
    volumeTotal: volumes.volumePerWatering,
    volumePerPlant: volumes.volumePerPlant,
  }))

  return { entries, windowStart, windowEnd, availableDuration }
}
