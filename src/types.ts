export type Params = {
  lightHours: number
  onlyWhenLight: boolean
  correctWatering: boolean
  unlimitedWaterings: boolean
  showCompensatedDripsCard: boolean
  showTankCard: boolean
  tankVolumeLiters: number
  recipeGrowMethodId: GrowMethodId
  recipePlantStageId: PlantStageId
  dailyConsumptionLiters: number
  lampOnTime: string
  plantCount: number
  dripRateLph: number
  dripCount: number
  wateringsPerDay: number
  durationMinutes: number
}

export type Volumes = {
  durationHours: number
  volumePerWatering: number
  volumePerPlant: number
  dailyTotal: number
  dailyPerPlant: number
}

export type ScheduleEntry = {
  label: string
  absoluteMinutes: number
  volumeTotal: number
  volumePerPlant: number
}

export type ScheduleResult = {
  entries: ScheduleEntry[]
  windowStart: number
  windowEnd: number
  availableDuration: number
}

export type FertilizerCategoryId = 'base' | 'boosters'

export type PlantStageId =
  | 'seedling'
  | 'earlyVeg'
  | 'veg'
  | 'preFlower'
  | 'earlyBloom'
  | 'midBloom'
  | 'lateBloom'

export type PlantStage = {
  id: PlantStageId
  title: string
  description: string
}

export type FertilizerStageLabel = {
  title: string
  description?: string
}

export type GrowMethodId = 'hydro' | 'coco' | 'soil'

export type GrowMethod = {
  id: GrowMethodId
  title: string
}

export type FertilizerGrowMethodId = GrowMethodId | 'any'

export type FertilizerStageDosage = {
  stageId: PlantStageId
  amountMlPerLiter: number | null
  amountLabel?: string
}

export type FertilizerSolutionTarget = {
  stageId: PlantStageId
  phRange: string | null
  ecRange: string | null
}

export type FertilizerComponent = {
  id: string
  name: string
  stageDosages: FertilizerStageDosage[]
  methodStageDosages?: Partial<Record<GrowMethodId, FertilizerStageDosage[]>>
}

export type FertilizerItem = {
  id: string
  categoryId: FertilizerCategoryId
  manufacturer: string
  growMethodId: FertilizerGrowMethodId
  name: string
  shortDescription: string
  description: string
  details: string[]
  excludedGrowMethodIds?: GrowMethodId[]
  stageDosages: FertilizerStageDosage[]
  stageLabels?: Partial<Record<PlantStageId, FertilizerStageLabel>>
  methodStageDosages?: Partial<Record<GrowMethodId, FertilizerStageDosage[]>>
  components?: FertilizerComponent[]
  solutionTargets?: FertilizerSolutionTarget[]
  application?: 'root' | 'foliar'
  foliarDose?: string
  source: 'library'
}

export type FertilizerCategory = {
  id: FertilizerCategoryId
  title: string
  description: string
}
