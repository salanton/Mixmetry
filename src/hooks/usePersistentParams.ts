import { useEffect, useReducer, useState } from 'react'
import type { GrowMethodId, Params, PlantStageId } from '../types'
import { clamp } from '../utils/calculations'

export const STORAGE_KEY = 'dripcalc:params:v2'
const RECIPE_GROW_METHODS: GrowMethodId[] = ['hydro', 'coco', 'soil']
const RECIPE_PLANT_STAGES: PlantStageId[] = [
  'seedling',
  'earlyVeg',
  'veg',
  'preFlower',
  'earlyBloom',
  'midBloom',
  'lateBloom',
]

export const PARAM_LIMITS = {
  lightHours: { min: 12, max: 24 },
  plantCount: { min: 1, max: 20 },
  dripRateLph: { min: 0.1, max: 12 },
  dripCount: { min: 1, max: 10 },
  tankVolumeLiters: { min: 1, max: 200 },
  dailyConsumptionLiters: { min: 0.1, max: 30 },
  wateringsPerDay: { min: 1, max: 100 },
  durationMinutes: { min: 1, max: 30 },
} as const

export const DEFAULT_PARAMS: Params = {
  lightHours: 18,
  onlyWhenLight: true,
  correctWatering: true,
  unlimitedWaterings: false,
  showCompensatedDripsCard: true,
  showTankCard: false,
  tankVolumeLiters: 20,
  recipeGrowMethodId: 'hydro',
  recipePlantStageId: 'veg',
  dailyConsumptionLiters: 5,
  lampOnTime: '08:00',
  plantCount: 6,
  dripRateLph: 1.2,
  dripCount: 2,
  wateringsPerDay: 4,
  durationMinutes: 6,
}

type Action =
  | { type: 'set'; key: keyof Params; value: Params[keyof Params] }
  | { type: 'hydrate'; payload: Params }

const isValidTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
const isRecipeGrowMethodId = (value: unknown): value is GrowMethodId =>
  RECIPE_GROW_METHODS.includes(value as GrowMethodId)
const isRecipePlantStageId = (value: unknown): value is PlantStageId =>
  RECIPE_PLANT_STAGES.includes(value as PlantStageId)

const sanitize = (payload: Partial<Params>): Params => ({
  lightHours: clamp(
    payload.lightHours ?? DEFAULT_PARAMS.lightHours,
    PARAM_LIMITS.lightHours.min,
    PARAM_LIMITS.lightHours.max,
  ),
  // Флаг фиксирован в true: режим учитывается всегда как световое окно
  onlyWhenLight: true,
  correctWatering: Boolean(payload.correctWatering ?? DEFAULT_PARAMS.correctWatering),
  unlimitedWaterings: Boolean(payload.unlimitedWaterings ?? DEFAULT_PARAMS.unlimitedWaterings),
  showCompensatedDripsCard: Boolean(
    payload.showCompensatedDripsCard ?? DEFAULT_PARAMS.showCompensatedDripsCard,
  ),
  showTankCard: Boolean(payload.showTankCard ?? DEFAULT_PARAMS.showTankCard),
  tankVolumeLiters: clamp(
    Math.round(payload.tankVolumeLiters ?? DEFAULT_PARAMS.tankVolumeLiters),
    PARAM_LIMITS.tankVolumeLiters.min,
    PARAM_LIMITS.tankVolumeLiters.max,
  ),
  recipeGrowMethodId: isRecipeGrowMethodId(payload.recipeGrowMethodId)
    ? payload.recipeGrowMethodId
    : DEFAULT_PARAMS.recipeGrowMethodId,
  recipePlantStageId: isRecipePlantStageId(payload.recipePlantStageId)
    ? payload.recipePlantStageId
    : DEFAULT_PARAMS.recipePlantStageId,
  dailyConsumptionLiters: clamp(
    payload.dailyConsumptionLiters ?? DEFAULT_PARAMS.dailyConsumptionLiters,
    PARAM_LIMITS.dailyConsumptionLiters.min,
    PARAM_LIMITS.dailyConsumptionLiters.max,
  ),
  lampOnTime: isValidTime(payload.lampOnTime ?? '')
    ? (payload.lampOnTime as string)
    : DEFAULT_PARAMS.lampOnTime,
  plantCount: clamp(
    Math.round(payload.plantCount ?? DEFAULT_PARAMS.plantCount),
    PARAM_LIMITS.plantCount.min,
    PARAM_LIMITS.plantCount.max,
  ),
  dripRateLph: clamp(
    payload.dripRateLph ?? DEFAULT_PARAMS.dripRateLph,
    PARAM_LIMITS.dripRateLph.min,
    PARAM_LIMITS.dripRateLph.max,
  ),
  dripCount: clamp(
    Math.round(payload.dripCount ?? DEFAULT_PARAMS.dripCount),
    PARAM_LIMITS.dripCount.min,
    PARAM_LIMITS.dripCount.max,
  ),
  wateringsPerDay: clamp(
    Math.round(payload.wateringsPerDay ?? DEFAULT_PARAMS.wateringsPerDay),
    PARAM_LIMITS.wateringsPerDay.min,
    (payload.unlimitedWaterings ?? DEFAULT_PARAMS.unlimitedWaterings)
      ? PARAM_LIMITS.wateringsPerDay.max
      : 4,
  ),
  durationMinutes: clamp(
    Math.round(payload.durationMinutes ?? DEFAULT_PARAMS.durationMinutes),
    PARAM_LIMITS.durationMinutes.min,
    PARAM_LIMITS.durationMinutes.max,
  ),
})

const reducer = (state: Params, action: Action): Params => {
  switch (action.type) {
    case 'hydrate':
      return sanitize(action.payload)
    case 'set':
      return sanitize({ ...state, [action.key]: action.value })
    default:
      return state
  }
}

export const usePersistentParams = () => {
  const [params, dispatch] = useReducer(reducer, DEFAULT_PARAMS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Params>
        dispatch({ type: 'hydrate', payload: sanitize(parsed) })
      }
    } catch {
      dispatch({ type: 'hydrate', payload: DEFAULT_PARAMS })
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(params))
      } catch {
        // The calculator stays usable when browser storage is unavailable or full.
      }
    }, 400)
    return () => window.clearTimeout(id)
  }, [params, hydrated])

  const updateParam = <K extends keyof Params>(key: K, value: Params[K]) =>
    dispatch({ type: 'set', key, value })

  return { params, updateParam }
}
