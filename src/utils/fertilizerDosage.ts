import { PLANT_STAGES } from '../data/fertilizerLibrary'
import type { FertilizerComponent, FertilizerItem, PlantStageId } from '../types'

export type RecipeRow = {
  fertilizer: FertilizerItem
  component?: FertilizerComponent
  amountMlPerLiter: number
  amountTotal: number
}

const formatMlValue = (value: number) => {
  const rounded = Number(value.toFixed(2))
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(2)} мл`
}

const formatDosageNumber = (value: number) => {
  const rounded = Number(value.toFixed(2))
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(2)
}

const getDosageUnit = (label?: string) => {
  if (!label) return 'мл'
  return /(?:^|[\s\d,.])(?:g|gr|г)\s*(?:\/|$)/i.test(label) ? 'г' : 'мл'
}

const formatDosagePerLiter = (value: number, label?: string) => {
  if (label && /(?:\/\s*(?:l|л|10l|10л)|mL\/L|мл\/л|g\/L|gr\/L|г\/л)/i.test(label)) return label
  return `${label ?? formatDosageNumber(value)} мл/л`
}

const getDosageRangeValues = (label?: string) => {
  if (!label?.includes('-')) return null
  const values = label
    .replace(',', '.')
    .split('-')
    .map((value) => Number.parseFloat(value.trim()))
    .filter((value) => Number.isFinite(value))
  return values.length >= 2 ? values : null
}

export const formatFertilizerBadge = (name: string) => {
  const hasPlusSuffix = /(?:\bplus\b|плюс)/iu.test(name)
  const nameWithoutPlus = name.replace(/(?:\bplus\b|плюс)/giu, '').trim()
  const lettersOnly = [...nameWithoutPlus.matchAll(/\p{L}/gu)].map(([letter]) => letter).join('')
  const isAllCapsName = lettersOnly.length > 1 && lettersOnly === lettersOnly.toLocaleUpperCase()
  const uppercaseLetters = [...nameWithoutPlus.matchAll(/\p{Lu}/gu)].map(([letter]) => letter)
  const badgeText = isAllCapsName
    ? (nameWithoutPlus || name).slice(0, 2)
    : uppercaseLetters.length > 1
      ? uppercaseLetters.join('')
      : (nameWithoutPlus || name).slice(0, 2)
  return `${badgeText}${hasPlusSuffix ? '+' : ''}`
}

export const getStageDosage = (
  fertilizer: FertilizerItem,
  stageId: PlantStageId,
  growMethodId?: FertilizerItem['growMethodId'],
  component?: FertilizerComponent,
) =>
  (growMethodId && growMethodId !== 'any' ? component?.methodStageDosages?.[growMethodId] : undefined)
    ?.find((dosage) => dosage.stageId === stageId)
    ?? component?.stageDosages.find((dosage) => dosage.stageId === stageId)
    ?? (growMethodId && growMethodId !== 'any' ? fertilizer.methodStageDosages?.[growMethodId] : undefined)
      ?.find((dosage) => dosage.stageId === stageId)
    ?? fertilizer.stageDosages.find((dosage) => dosage.stageId === stageId)

export const formatBaseComponentCount = (fertilizer?: FertilizerItem) => {
  if (!fertilizer) return '—'
  if (!fertilizer.components?.length) return '1x'
  const usageGroups = fertilizer.components.reduce<Map<string, number>>((groups, component) => {
    const stageSignature = PLANT_STAGES.map((stage) => {
      const dosage = getStageDosage(fertilizer, stage.id, fertilizer.growMethodId, component)
      return dosage?.amountMlPerLiter !== null && dosage?.amountMlPerLiter !== undefined ? '1' : '0'
    }).join('')
    groups.set(stageSignature, (groups.get(stageSignature) ?? 0) + 1)
    return groups
  }, new Map())
  return [...usageGroups.values()].map((count) => `${count}x`).join('+')
}

export const getStageAmount = (
  fertilizer: FertilizerItem,
  stageId: PlantStageId,
  growMethodId?: FertilizerItem['growMethodId'],
  component?: FertilizerComponent,
) => getStageDosage(fertilizer, stageId, growMethodId, component)?.amountMlPerLiter ?? null

export const formatStageDosage = (fertilizer: FertilizerItem, stageId: PlantStageId) => {
  const dosage = getStageDosage(fertilizer, stageId)
  if (!dosage || dosage.amountMlPerLiter === null) return '—'
  return formatDosagePerLiter(dosage.amountMlPerLiter, dosage.amountLabel)
}

export const formatRecipeDosage = (
  fertilizer: FertilizerItem,
  stageId: PlantStageId,
  growMethodId?: FertilizerItem['growMethodId'],
  component?: FertilizerComponent,
) => {
  const dosage = getStageDosage(fertilizer, stageId, growMethodId, component)
  if (!dosage || dosage.amountMlPerLiter === null) return '—'
  return formatDosagePerLiter(dosage.amountMlPerLiter, dosage.amountLabel)
}

export const formatRecipeFoliarDose = (dose?: string) =>
  dose ? dose.replace(/\s*капли\s*/i, ' ').replace(/\s*\/\s*/g, ' /').trim() : '—'

export const localizeDosageText = (value: string, language: 'ru' | 'en') => {
  if (language === 'ru') return value
  return value
    .replace(/мл\/л/giu, 'mL/L')
    .replace(/г\/л/giu, 'g/L')
    .replace(/мл/giu, 'mL')
    .replace(/(?:ст\.\s*)?ложки/giu, 'tbsp')
    .replace(/капли?/giu, 'drops')
    .replace(/субстрата/giu, 'of substrate')
    .replace(/раствора/giu, 'of solution')
    .replace(/при смене раствора/giu, 'per solution change')
    .replace(/\bл\b/giu, 'L')
}

export const formatRecipePerLiterValue = (value: string, language: 'ru' | 'en') =>
  localizeDosageText(value, language)
    .replace(/\s*мл\/л/giu, '')
    .replace(/\s*г\/л/giu, '')
    .replace(/\s*mL\/L/giu, '')
    .replace(/\s*g\/L/giu, '')

export const formatRecipeTotalValue = (value: string, language: 'ru' | 'en') =>
  localizeDosageText(value, language).replace(/\s*мл/giu, '').replace(/\s*mL/giu, '')

export const formatStageDosageTotal = (
  fertilizer: FertilizerItem,
  stageId: PlantStageId,
  waterVolumeLiters: number,
  growMethodId?: FertilizerItem['growMethodId'],
  component?: FertilizerComponent,
) => {
  const dosage = getStageDosage(fertilizer, stageId, growMethodId, component)
  if (!dosage || dosage.amountMlPerLiter === null) return '—'
  const unit = getDosageUnit(dosage.amountLabel)
  const values = getDosageRangeValues(dosage.amountLabel)
  if (values) {
    return `${formatDosageNumber(values[0] * waterVolumeLiters)}-${formatDosageNumber(values[1] * waterVolumeLiters)} ${unit}`
  }
  return unit === 'мл'
    ? formatMlValue(dosage.amountMlPerLiter * waterVolumeLiters)
    : `${formatDosageNumber(dosage.amountMlPerLiter * waterVolumeLiters)} ${unit}`
}

export const getRecipeRowName = (row: RecipeRow) => row.component?.name ?? row.fertilizer.name

export const groupRecipeRowsByManufacturer = (rows: RecipeRow[]) => {
  const groups = new Map<string, RecipeRow[]>()
  rows.forEach((row) => {
    const manufacturer = row.fertilizer.manufacturer || 'Без производителя'
    groups.set(manufacturer, [...(groups.get(manufacturer) ?? []), row])
  })
  return Array.from(groups, ([manufacturer, items]) => ({ manufacturer, items }))
}
