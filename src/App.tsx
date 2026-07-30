import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent, type UIEvent as ReactUIEvent } from 'react'
import { createPortal } from 'react-dom'
import AppShell from './components/AppShell'
import AppSettings from './components/AppSettings'
import ControlCard from './components/ControlCard'
import ControlsGrid from './components/ControlsGrid'
import InstallHint from './components/InstallHint'
import ScheduleTable from './components/ScheduleTable'
import SliderInput from './components/SliderInput'
import Summary from './components/Summary'
import { FERTILIZER_CATEGORIES, FERTILIZER_LIBRARY, GROW_METHODS, PLANT_STAGES } from './data/fertilizerLibrary'
import { usePersistentFertilizers } from './hooks/usePersistentFertilizers'
import { PARAM_LIMITS, usePersistentParams } from './hooks/usePersistentParams'
import { useModalAccessibility } from './hooks/useModalAccessibility'
import type { FertilizerCategoryId, FertilizerComponent, FertilizerItem, PlantStage, PlantStageId } from './types'
import {
  calcSchedule,
  calcVolumes,
  EDGE_OFFSET_MIN,
  minutesToTimeString,
  timeStringToMinutes,
} from './utils/calculations'
import { downloadCalendarFile } from './utils/reminders'
import mixmetryMark from './assets/mixmetry-mark.svg'
import { useAppPreferences } from './contexts/AppPreferencesContext'
import './App.css'

type PageId = 'calculator' | 'recipe' | 'fertilizers'
const PAGE_ORDER: PageId[] = ['calculator', 'fertilizers', 'recipe']
const SWIPE_THRESHOLD = 48
const SWIPE_FLICK_THRESHOLD = 28
const SWIPE_FLICK_DURATION = 300
const MOBILE_SWIPE_QUERY = '(max-width: 639px)'
const MOBILE_HEADER_TRAVEL = 56
const SWIPE_BLOCK_SELECTOR = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  '[role="slider"]',
  '[role="dialog"]',
  '.fertilizer-tools-overlay',
  '.app-settings-overlay',
  '[data-horizontal-scroll]',
].join(',')
type BaseLineReplacement = {
  preset: FertilizerItem
  currentName: string
  currentCount: number
}
type RecipeRow = {
  fertilizer: FertilizerItem
  component?: FertilizerComponent
  amountMlPerLiter: number
  amountTotal: number
}
type PersistentParams = ReturnType<typeof usePersistentParams>
type PersistentFertilizers = ReturnType<typeof usePersistentFertilizers>

const STAGE_EN: Record<PlantStageId, { title: string; description: string }> = {
  seedling: { title: 'Germination and rooting', description: 'First roots and the first pair of true leaves' },
  earlyVeg: { title: 'Vegetative growth', description: 'Early active vegetative growth' },
  veg: { title: 'Pre-flowering', description: 'Late vegetative growth and the first signs of flowering' },
  preFlower: { title: 'Early flowering', description: 'Reduced vertical growth and flower development' },
  earlyBloom: { title: 'Flower development', description: 'Flower bulking and reduced vertical growth' },
  midBloom: { title: 'Ripening', description: 'Final flower ripening' },
  lateBloom: { title: 'Flushing', description: 'Preparing the plant for harvest' },
}

const METHOD_EN: Record<string, string> = {
  hydro: 'Hydroponics',
  coco: 'Coco',
  soil: 'Soil',
  any: 'All growing media',
}

const getCategoryCopy = (categoryId: FertilizerCategoryId, language: 'ru' | 'en') => {
  if (language === 'ru') return FERTILIZER_CATEGORIES.find((category) => category.id === categoryId)
  return categoryId === 'base'
    ? { id: categoryId, title: 'Base nutrients', description: 'Primary nutrients for the growing cycle' }
    : { id: categoryId, title: 'Supplements and stimulants', description: 'Boosters, stimulants and supporting additives' }
}

const getFertilizerCopy = (item: FertilizerItem, language: 'ru' | 'en') => {
  if (language === 'ru') {
    return { shortDescription: item.shortDescription, description: item.description, details: item.details }
  }

  const method = METHOD_EN[item.growMethodId] ?? 'the selected growing medium'
  const category = item.categoryId === 'base' ? 'base nutrient' : 'plant supplement'
  const application = item.application === 'foliar' ? 'foliar application' : 'the nutrient solution'
  return {
    shortDescription: `${category === 'base nutrient' ? 'Base nutrition' : 'Plant supplement'} for ${method.toLowerCase()}`,
    description: `${item.name} by ${item.manufacturer} is a ${category} intended for ${method.toLowerCase()}. Use the stage dosage table below as a reference and confirm the current instructions on the product label before mixing.`,
    details: [
      `Growing method: ${method}`,
      `Application: ${application}`,
      item.components?.length
        ? `Components: ${item.components.map((component) => component.name).join(' and ')}`
        : 'Dosage: shown for each growth stage',
      `Dosage source: ${item.manufacturer} product or application chart`,
    ],
  }
}

const PageIcon = ({ page }: { page: PageId }) => {
  if (page === 'calculator') {
    return (
      <svg className="page-tabs__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.2c-2.5 3.2-6.2 7.1-6.2 11a6.2 6.2 0 0 0 12.4 0c0-3.9-3.7-7.8-6.2-11Z" />
        <path d="M9.1 15.1a3.1 3.1 0 0 0 3.1 2.3" />
      </svg>
    )
  }

  if (page === 'fertilizers') {
    return (
      <svg className="page-tabs__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.2 4.2h9.6v3.1l1.8 2.4v8.1a2 2 0 0 1-2 2H7.4a2 2 0 0 1-2-2V9.7l1.8-2.4V4.2Z" />
        <path d="M7.2 7.3h9.6M8.8 13.5h6.4M12 10.3v6.4" />
      </svg>
    )
  }

  return (
    <svg className="page-tabs__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3.5h6M10 3.5v5.2l-4.2 8.1a2.5 2.5 0 0 0 2.2 3.7h8a2.5 2.5 0 0 0 2.2-3.7L14 8.7V3.5" />
      <path d="M8.2 15h7.6" />
    </svg>
  )
}

type PageNavigationProps = {
  activePage: PageId
  className?: string
  labels: {
    sections: string
    calculator: string
    fertilizers: string
    fertilizersShort: string
    recipe: string
    recipeShort: string
  }
  onSelect: (page: PageId) => void
}

const PageNavigation = ({ activePage, className = '', labels, onSelect }: PageNavigationProps) => (
  <nav className={`page-tabs ${className}`.trim()} aria-label={labels.sections}>
    <button
      className={`page-tabs__button page-tabs__button--calculator ${activePage === 'calculator' ? 'page-tabs__button--active' : ''}`}
      type="button"
      aria-label={labels.calculator}
      aria-current={activePage === 'calculator' ? 'page' : undefined}
      onClick={() => onSelect('calculator')}
    >
      <PageIcon page="calculator" />
      <span className="page-tabs__label page-tabs__label--desktop">{labels.calculator}</span>
      <span className="page-tabs__label page-tabs__label--mobile">{labels.calculator}</span>
    </button>
    <button
      className={`page-tabs__button page-tabs__button--fertilizers ${activePage === 'fertilizers' ? 'page-tabs__button--active' : ''}`}
      type="button"
      aria-label={labels.fertilizers}
      aria-current={activePage === 'fertilizers' ? 'page' : undefined}
      onClick={() => onSelect('fertilizers')}
    >
      <PageIcon page="fertilizers" />
      <span className="page-tabs__label page-tabs__label--desktop">{labels.fertilizers}</span>
      <span className="page-tabs__label page-tabs__label--mobile">{labels.fertilizersShort}</span>
    </button>
    <button
      className={`page-tabs__button page-tabs__button--recipe ${activePage === 'recipe' ? 'page-tabs__button--active' : ''}`}
      type="button"
      aria-label={labels.recipe}
      aria-current={activePage === 'recipe' ? 'page' : undefined}
      onClick={() => onSelect('recipe')}
    >
      <PageIcon page="recipe" />
      <span className="page-tabs__label page-tabs__label--desktop">{labels.recipe}</span>
      <span className="page-tabs__label page-tabs__label--mobile">{labels.recipeShort}</span>
    </button>
  </nav>
)

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

const formatFertilizerBadge = (name: string) => {
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

const formatBaseComponentCount = (fertilizer?: FertilizerItem) => {
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

const getStageDosage = (
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

const getStageAmount = (
  fertilizer: FertilizerItem,
  stageId: PlantStageId,
  growMethodId?: FertilizerItem['growMethodId'],
  component?: FertilizerComponent,
) =>
  getStageDosage(fertilizer, stageId, growMethodId, component)?.amountMlPerLiter ?? null

const formatStageDosage = (fertilizer: FertilizerItem, stageId: PlantStageId) => {
  const dosage = getStageDosage(fertilizer, stageId)
  if (!dosage || dosage.amountMlPerLiter === null) return '—'
  return formatDosagePerLiter(dosage.amountMlPerLiter, dosage.amountLabel)
}

const formatRecipeDosage = (
  fertilizer: FertilizerItem,
  stageId: PlantStageId,
  growMethodId?: FertilizerItem['growMethodId'],
  component?: FertilizerComponent,
) => {
  const dosage = getStageDosage(fertilizer, stageId, growMethodId, component)
  if (!dosage || dosage.amountMlPerLiter === null) return '—'
  return formatDosagePerLiter(dosage.amountMlPerLiter, dosage.amountLabel)
}

const formatRecipeFoliarDose = (dose?: string) =>
  dose
    ? dose
        .replace(/\s*капли\s*/i, ' ')
        .replace(/\s*\/\s*/g, ' /')
        .trim()
    : '—'

const localizeDosageText = (value: string, language: 'ru' | 'en') => {
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

const formatRecipePerLiterValue = (value: string, language: 'ru' | 'en') =>
  localizeDosageText(value, language)
    .replace(/\s*мл\/л/giu, '')
    .replace(/\s*г\/л/giu, '')
    .replace(/\s*mL\/L/giu, '')
    .replace(/\s*g\/L/giu, '')

const formatRecipeTotalValue = (value: string, language: 'ru' | 'en') =>
  localizeDosageText(value, language)
    .replace(/\s*мл/giu, '')
    .replace(/\s*mL/giu, '')

const formatStageDosageTotal = (
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

const getRecipeRowName = (row: RecipeRow) =>
  row.component?.name ?? row.fertilizer.name

const getStageDisplay = (stage: PlantStage, fertilizer?: FertilizerItem | null, language: 'ru' | 'en' = 'ru') => {
  const label = fertilizer?.stageLabels?.[stage.id]

  if (language === 'en') {
    return {
      ...STAGE_EN[stage.id],
      manufacturerTitle: undefined,
      manufacturerDescription: undefined,
    }
  }

  return {
    title: stage.title,
    description: stage.description,
    manufacturerTitle: label?.title,
    manufacturerDescription: label?.description,
  }
}

const groupRecipeRowsByManufacturer = (rows: RecipeRow[]) => {
  const groups = new Map<string, RecipeRow[]>()

  rows.forEach((row) => {
    const manufacturer = row.fertilizer.manufacturer || 'Без производителя'
    groups.set(manufacturer, [...(groups.get(manufacturer) ?? []), row])
  })

  return Array.from(groups, ([manufacturer, items]) => ({ manufacturer, items }))
}

const groupFertilizersByManufacturer = (items: FertilizerItem[]) => {
  const groups = new Map<string, FertilizerItem[]>()

  items.forEach((item) => {
    const manufacturer = item.manufacturer || 'Без производителя'
    groups.set(manufacturer, [...(groups.get(manufacturer) ?? []), item])
  })

  return Array.from(groups, ([manufacturer, groupItems]) => ({ manufacturer, items: groupItems }))
}

function CalculatorPage({ params, updateParam }: PersistentParams) {
  const { language } = useAppPreferences()
  const l = (ru: string, en: string) => language === 'ru' ? ru : en
  const volumes = useMemo(() => calcVolumes(params), [params])
  const schedule = useMemo(() => calcSchedule(params, volumes), [params, volumes])
  const maxWateringsPerDay = params.unlimitedWaterings ? PARAM_LIMITS.wateringsPerDay.max : 4
  
  // Используем volumes.dailyTotal если включены компенсированные капельницы, иначе dailyConsumptionLiters
  const dailyConsumption = params.showCompensatedDripsCard 
    ? volumes.dailyTotal 
    : params.dailyConsumptionLiters
  
  const daysUntilRefill = dailyConsumption > 0 ? params.tankVolumeLiters / dailyConsumption : 0
  const daysUntilRefillRounded = Math.max(0, Math.round(daysUntilRefill))
  const nextRefillDate = new Date()
  nextRefillDate.setDate(nextRefillDate.getDate() + daysUntilRefillRounded)
  const nextRefillDateLabel = nextRefillDate.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
  })
  const daysWord = language === 'en'
    ? (daysUntilRefillRounded === 1 ? 'day' : 'days')
    :
    daysUntilRefillRounded % 10 === 1 && daysUntilRefillRounded % 100 !== 11
      ? 'день'
      : daysUntilRefillRounded % 10 >= 2 &&
          daysUntilRefillRounded % 10 <= 4 &&
          (daysUntilRefillRounded % 100 < 12 || daysUntilRefillRounded % 100 > 14)
        ? 'дня'
        : 'дней'

  const handleUnlimitedToggle = (checked: boolean) => {
    updateParam('unlimitedWaterings', checked)
    if (!checked && params.wateringsPerDay > 4) {
      updateParam('wateringsPerDay', 4)
    }
  }

  const handleCreateReminder = () => {
    const reminderTitle = l(`Наполнить бак (${params.tankVolumeLiters} л)`, `Refill tank (${params.tankVolumeLiters} L)`)
    const reminderDescription = l('Следующее наполнение бака автополива', 'Next irrigation tank refill')
    downloadCalendarFile(reminderTitle, nextRefillDate, reminderDescription)
  }

  return (
    <>
      <InstallHint />
        {params.showCompensatedDripsCard ? (
          <Summary entries={schedule.entries} />
        ) : null}

        <ControlsGrid>
          <ControlCard
            className="control-card--mode"
            title={l('Световой режим растений', 'Plant light cycle')}
            description={l('Часы света и время включения', 'Light hours and start time')}
          >
            <SliderInput
              showHeader={false}
              displayValue={`${params.lightHours}/${24 - params.lightHours}`}
              value={params.lightHours}
              min={PARAM_LIMITS.lightHours.min}
              max={PARAM_LIMITS.lightHours.max}
              step={1}
              onChange={(v) => updateParam('lightHours', v)}
              helper={l(`Свет: ${params.lightHours} ч · Тьма: ${24 - params.lightHours} ч`, `Light: ${params.lightHours} h · Dark: ${24 - params.lightHours} h`)}
            />
            <SliderInput
              showHeader={false}
              value={timeStringToMinutes(params.lampOnTime)}
              min={0}
              max={23 * 60 + 45}
              step={15}
              displayValue={params.lampOnTime}
              helper={l('Время включения света', 'Lights on time')}
              onChange={(v) => updateParam('lampOnTime', minutesToTimeString(v))}
            />
          </ControlCard>

          <ControlCard
            className="control-card--waterings"
            title={l('Частота и количество поливов', 'Watering frequency')}
            description={l('Количество включений и длительность', 'Number and duration of cycles')}
          >
            <SliderInput
              showHeader={false}
              value={params.durationMinutes}
              min={PARAM_LIMITS.durationMinutes.min}
              max={PARAM_LIMITS.durationMinutes.max}
              step={1}
              suffix={l('мин', 'min')}
              helper={l('Минуты за раз', 'Minutes per cycle')}
              onChange={(v) => updateParam('durationMinutes', v)}
            />
            <SliderInput
              showHeader={false}
              value={params.wateringsPerDay}
              min={PARAM_LIMITS.wateringsPerDay.min}
              max={maxWateringsPerDay}
              step={1}
              helper={l('Количество включений', 'Number of cycles')}
              onChange={(v) => updateParam('wateringsPerDay', v)}
            />
          </ControlCard>

          <ControlCard
            title={l('Опции', 'Options')}
            description={l('Дополнительные параметры', 'Additional parameters')}
          >
            <label className="toggle-row toggle-row--switch" htmlFor="correctWatering">
              <input
                id="correctWatering"
                type="checkbox"
                className="toggle-switch"
                checked={params.correctWatering}
                onChange={(e) => updateParam('correctWatering', e.target.checked)}
              />
              <span className="toggle-switch__slider" aria-hidden="true" />
              <div className="toggle-row__text">
                <div className="toggle-row__title">{l('Правильный полив', 'Light-window watering')}</div>
                <p className="toggle-row__desc">
                  {l(`Только в световом окне, без первых и последних ${EDGE_OFFSET_MIN} мин.`, `Only during the light window, excluding the first and last ${EDGE_OFFSET_MIN} min.`)}
                </p>
              </div>
            </label>
            <label className="toggle-row toggle-row--switch" htmlFor="unlimitedWaterings">
              <input
                id="unlimitedWaterings"
                type="checkbox"
                className="toggle-switch"
                checked={params.unlimitedWaterings}
                onChange={(e) => handleUnlimitedToggle(e.target.checked)}
              />
              <span className="toggle-switch__slider" aria-hidden="true" />
              <div className="toggle-row__text">
                <div className="toggle-row__title">{l('Без ограничений', 'No cycle limit')}</div>
                <p className="toggle-row__desc">{l('До 100 поливов в сутки, специфичное применение', 'Up to 100 cycles per day for special setups')}</p>
              </div>
            </label>
            <label className="toggle-row toggle-row--switch" htmlFor="showCompensatedDripsCard">
              <input
                id="showCompensatedDripsCard"
                type="checkbox"
                className="toggle-switch"
                checked={params.showCompensatedDripsCard}
                onChange={(e) => updateParam('showCompensatedDripsCard', e.target.checked)}
              />
              <span className="toggle-switch__slider" aria-hidden="true" />
              <div className="toggle-row__text">
                <div className="toggle-row__title">{l('Компенсированные капельницы', 'Pressure-compensating drippers')}</div>
                <p className="toggle-row__desc">
                  {l('Позволяет рассчитать расход при использовании таких капельниц', 'Calculates flow for pressure-compensating drippers')}
                </p>
              </div>
            </label>
            <label className="toggle-row toggle-row--switch" htmlFor="showTankCard">
              <input
                id="showTankCard"
                type="checkbox"
                className="toggle-switch"
                checked={params.showTankCard}
                onChange={(e) => updateParam('showTankCard', e.target.checked)}
              />
              <span className="toggle-switch__slider" aria-hidden="true" />
              <div className="toggle-row__text">
                <div className="toggle-row__title">{l('Рассчитать расход', 'Track tank supply')}</div>
                <p className="toggle-row__desc">{l('Позволяет рассчитать день следующего наполнения бака.', 'Estimates the next tank refill date.')}</p>
              </div>
            </label>
          </ControlCard>

          {params.showCompensatedDripsCard ? (
            <ControlCard
              className="control-card--drips"
              bentoSpan="desktop-full"
              title={l('Компенсированные капельницы', 'Pressure-compensating drippers')}
              description={l('Параметры системы', 'System parameters')}
            >
              <SliderInput
                showHeader={false}
                displayValue={l(`${params.dripRateLph.toFixed(1)} л/ч`, `${params.dripRateLph.toFixed(1)} L/h`)}
                value={params.dripRateLph}
                min={PARAM_LIMITS.dripRateLph.min}
                max={PARAM_LIMITS.dripRateLph.max}
                step={0.1}
                helper={l('Расход одной капельницы', 'Flow per dripper')}
                onChange={(v) => updateParam('dripRateLph', Number(v.toFixed(1)))}
              />
              <SliderInput
                showHeader={false}
                value={params.dripCount}
                min={PARAM_LIMITS.dripCount.min}
                max={PARAM_LIMITS.dripCount.max}
                step={1}
                suffix="x"
                helper={l('Количество капельниц на растение', 'Drippers per plant')}
                onChange={(v) => updateParam('dripCount', v)}
              />
              <SliderInput
                showHeader={false}
                value={params.plantCount}
                min={PARAM_LIMITS.plantCount.min}
                max={PARAM_LIMITS.plantCount.max}
                step={1}
                suffix="x"
                helper={l('Количество растений в системе', 'Plants in the system')}
                onChange={(v) => updateParam('plantCount', v)}
              />
            </ControlCard>
          ) : null}

          {params.showTankCard ? (
            <ControlCard
              className="control-card--tank"
              bentoSpan="desktop-full"
              title={l('Объём бака', 'Tank volume')}
              description={l('Расчёт до следующего наполнения', 'Estimate until the next refill')}
              bodyClassName="control-card--tank__body"
            >
              <SliderInput
                showHeader={false}
                value={params.dailyConsumptionLiters}
                min={PARAM_LIMITS.dailyConsumptionLiters.min}
                max={PARAM_LIMITS.dailyConsumptionLiters.max}
                step={0.1}
                suffix={l('л', 'L')}
                helper={l('Расход литров в день', 'Daily water use')}
                onChange={(v) => updateParam('dailyConsumptionLiters', v)}
                disabled={params.showCompensatedDripsCard}
              />
              <SliderInput
                showHeader={false}
                value={params.tankVolumeLiters}
                min={PARAM_LIMITS.tankVolumeLiters.min}
                max={PARAM_LIMITS.tankVolumeLiters.max}
                step={1}
                suffix={l('л', 'L')}
                helper={l('Объём воды', 'Water volume')}
                onChange={(v) => updateParam('tankVolumeLiters', v)}
              />
              <div className="tank-result" aria-live="polite">
                <strong className="tank-result__value">
                  {daysUntilRefillRounded} {daysWord}
                </strong>
                <span className="tank-result__date">{l('Запас до', 'Supply until')} ≈ {nextRefillDateLabel}</span>
                <button
                  className="reminder-button"
                  onClick={handleCreateReminder}
                  title={l('Создать напоминание', 'Create reminder')}
                  aria-label={l('Создать напоминание о наполнении бака', 'Create a tank refill reminder')}
                >
                  <span className="reminder-button__text">{l('Напомнить', 'Remind me')}</span>
                </button>
              </div>
            </ControlCard>
          ) : null}

        </ControlsGrid>

        <ScheduleTable
          entries={schedule.entries}
          volumes={volumes}
          params={params}
          windowStart={schedule.windowStart}
          windowEnd={schedule.windowEnd}
          dailyConsumptionLiters={params.dailyConsumptionLiters}
        />
    </>
  )
}

function FertilizersPage({ fertilizerState }: { fertilizerState: PersistentFertilizers }) {
  const { language } = useAppPreferences()
  const l = (ru: string, en: string) => language === 'ru' ? ru : en
  const [selectedFertilizerId, setSelectedFertilizerId] = useState<string | null>(null)
  const [selectedLibraryPresetId, setSelectedLibraryPresetId] = useState<string | null>(null)
  const [addFlowCategoryId, setAddFlowCategoryId] = useState<FertilizerCategoryId | null>(null)
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null)
  const [baseLineReplacement, setBaseLineReplacement] = useState<BaseLineReplacement | null>(null)
  const [isBaseDeleteConfirmOpen, setIsBaseDeleteConfirmOpen] = useState(false)
  const {
    fertilizers,
    fertilizerIds,
    addFromLibrary,
    deleteFertilizer,
  } = fertilizerState

  const selectedFertilizer = fertilizers.find((item) => item.id === selectedFertilizerId)
  const selectedLibraryPreset = FERTILIZER_LIBRARY.find((item) => item.id === selectedLibraryPresetId)
  const categoryLibraryItems = FERTILIZER_LIBRARY.filter(
    (item) => !addFlowCategoryId || item.categoryId === addFlowCategoryId,
  )
  const manufacturerOptions = Array.from(new Set(categoryLibraryItems.map((item) => item.manufacturer))).sort((a, b) =>
    a.localeCompare(b, 'ru'),
  )
  const selectedManufacturerItems = selectedManufacturer
    ? categoryLibraryItems.filter((item) => item.manufacturer === selectedManufacturer)
    : []
  const baseFertilizers = fertilizers.filter((item) => item.categoryId === 'base')
  const additiveFertilizers = fertilizers.filter((item) => item.categoryId === 'boosters')
  const manufacturerCount = new Set(fertilizers.map((item) => item.manufacturer)).size
  const currentBaseName = baseFertilizers[0]
    ? `${baseFertilizers[0].manufacturer} · ${baseFertilizers[0].name}`
    : null

  const openAddFlow = (categoryId: FertilizerCategoryId) => {
    setAddFlowCategoryId(categoryId)
    setSelectedManufacturer(null)
    setSelectedLibraryPresetId(null)
    setBaseLineReplacement(null)
  }

  const closeAddFlow = () => {
    setAddFlowCategoryId(null)
    setSelectedManufacturer(null)
    setSelectedLibraryPresetId(null)
    setBaseLineReplacement(null)
  }

  const handleLibraryAdd = (preset: (typeof FERTILIZER_LIBRARY)[number]) => {
    if (
      preset.categoryId === 'base'
      && currentBaseName
      && !fertilizerIds.has(preset.id)
    ) {
      setBaseLineReplacement({
        preset,
        currentName: currentBaseName,
        currentCount: baseFertilizers.length,
      })
      return
    }

    addFromLibrary(preset)
    closeAddFlow()
  }

  const handleLibraryQuickToggle = (preset: (typeof FERTILIZER_LIBRARY)[number]) => {
    if (preset.categoryId !== 'boosters') {
      handleLibraryAdd(preset)
      return
    }

    if (fertilizerIds.has(preset.id)) {
      deleteFertilizer(preset.id)
    } else {
      addFromLibrary(preset)
    }
  }

  const confirmBaseLineReplacement = () => {
    if (!baseLineReplacement) return

    addFromLibrary(baseLineReplacement.preset, { replaceBaseLine: true })
    closeAddFlow()
  }

  const handleDelete = (id: string) => {
    deleteFertilizer(id)
    setIsBaseDeleteConfirmOpen(false)
    if (selectedFertilizerId === id) {
      setSelectedFertilizerId(null)
    }
  }

  const closeFertilizerDetails = () => {
    setSelectedFertilizerId(null)
    setIsBaseDeleteConfirmOpen(false)
  }

  const closeLibraryDetails = () => {
    setSelectedLibraryPresetId(null)
  }

  const closeActiveFertilizerModal = () => {
    if (baseLineReplacement) {
      setBaseLineReplacement(null)
    } else if (selectedLibraryPresetId) {
      closeLibraryDetails()
    } else if (selectedFertilizerId) {
      closeFertilizerDetails()
    } else if (addFlowCategoryId) {
      closeAddFlow()
    }
  }

  useModalAccessibility(
    baseLineReplacement
      ? 'base-warning'
      : selectedLibraryPresetId
      ? `library-${selectedLibraryPresetId}`
      : selectedFertilizerId
      ? `fertilizer-${selectedFertilizerId}`
      : addFlowCategoryId
      ? `add-${addFlowCategoryId}`
      : null,
    '.fertilizers-page [role="dialog"], .fertilizers-page [role="alertdialog"]',
    closeActiveFertilizerModal,
  )

  const getDosageLabel = (
    item: FertilizerItem,
    stageId: (typeof PLANT_STAGES)[number]['id'],
  ) => localizeDosageText(formatStageDosage(item, stageId), language)

  const renderDosageLabel = (item: FertilizerItem, stageId: (typeof PLANT_STAGES)[number]['id']) => {
    if (!item.components?.length) return <strong>{getDosageLabel(item, stageId)}</strong>

    return (
      <div className="fertilizer-dosage-table__components">
        {item.components.map((component) => (
          <span className="fertilizer-dosage-table__component" key={component.id}>
            <small>{component.name}</small>
            <strong>{localizeDosageText(formatRecipeDosage(item, stageId, item.growMethodId, component), language)}</strong>
          </span>
        ))}
      </div>
    )
  }

  const getSourceLabel = () => l('Из базы', 'From library')
  const renderFertilizerCard = (item: FertilizerItem, showBaseActions = false) => {
    const badge = formatFertilizerBadge(item.name)
    const copy = getFertilizerCopy(item, language)

    return (
      <article
        className={`fertilizer-card${showBaseActions ? ' fertilizer-card--base' : ''}`}
        key={item.id}
      >
        <div className="fertilizer-card__media" aria-hidden="true">
          <span className={badge.length > 4 ? 'fertilizer-card__badge-text--dense' : undefined}>
            {badge}
          </span>
        </div>
        <div className="fertilizer-card__body">
          <div className="fertilizer-card__topline">
            <button
              className="fertilizer-card__main"
              type="button"
              aria-haspopup="dialog"
              onClick={() => setSelectedFertilizerId(item.id)}
            >
              <span className="fertilizer-card__name">
                {showBaseActions ? (
                  <span className="fertilizer-card__manufacturer">{item.manufacturer}</span>
                ) : null}
                <h3 className="fertilizer-card__title">{item.name}</h3>
                {showBaseActions ? (
                  <span className="fertilizer-card__base-description">{copy.shortDescription}</span>
                ) : null}
              </span>
            </button>
          </div>
          {!showBaseActions ? <p className="fertilizer-card__meta">{copy.shortDescription}</p> : null}
        </div>
        {showBaseActions ? (
          <span className="fertilizer-card__chevron" aria-hidden="true">›</span>
        ) : null}
      </article>
    )
  }

  return (
    <section
      className="fertilizers-page"
      aria-label={l('Удобрения', 'Nutrients')}
    >
      {addFlowCategoryId ? createPortal(
        <div className="fertilizer-tools-overlay" role="presentation" onClick={closeAddFlow}>
          <section
            className="fertilizer-tools"
            role="dialog"
            aria-modal="true"
            aria-label={l('Добавление удобрений', 'Add nutrients')}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fertilizer-tools__bar">
              <div>
                <p className="fertilizer-tools__eyebrow">{l('Добавление', 'Add')}</p>
                <h2>{addFlowCategoryId ? getCategoryCopy(addFlowCategoryId, language)?.title : l('Удобрение', 'Nutrient')}</h2>
              </div>
              <button className="fertilizer-tools__close" type="button" onClick={closeAddFlow} aria-label={l('Закрыть', 'Close')}>
                ×
              </button>
            </div>

            <section className="fertilizer-library" aria-labelledby="fertilizer-library-title">
                <div className="fertilizer-form__header">
                  <h2 id="fertilizer-library-title">
                    {selectedManufacturer ?? l('Список производителей', 'Manufacturers')}
                  </h2>
                  <p>
                    {selectedManufacturer
                      ? l('Выберите удобрение этого производителя.', 'Choose a nutrient from this manufacturer.')
                      : l('Сначала выберите производителя, потом конкретное удобрение.', 'Choose a manufacturer, then select a nutrient.')}
                  </p>
                </div>
                {!selectedManufacturer ? (
                  <div className="fertilizer-library__list">
                    {manufacturerOptions.length > 0 ? (
                      manufacturerOptions.map((manufacturer) => {
                        const manufacturerItemsCount = categoryLibraryItems.filter(
                          (item) => item.manufacturer === manufacturer,
                        ).length

                        return (
                          <button
                            className="fertilizer-library__item"
                            key={manufacturer}
                            type="button"
                            onClick={() => setSelectedManufacturer(manufacturer)}
                          >
                            <span>
                              <strong>{manufacturer}</strong>
                              <small>{manufacturerItemsCount} {l('поз.', 'items')}</small>
                            </span>
                            <span className="fertilizer-library__plus">→</span>
                          </button>
                        )
                      })
                    ) : (
                      <p className="fertilizer-library__empty">{l('Для этой категории все шаблоны уже добавлены.', 'All available items in this category have already been added.')}</p>
                    )}
                  </div>
                ) : (
                  <div className="fertilizer-library__list">
                    {selectedManufacturerItems.length > 0 ? (
                      selectedManufacturerItems.map((preset) => {
                        const isAdded = fertilizerIds.has(preset.id)

                        return (
                          <article
                            className={`fertilizer-library__card ${isAdded ? 'fertilizer-library__card--added' : ''}`}
                            key={preset.id}
                          >
                            <button
                              className="fertilizer-library__preview"
                              type="button"
                              aria-haspopup="dialog"
                              onClick={() => setSelectedLibraryPresetId(preset.id)}
                            >
                              <span>
                                <strong>{preset.name}</strong>
                                <small>{preset.manufacturer} · {getFertilizerCopy(preset, language).shortDescription}</small>
                              </span>
                            </button>
                            <button
                              className={`fertilizer-library__plus ${isAdded ? 'fertilizer-library__plus--added' : ''}`}
                              type="button"
                              aria-label={isAdded
                                ? preset.categoryId === 'boosters'
                                  ? l(`Убрать ${preset.name}`, `Remove ${preset.name}`)
                                  : l(`${preset.name} уже добавлено`, `${preset.name} already added`)
                                : l(`Добавить ${preset.name}`, `Add ${preset.name}`)}
                              aria-pressed={isAdded}
                              disabled={isAdded && preset.categoryId === 'base'}
                              onClick={(event) => {
                                event.stopPropagation()
                                handleLibraryQuickToggle(preset)
                              }}
                            >
                              {isAdded ? '✓' : '+'}
                            </button>
                          </article>
                        )
                      })
                    ) : (
                      <p className="fertilizer-library__empty">{l('У этого производителя все шаблоны уже добавлены.', 'All available items from this manufacturer have already been added.')}</p>
                    )}
                  </div>
                )}
                <button
                  className="fertilizer-flow-actions__secondary"
                  type="button"
                  onClick={() => {
                    if (selectedManufacturer) {
                      setSelectedManufacturer(null)
                    } else {
                      closeAddFlow()
                    }
                  }}
                >
                  {l('Назад', 'Back')}
                </button>
            </section>
          </section>
        </div>,
        document.body,
      ) : null}

      {baseLineReplacement ? createPortal(
        <div
          className="fertilizer-tools-overlay fertilizer-tools-overlay--stacked fertilizer-tools-overlay--warning"
          role="presentation"
          onClick={() => setBaseLineReplacement(null)}
        >
          <section
            className="fertilizer-line-warning"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="base-line-warning-title"
            aria-describedby="base-line-warning-copy"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fertilizer-tools__bar">
              <div>
                <p className="fertilizer-tools__eyebrow">{l('Предупреждение', 'Warning')}</p>
                <h2 id="base-line-warning-title">{l('Заменить базовую линейку?', 'Replace the base nutrient line?')}</h2>
              </div>
              <button
                className="fertilizer-tools__close"
                type="button"
                onClick={() => setBaseLineReplacement(null)}
                aria-label={l('Закрыть', 'Close')}
              >
                ×
              </button>
            </div>
            <p id="base-line-warning-copy">
              {l(
                `Сейчас выбрана база ${baseLineReplacement.currentName}. Если добавить ${baseLineReplacement.preset.manufacturer} · ${baseLineReplacement.preset.name}, текущая базовая линейка будет удалена${baseLineReplacement.currentCount > 1 ? ` (${baseLineReplacement.currentCount} поз.)` : ''}.`,
                `${baseLineReplacement.currentName} is currently selected. Adding ${baseLineReplacement.preset.manufacturer} · ${baseLineReplacement.preset.name} will remove the current base line${baseLineReplacement.currentCount > 1 ? ` (${baseLineReplacement.currentCount} items)` : ''}.`,
              )}
            </p>
            <div className="fertilizer-line-warning__actions">
              <button
                className="fertilizer-line-warning__cancel"
                type="button"
                onClick={() => setBaseLineReplacement(null)}
              >
                {l('Отмена', 'Cancel')}
              </button>
              <button
                className="fertilizer-line-warning__confirm"
                type="button"
                onClick={confirmBaseLineReplacement}
              >
                {l('Заменить линейку', 'Replace line')}
              </button>
            </div>
          </section>
        </div>,
        document.body,
      ) : null}

      {selectedLibraryPreset ? createPortal(
        <div className="fertilizer-tools-overlay fertilizer-tools-overlay--details fertilizer-tools-overlay--stacked" role="presentation" onClick={closeLibraryDetails}>
          <section
            className="fertilizer-details-modal"
            role="dialog"
            aria-modal="true"
            aria-label={l(`Описание удобрения ${selectedLibraryPreset.name}`, `${selectedLibraryPreset.name} nutrient details`)}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fertilizer-tools__bar">
              <div>
                <p className="fertilizer-tools__eyebrow">{l('Из базы', 'From library')}</p>
                <h2>{selectedLibraryPreset.name}</h2>
                <p className="fertilizer-details-modal__meta">
                  {selectedLibraryPreset.manufacturer}
                </p>
              </div>
              <button
                className="fertilizer-tools__close"
                type="button"
                onClick={closeLibraryDetails}
                aria-label={l('Закрыть', 'Close')}
              >
                ×
              </button>
            </div>

            <div className="fertilizer-card__details">
              <p>{getFertilizerCopy(selectedLibraryPreset, language).description}</p>
              <div className="fertilizer-card__chips" aria-label={l('Поля описания', 'Product details')}>
                {getFertilizerCopy(selectedLibraryPreset, language).details.map((detail) => (
                  <span className="fertilizer-card__chip" key={detail}>
                    {detail}
                  </span>
                ))}
              </div>
              <div className="fertilizer-dosage-table" aria-label={l('Дозировки по этапам', 'Dosage by growth stage')}>
                <div className="fertilizer-dosage-table__row fertilizer-dosage-table__row--head">
                  <span>{l('Этап', 'Stage')}</span>
                  <strong>{l('Дозировка', 'Dosage')}</strong>
                </div>
                {PLANT_STAGES.map((stage) => {
                  const display = getStageDisplay(stage, selectedLibraryPreset, language)

                  return (
                    <div className="fertilizer-dosage-table__row" key={stage.id}>
                      <span className="fertilizer-dosage-table__stage">
                        <span>{display.title}</span>
                        {display.manufacturerTitle ? <small>{display.manufacturerTitle}</small> : null}
                      </span>
                      {renderDosageLabel(selectedLibraryPreset, stage.id)}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="fertilizer-details-actions fertilizer-details-actions--single">
              <button
                className={`fertilizer-details-actions__change ${fertilizerIds.has(selectedLibraryPreset.id) ? 'fertilizer-details-actions__change--added' : ''}`}
                type="button"
                aria-pressed={fertilizerIds.has(selectedLibraryPreset.id)}
                disabled={fertilizerIds.has(selectedLibraryPreset.id)}
                onClick={() => handleLibraryAdd(selectedLibraryPreset)}
              >
                {fertilizerIds.has(selectedLibraryPreset.id) ? l('✓ Добавлено', '✓ Added') : l('Добавить', 'Add')}
              </button>
            </div>
          </section>
        </div>,
        document.body,
      ) : null}

      {selectedFertilizer ? createPortal(
        <div className="fertilizer-tools-overlay fertilizer-tools-overlay--details" role="presentation" onClick={closeFertilizerDetails}>
          <section
            className="fertilizer-details-modal"
            role="dialog"
            aria-modal="true"
            aria-label={l(`Карточка удобрения ${selectedFertilizer.name}`, `${selectedFertilizer.name} nutrient card`)}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fertilizer-tools__bar">
              <div>
                <p className="fertilizer-tools__eyebrow">{l('Удобрение', 'Nutrient')}</p>
                <h2>{selectedFertilizer.name}</h2>
                <p className="fertilizer-details-modal__meta">
                  {selectedFertilizer.manufacturer} · {getSourceLabel()}
                </p>
              </div>
              <button
                className="fertilizer-tools__close"
                type="button"
                onClick={closeFertilizerDetails}
                aria-label={l('Закрыть', 'Close')}
              >
                ×
              </button>
            </div>

            <div className="fertilizer-card__details">
              <p>{getFertilizerCopy(selectedFertilizer, language).description}</p>
              <div className="fertilizer-card__chips" aria-label={l('Поля описания', 'Product details')}>
                {getFertilizerCopy(selectedFertilizer, language).details.map((detail) => (
                  <span className="fertilizer-card__chip" key={detail}>
                    {detail}
                  </span>
                ))}
              </div>
              <div className="fertilizer-dosage-table" aria-label={l('Дозировки по этапам', 'Dosage by growth stage')}>
                <div className="fertilizer-dosage-table__row fertilizer-dosage-table__row--head">
                  <span>{l('Этап', 'Stage')}</span>
                  <strong>{l('Дозировка', 'Dosage')}</strong>
                </div>
                {PLANT_STAGES.map((stage) => {
                  const display = getStageDisplay(stage, selectedFertilizer, language)

                  return (
                    <div className="fertilizer-dosage-table__row" key={stage.id}>
                      <span className="fertilizer-dosage-table__stage">
                        <span>{display.title}</span>
                        {display.manufacturerTitle ? <small>{display.manufacturerTitle}</small> : null}
                      </span>
                      {renderDosageLabel(selectedFertilizer, stage.id)}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className={`fertilizer-details-actions${selectedFertilizer.categoryId !== 'base' ? ' fertilizer-details-actions--single' : ''}`}>
              {selectedFertilizer.categoryId === 'base' ? (
                <button
                  className="fertilizer-details-actions__change"
                  type="button"
                  onClick={() => {
                    closeFertilizerDetails()
                    openAddFlow('base')
                  }}
                >
                  {l('Сменить базу', 'Change base')}
                </button>
              ) : null}
              {!isBaseDeleteConfirmOpen ? (
                <button
                  className="fertilizer-details-actions__more"
                  type="button"
                  onClick={() => setIsBaseDeleteConfirmOpen(true)}
                >
                  {selectedFertilizer.categoryId === 'base' ? l('Удалить', 'Delete') : l('Удалить добавку', 'Delete supplement')}
                </button>
              ) : (
                <div className="fertilizer-details-actions__confirm" role="alert">
                  <span>
                    {selectedFertilizer.categoryId === 'base'
                      ? l('Удалить базу из набора?', 'Remove the base nutrient from the collection?')
                      : l('Удалить добавку из набора?', 'Remove the supplement from the collection?')}
                  </span>
                  <button type="button" onClick={() => setIsBaseDeleteConfirmOpen(false)}>
                    {l('Отмена', 'Cancel')}
                  </button>
                  <button
                    className="fertilizer-details-actions__delete"
                    type="button"
                    onClick={() => handleDelete(selectedFertilizer.id)}
                  >
                    {l('Удалить', 'Delete')}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>,
        document.body,
      ) : null}

      <section className="fertilizer-overview" aria-label={l('Сводка по удобрениям', 'Nutrient overview')}>
        <div className="fertilizer-overview__tile fertilizer-overview__tile--base">
          <span>{l('База', 'Base')}</span>
          <strong>{formatBaseComponentCount(baseFertilizers[0])}</strong>
        </div>
        <div className="fertilizer-overview__tile">
          <span>{l('Добавки', 'Supplements')}</span>
          <strong>{additiveFertilizers.length}x</strong>
        </div>
        <div className="fertilizer-overview__tile">
          <span>{l('Производители', 'Manufacturers')}</span>
          <strong>{manufacturerCount}x</strong>
        </div>
      </section>

      <div className="fertilizer-shelf">
        {FERTILIZER_CATEGORIES.map((category) => {
          const categoryItems = fertilizers.filter((item) => item.categoryId === category.id)
          const categoryGroups = groupFertilizersByManufacturer(categoryItems)
          const categoryCopy = getCategoryCopy(category.id, language) ?? category

          return (
          <section
            className={`fertilizer-category${category.id === 'base' ? ' fertilizer-category--base' : ''}`}
            key={category.id}
          >
            <header className="fertilizer-category__header">
              <div>
                <h2 className="fertilizer-category__title">{categoryCopy.title}</h2>
                <p className="fertilizer-category__description">{categoryCopy.description}</p>
              </div>
              <span
                className="fertilizer-category__count"
                aria-label={category.id === 'base'
                  ? l(`Схема компонентов: ${formatBaseComponentCount(categoryItems[0])}`, `Component scheme: ${formatBaseComponentCount(categoryItems[0])}`)
                  : l(`${categoryItems.length} позиций`, `${categoryItems.length} items`)}
              >
                {category.id === 'base'
                  ? formatBaseComponentCount(categoryItems[0])
                  : `${categoryItems.length}x`}
              </span>
            </header>

            {categoryGroups.length > 0 ? (
              <div className="fertilizer-manufacturer-groups">
                {categoryGroups.map((group) => (
                  <section className="fertilizer-manufacturer-group" key={group.manufacturer}>
                    {category.id !== 'base' ? (
                      <h3 className="fertilizer-manufacturer-group__title">{group.manufacturer}</h3>
                    ) : null}
                    <div className="fertilizer-card-grid">
                      {group.items.map((item) => renderFertilizerCard(item, category.id === 'base'))}
                    </div>
                  </section>
                ))}
                {category.id !== 'base' ? (
                  <button
                    className="fertilizer-card fertilizer-card--empty"
                    type="button"
                    onClick={() => openAddFlow(category.id)}
                  >
                    <span className="fertilizer-card--empty__plus">+</span>
                    <span>{l('Добавить удобрение', 'Add nutrient')}</span>
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="fertilizer-card-grid">
                {categoryItems.map((item) => renderFertilizerCard(item, category.id === 'base'))}
                <button
                  className="fertilizer-card fertilizer-card--empty"
                  type="button"
                  onClick={() => openAddFlow(category.id)}
                >
                  <span className="fertilizer-card--empty__plus">+</span>
                  <span>{category.id === 'base' ? l('Выбрать базу', 'Choose base') : l('Добавить удобрение', 'Add nutrient')}</span>
                </button>
              </div>
            )}
          </section>
          )
        })}
      </div>
    </section>
  )
}

function RecipePage({
  params,
  updateParam,
  fertilizers,
}: PersistentParams & { fertilizers: FertilizerItem[] }) {
  const { language } = useAppPreferences()
  const l = (ru: string, en: string) => language === 'ru' ? ru : en
  const [openRecipePicker, setOpenRecipePicker] = useState<'method' | 'stage' | null>(null)

  useModalAccessibility(
    openRecipePicker,
    '.recipe-picker',
    () => setOpenRecipePicker(null),
  )
  const waterVolumeLiters = params.tankVolumeLiters
  const growMethodId = params.recipeGrowMethodId
  const plantStageId = params.recipePlantStageId
  const selectedMethod = GROW_METHODS.find((method) => method.id === growMethodId)
  const selectedStage = PLANT_STAGES.find((stage) => stage.id === plantStageId)
  const pickerTitle = openRecipePicker === 'method'
    ? l('Метод выращивания', 'Growing method')
    : l('Стадия растения', 'Plant stage')
  const recipeRows = fertilizers
    .flatMap<RecipeRow>((fertilizer) => {
      if (fertilizer.growMethodId !== 'any' && fertilizer.growMethodId !== growMethodId) return []
      if (fertilizer.excludedGrowMethodIds?.includes(growMethodId)) return []

      const components = fertilizer.components?.length ? fertilizer.components : [undefined]
      return components.flatMap((component) => {
        const amountMlPerLiter = getStageAmount(fertilizer, plantStageId, growMethodId, component)
        if (amountMlPerLiter === null) return []

        return [{
          fertilizer,
          component,
          amountMlPerLiter,
          amountTotal: amountMlPerLiter * waterVolumeLiters,
        }]
      })
    })
  const baseRecipeSource = recipeRows
    .filter((item) => item.fertilizer.categoryId === 'base')
    .sort((a, b) => {
      const aMethodScore = a.fertilizer.growMethodId === growMethodId ? 1 : 0
      const bMethodScore = b.fertilizer.growMethodId === growMethodId ? 1 : 0
      if (aMethodScore !== bMethodScore) return bMethodScore - aMethodScore

      const aTargetScore = a.fertilizer.solutionTargets?.some((target) => target.stageId === plantStageId) ? 1 : 0
      const bTargetScore = b.fertilizer.solutionTargets?.some((target) => target.stageId === plantStageId) ? 1 : 0
      return bTargetScore - aTargetScore
    })[0]?.fertilizer
  const baseRecipeRows = baseRecipeSource
    ? recipeRows.filter((item) => item.fertilizer.id === baseRecipeSource.id)
    : []
  const rootAdditiveRows = recipeRows.filter(
    (item) => item.fertilizer.categoryId === 'boosters' && item.fertilizer.application !== 'foliar',
  )
  const foliarAdditiveRows = recipeRows.filter(
    (item) => item.fertilizer.categoryId === 'boosters' && item.fertilizer.application === 'foliar',
  )
  const summaryBaseFertilizers = Array.from(
    new Map(baseRecipeRows.map(({ fertilizer }) => [fertilizer.id, fertilizer])).values(),
  )
  const targetBaseFertilizers = fertilizers.filter(
    (fertilizer) =>
      fertilizer.categoryId === 'base'
      && (fertilizer.growMethodId === 'any' || fertilizer.growMethodId === growMethodId)
      && !fertilizer.excludedGrowMethodIds?.includes(growMethodId),
  )
  const stageLabelSource = baseRecipeSource ?? targetBaseFertilizers.find((fertilizer) => fertilizer.stageLabels)
  const selectedStageDisplay = selectedStage ? getStageDisplay(selectedStage, stageLabelSource, language) : null
  const solutionTarget = targetBaseFertilizers
    .map((fertilizer) => fertilizer.solutionTargets?.find((target) => target.stageId === plantStageId))
    .find((target) => target && (target.phRange || target.ecRange))
  const baseRecipeGroups = groupRecipeRowsByManufacturer(baseRecipeRows)
  const rootAdditiveGroups = groupRecipeRowsByManufacturer(rootAdditiveRows)
  const foliarAdditiveGroups = groupRecipeRowsByManufacturer(foliarAdditiveRows)

  return (
    <section className="recipe-page" aria-label={l('Мой рецепт', 'My recipe')}>
      {openRecipePicker ? createPortal(
        <div className="recipe-picker-overlay" role="presentation" onClick={() => setOpenRecipePicker(null)}>
          <section
            className="recipe-picker"
            role="dialog"
            aria-modal="true"
            aria-label={l(`Выбор: ${pickerTitle}`, `Choose: ${pickerTitle}`)}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="recipe-picker__bar">
              <div>
                <p className="recipe-picker__eyebrow">{l('Настройка рецепта', 'Recipe setup')}</p>
                <h2>{pickerTitle}</h2>
              </div>
              <button
                className="recipe-picker__close"
                type="button"
                onClick={() => setOpenRecipePicker(null)}
                aria-label={l('Закрыть', 'Close')}
              >
                ×
              </button>
            </div>

            <div className="recipe-picker__section">
              <h3>{pickerTitle}</h3>
              <div className="recipe-picker__list">
                {openRecipePicker === 'method' ? GROW_METHODS.map((method) => (
                  <button
                    className={`recipe-picker__option ${growMethodId === method.id ? 'recipe-picker__option--active' : ''}`}
                    key={method.id}
                    type="button"
                    aria-pressed={growMethodId === method.id}
                    onClick={() => {
                      updateParam('recipeGrowMethodId', method.id)
                      setOpenRecipePicker(null)
                    }}
                  >
                    <span>{language === 'ru' ? method.title : METHOD_EN[method.id]}</span>
                    {growMethodId === method.id ? <strong>{l('Выбрано', 'Selected')}</strong> : null}
                  </button>
                )) : PLANT_STAGES.map((stage) => {
                  const display = getStageDisplay(stage, stageLabelSource, language)

                  return (
                    <button
                      className={`recipe-picker__option ${plantStageId === stage.id ? 'recipe-picker__option--active' : ''}`}
                      key={stage.id}
                      type="button"
                      aria-pressed={plantStageId === stage.id}
                      onClick={() => {
                        updateParam('recipePlantStageId', stage.id)
                        setOpenRecipePicker(null)
                      }}
                    >
                      <span className="recipe-picker__option-copy">
                        <span>{display.title}</span>
                        {display.manufacturerTitle ? (
                          <small className="recipe-picker__option-manufacturer">{display.manufacturerTitle}</small>
                        ) : null}
                        <small>{display.description}</small>
                      </span>
                      {plantStageId === stage.id ? <strong>{l('Выбрано', 'Selected')}</strong> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        </div>,
        document.body,
      ) : null}

      <ControlsGrid>
        <ControlCard
          className="recipe-card recipe-card--method"
          title={l('Метод выращивания', 'Growing method')}
          description={l('Среда для рецепта', 'Growing medium for the recipe')}
        >
          <button
            className="recipe-choice-button recipe-choice-button--single"
            type="button"
            aria-haspopup="dialog"
            onClick={() => setOpenRecipePicker('method')}
          >
            <span className="recipe-choice-button__value">{selectedMethod ? (language === 'ru' ? selectedMethod.title : METHOD_EN[selectedMethod.id]) : null}</span>
            <span className="recipe-choice-button__chevron" aria-hidden="true">
              ›
            </span>
          </button>
        </ControlCard>

        <ControlCard
          className="recipe-card recipe-card--stage"
          title={l('Стадия растения', 'Plant stage')}
          description={l('Фаза цикла', 'Current growth phase')}
        >
          <button
            className="recipe-choice-button recipe-choice-button--single"
            type="button"
            aria-haspopup="dialog"
            onClick={() => setOpenRecipePicker('stage')}
          >
            <span className="recipe-choice-button__value">{selectedStageDisplay?.title}</span>
            <span className="recipe-choice-button__chevron" aria-hidden="true">
              ›
            </span>
          </button>
        </ControlCard>

        <ControlCard
          className="recipe-card recipe-card--water"
          title={l('Объём воды', 'Water volume')}
          description={l('Сколько раствора нужно приготовить', 'Amount of solution to prepare')}
        >
          <SliderInput
            showHeader={false}
            value={waterVolumeLiters}
            min={PARAM_LIMITS.tankVolumeLiters.min}
            max={PARAM_LIMITS.tankVolumeLiters.max}
            step={1}
            suffix={l('л', 'L')}
            helper={l('Общий объём воды для рецепта', 'Total water volume for the recipe')}
            onChange={(value) => updateParam('tankVolumeLiters', value)}
          />
        </ControlCard>
      </ControlsGrid>

      <section className="recipe-result" aria-labelledby="recipe-result-title">
        <div className="recipe-result__header">
          <div>
            <p className="recipe-result__eyebrow">{l('Рецепт', 'Recipe')}</p>
            <h2 id="recipe-result-title">{l('Результаты расчета', 'Calculation results')}</h2>
          </div>
        </div>

        <div className="recipe-result__summary">
          <div className="recipe-result__tile">
            <span>pH</span>
            <strong>{solutionTarget?.phRange ?? '—'}</strong>
          </div>
          <div className="recipe-result__tile">
            <span>EC</span>
            <strong className={!solutionTarget?.ecRange && solutionTarget?.phRange ? 'recipe-result__target-note' : undefined}>
              {solutionTarget?.ecRange
                ?? (solutionTarget?.phRange ? l('Приоритет отдан дозировке удобрения', 'Nutrient dosage takes priority') : '—')}
            </strong>
          </div>
          <div className="recipe-result__tile">
            <span>{l('База', 'Base')}</span>
            {summaryBaseFertilizers.length > 0 ? (
              <div className="recipe-result__base-list">
                {summaryBaseFertilizers.map((fertilizer) => (
                  <div className="recipe-result__base-item" key={fertilizer.id}>
                    <small>{fertilizer.manufacturer}</small>
                    <strong>{fertilizer.name}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <strong>—</strong>
            )}
          </div>
          <div className="recipe-result__tile">
            <span>{l('Добавки', 'Supplements')}</span>
            <strong>{rootAdditiveRows.length + foliarAdditiveRows.length}x</strong>
          </div>
        </div>

        <p className="recipe-result__disclaimer">
          {l(
            'Расчёт носит справочный характер. Сверяйте дозировки с актуальной инструкцией производителя и учитывайте качество воды, субстрат и состояние растений.',
            'This calculation is for reference only. Check the current manufacturer instructions and account for water quality, growing medium and plant condition.',
          )}
        </p>

        <div className="recipe-result__tables">
          <section className="recipe-table" aria-labelledby="recipe-base-title">
            <h3 id="recipe-base-title">{l('База', 'Base nutrients')}</h3>
            <div className="recipe-table__head">
              <span>{l('Удобрение', 'Nutrient')}</span>
              <span>{l('мл/л', 'mL/L')}</span>
              <span>{l(`На ${waterVolumeLiters}л`, `Per ${waterVolumeLiters} L`)}</span>
            </div>
            {baseRecipeGroups.length > 0 ? (
              baseRecipeGroups.map((group) => (
                <div className="recipe-table__manufacturer-group" key={group.manufacturer}>
                  <div className="recipe-table__manufacturer">{group.manufacturer}</div>
                  {group.items.map((row) => (
                    <div className="recipe-table__row" key={`${row.fertilizer.id}-${row.component?.id ?? 'main'}`}>
                      <strong>{getRecipeRowName(row)}</strong>
                      <span>{formatRecipePerLiterValue(formatRecipeDosage(row.fertilizer, plantStageId, growMethodId, row.component), language)}</span>
                      <span>{formatRecipeTotalValue(formatStageDosageTotal(row.fertilizer, plantStageId, waterVolumeLiters, growMethodId, row.component), language)}</span>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="recipe-table__empty">{l('Нет базового удобрения для выбранных параметров.', 'No base nutrient matches the selected parameters.')}</p>
            )}
          </section>

          <section className="recipe-table" aria-labelledby="recipe-root-title">
            <h3 id="recipe-root-title">{l('Добавки под корень', 'Root supplements')}</h3>
            <div className="recipe-table__head">
              <span>{l('Добавка', 'Supplement')}</span>
              <span>{l('мл/л', 'mL/L')}</span>
              <span>{l(`На ${waterVolumeLiters}л`, `Per ${waterVolumeLiters} L`)}</span>
            </div>
            {rootAdditiveGroups.length > 0 ? (
              rootAdditiveGroups.map((group) => (
                <div className="recipe-table__manufacturer-group" key={group.manufacturer}>
                  <div className="recipe-table__manufacturer">{group.manufacturer}</div>
                  {group.items.map((row) => (
                    <div className="recipe-table__row" key={`${row.fertilizer.id}-${row.component?.id ?? 'main'}`}>
                      <strong>{getRecipeRowName(row)}</strong>
                      <span>{formatRecipePerLiterValue(formatRecipeDosage(row.fertilizer, plantStageId, growMethodId, row.component), language)}</span>
                      <span>{formatRecipeTotalValue(formatStageDosageTotal(row.fertilizer, plantStageId, waterVolumeLiters, growMethodId, row.component), language)}</span>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="recipe-table__empty">{l('Нет добавок под корень для выбранной стадии.', 'No root supplements match the selected stage.')}</p>
            )}
          </section>

          <section className="recipe-table" aria-labelledby="recipe-foliar-title">
            <h3 id="recipe-foliar-title">{l('По листу', 'Foliar application')}</h3>
            <div className="recipe-table__head recipe-table__head--foliar">
              <span>{l('Добавка', 'Supplement')}</span>
              <span>{l('Капли', 'Drops')}</span>
              <span>{l('мл/л', 'mL/L')}</span>
            </div>
            {foliarAdditiveGroups.length > 0 ? (
              foliarAdditiveGroups.map((group) => (
                <div className="recipe-table__manufacturer-group" key={group.manufacturer}>
                  <div className="recipe-table__manufacturer">{group.manufacturer}</div>
                  {group.items.map((row) => (
                    <div className="recipe-table__row recipe-table__row--foliar" key={`${row.fertilizer.id}-${row.component?.id ?? 'main'}`}>
                      <strong>{getRecipeRowName(row)}</strong>
                      <span>{localizeDosageText(formatRecipeFoliarDose(row.fertilizer.foliarDose), language)}</span>
                      <span>{formatRecipePerLiterValue(formatRecipeDosage(row.fertilizer, plantStageId, growMethodId, row.component), language)}</span>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="recipe-table__empty">{l('Нет листовых добавок для выбранной стадии.', 'No foliar supplements match the selected stage.')}</p>
            )}
          </section>
        </div>
      </section>
    </section>
  )
}

function App() {
  const [activePage, setActivePage] = useState<PageId>('calculator')
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false)
  const [swipeViewportHeight, setSwipeViewportHeight] = useState<number | null>(null)
  const swipeStart = useRef<{
    x: number
    y: number
    time: number
    axis: 'x' | 'y' | null
    viewportWidth: number
    panelHeights: number[]
  } | null>(null)
  const swipeViewportRef = useRef<HTMLElement | null>(null)
  const swipeTrackRef = useRef<HTMLDivElement | null>(null)
  const topbarRef = useRef<HTMLElement | null>(null)
  const swipePanelRefs = useRef<Record<PageId, HTMLDivElement | null>>({
    calculator: null,
    fertilizers: null,
    recipe: null,
  })
  const swipeTransitionTimeout = useRef<number | null>(null)
  const mobileHeaderFrame = useRef<number | null>(null)
  const pendingHeaderScrollTop = useRef(0)
  const isSwipeTransitioning = useRef(false)
  const persistentParams = usePersistentParams()
  const persistentFertilizers = usePersistentFertilizers()
  const { t } = useAppPreferences()

  const isMobileSwipeLayout = () => window.matchMedia(MOBILE_SWIPE_QUERY).matches

  const syncMobileHeader = (scrollTop: number) => {
    pendingHeaderScrollTop.current = scrollTop
    if (mobileHeaderFrame.current !== null) return

    mobileHeaderFrame.current = window.requestAnimationFrame(() => {
      mobileHeaderFrame.current = null
      const topbar = topbarRef.current
      if (!topbar) return
      const progress = Math.min(pendingHeaderScrollTop.current / MOBILE_HEADER_TRAVEL, 1)
      const easedProgress = progress * progress * (3 - 2 * progress)
      const travel = easedProgress * MOBILE_HEADER_TRAVEL
      topbar.style.setProperty('--mobile-header-offset', `${-travel}px`)
      topbar.style.setProperty('--mobile-header-opacity', `${1 - easedProgress}`)
      topbar.style.pointerEvents = progress >= 1 ? 'none' : ''
    })
    setIsHeaderScrolled(scrollTop > 280)
  }

  useEffect(() => {
    const updateHeaderState = () => {
      if (isMobileSwipeLayout()) return
      topbarRef.current?.style.removeProperty('--mobile-header-offset')
      topbarRef.current?.style.removeProperty('--mobile-header-opacity')
      if (topbarRef.current) topbarRef.current.style.pointerEvents = ''
      setIsHeaderScrolled(window.scrollY > 280)
    }

    updateHeaderState()
    window.addEventListener('scroll', updateHeaderState, { passive: true })
    return () => window.removeEventListener('scroll', updateHeaderState)
  }, [])

  const positionSwipeTrack = (pageIndex: number, offset = 0, animate = false) => {
    const track = swipeTrackRef.current
    const viewport = swipeViewportRef.current
    if (!track || !viewport) return
    track.style.transition = animate
      ? 'transform 380ms cubic-bezier(0.22, 0.92, 0.3, 1)'
      : 'none'
    const panel = track.children.item(pageIndex)
    if (!(panel instanceof HTMLElement)) return
    const pageOffset = panel.getBoundingClientRect().left - track.getBoundingClientRect().left
    track.style.transform = `translate3d(${(-pageOffset) + offset}px, 0, 0)`
  }

  const resizeSwipeViewport = useCallback((height: number, animate = false) => {
    const viewport = swipeViewportRef.current
    if (!viewport || isMobileSwipeLayout()) return
    viewport.style.transition = animate
      ? 'height 380ms cubic-bezier(0.22, 0.92, 0.3, 1)'
      : 'none'
    viewport.style.height = `${height}px`
  }, [])

  const getSwipePanelHeight = (pageIndex: number) => {
    const page = PAGE_ORDER[pageIndex]
    return page ? swipePanelRefs.current[page]?.scrollHeight ?? 0 : 0
  }

  const settleSwipeBack = (pageIndex: number) => {
    if (swipeTransitionTimeout.current !== null) window.clearTimeout(swipeTransitionTimeout.current)
    isSwipeTransitioning.current = true
    positionSwipeTrack(pageIndex, 0, true)
    const currentHeight = getSwipePanelHeight(pageIndex)
    if (currentHeight) resizeSwipeViewport(currentHeight, true)
    swipeTransitionTimeout.current = window.setTimeout(() => {
      isSwipeTransitioning.current = false
    }, 380)
  }

  useEffect(() => {
    const index = PAGE_ORDER.indexOf(activePage)
    const panel = swipePanelRefs.current[activePage]
    if (!panel) return

    const updateLayout = () => {
      if (isMobileSwipeLayout()) {
        setSwipeViewportHeight(null)
        swipeViewportRef.current?.style.removeProperty('height')
        swipeViewportRef.current?.style.removeProperty('transition')
        syncMobileHeader(panel.scrollTop)
      } else {
        setSwipeViewportHeight(panel.scrollHeight)
        resizeSwipeViewport(panel.scrollHeight)
      }
      positionSwipeTrack(index)
    }
    updateLayout()
    const observer = new ResizeObserver(updateLayout)
    observer.observe(panel)
    window.addEventListener('resize', updateLayout)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateLayout)
    }
  }, [activePage, resizeSwipeViewport])

  useEffect(() => () => {
    if (swipeTransitionTimeout.current !== null) window.clearTimeout(swipeTransitionTimeout.current)
    if (mobileHeaderFrame.current !== null) window.cancelAnimationFrame(mobileHeaderFrame.current)
  }, [])

  const selectPage = (page: PageId) => {
    if (page === activePage || isSwipeTransitioning.current) return
    const nextHeight = swipePanelRefs.current[page]?.scrollHeight
    if (nextHeight) resizeSwipeViewport(nextHeight)
    if (!isMobileSwipeLayout()) window.scrollTo({ top: 0, behavior: 'auto' })
    setActivePage(page)
  }

  const handlePanelScroll = (page: PageId, event: ReactUIEvent<HTMLDivElement>) => {
    if (page !== activePage || !isMobileSwipeLayout()) return
    syncMobileHeader(event.currentTarget.scrollTop)
  }

  const scrollActivePageToTop = () => {
    if (isMobileSwipeLayout()) {
      swipePanelRefs.current[activePage]?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSwipeStart = (event: ReactTouchEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target : null
    if (isSwipeTransitioning.current || event.touches.length !== 1 || target?.closest(SWIPE_BLOCK_SELECTOR)) {
      swipeStart.current = null
      return
    }

    const touch = event.touches[0]
    swipeStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: performance.now(),
      axis: null,
      viewportWidth: swipeViewportRef.current?.getBoundingClientRect().width ?? 1,
      panelHeights: PAGE_ORDER.map((_, index) => getSwipePanelHeight(index)),
    }
  }

  const handleSwipeMove = (event: ReactTouchEvent<HTMLElement>) => {
    const start = swipeStart.current
    if (!start || event.touches.length !== 1) return

    const touch = event.touches[0]
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    if (!start.axis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= 7) {
      start.axis = Math.abs(deltaX) > Math.abs(deltaY) * 1.04 ? 'x' : 'y'
    }
    if (start.axis !== 'x') return

    event.preventDefault()
    const currentIndex = PAGE_ORDER.indexOf(activePage)
    const adjacentIndex = currentIndex + (deltaX < 0 ? 1 : -1)
    const isOutsideStart = currentIndex === 0 && deltaX > 0
    const isOutsideEnd = currentIndex === PAGE_ORDER.length - 1 && deltaX < 0
    const dragOffset = isOutsideStart || isOutsideEnd
      ? Math.sign(deltaX) * Math.pow(Math.abs(deltaX), 0.72) * 0.72
      : deltaX
    positionSwipeTrack(currentIndex, dragOffset)

    const currentHeight = start.panelHeights[currentIndex] ?? 0
    const adjacentHeight = start.panelHeights[adjacentIndex] ?? 0
    if (adjacentHeight) {
      const progress = Math.min(Math.abs(deltaX) / start.viewportWidth, 1)
      const interpolatedHeight = currentHeight + ((adjacentHeight - currentHeight) * progress)
      resizeSwipeViewport(Math.max(currentHeight, interpolatedHeight))
    } else if (currentHeight) {
      resizeSwipeViewport(currentHeight)
    }
  }

  const handleSwipeEnd = (event: ReactTouchEvent<HTMLElement>) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start || event.changedTouches.length !== 1) return

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - start.x
    const distance = Math.abs(deltaX)
    const deltaY = touch.clientY - start.y
    const duration = performance.now() - start.time
    const velocity = distance / Math.max(duration, 1)
    const isQuickFlick = duration <= SWIPE_FLICK_DURATION && distance >= SWIPE_FLICK_THRESHOLD
    const currentIndex = PAGE_ORDER.indexOf(activePage)
    const isHorizontal = start.axis === 'x' || (start.axis === null && distance > Math.abs(deltaY) * 1.04)
    if (!isHorizontal) {
      return
    }
    if ((!isQuickFlick && distance < SWIPE_THRESHOLD) && velocity < 0.38) {
      settleSwipeBack(currentIndex)
      return
    }

    const direction = deltaX < 0 ? 1 : -1
    const nextIndex = currentIndex + direction
    const nextPage = PAGE_ORDER[nextIndex]
    if (!nextPage) {
      settleSwipeBack(currentIndex)
      return
    }

    if (swipeTransitionTimeout.current !== null) window.clearTimeout(swipeTransitionTimeout.current)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    isSwipeTransitioning.current = true
    positionSwipeTrack(nextIndex, 0, !prefersReducedMotion)
    const nextHeight = getSwipePanelHeight(nextIndex)
    if (nextHeight) resizeSwipeViewport(nextHeight, !prefersReducedMotion)
    swipeTransitionTimeout.current = window.setTimeout(() => {
      if (!isMobileSwipeLayout()) window.scrollTo({ top: 0, behavior: 'auto' })
      setActivePage(nextPage)
      isSwipeTransitioning.current = false
    }, prefersReducedMotion ? 0 : 380)
  }

  return (
    <>
    <AppShell
      className={`app-shell--${activePage}`}
      onTouchStart={handleSwipeStart}
      onTouchMove={handleSwipeMove}
      onTouchEnd={handleSwipeEnd}
      onTouchCancel={() => {
        const wasHorizontal = swipeStart.current?.axis === 'x'
        swipeStart.current = null
        if (wasHorizontal) settleSwipeBack(PAGE_ORDER.indexOf(activePage))
      }}
    >
      <header ref={topbarRef} className="topbar">
        <div className="topbar__heading">
          <div className="topbar__brand">
            <img className="topbar__mark" src={mixmetryMark} alt="" />
            <div className="topbar__title">Mixmetry</div>
          </div>
        </div>
        <div className="topbar__actions">
        <PageNavigation
          activePage={activePage}
          className="page-tabs--desktop"
          labels={{
            sections: t('nav.sections'),
            calculator: t('nav.calculator'),
            fertilizers: t('nav.fertilizers'),
            fertilizersShort: t('nav.fertilizersShort'),
            recipe: t('nav.recipe'),
            recipeShort: t('nav.recipeShort'),
          }}
          onSelect={selectPage}
        />
        <AppSettings />
        </div>
      </header>

      <button
        className={`back-to-top${isHeaderScrolled ? ' back-to-top--visible' : ''}`}
        type="button"
        aria-label={t('actions.backToTop')}
        aria-hidden={!isHeaderScrolled}
        tabIndex={isHeaderScrolled ? 0 : -1}
        onClick={scrollActivePageToTop}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 14 6-6 6 6" />
        </svg>
      </button>

      <main
        ref={swipeViewportRef}
        className="swipe-viewport"
        style={swipeViewportHeight ? { height: `${swipeViewportHeight}px` } : undefined}
      >
        <div ref={swipeTrackRef} className="swipe-track">
          <div
            ref={(node) => { swipePanelRefs.current.calculator = node }}
            className="page swipe-panel"
            aria-hidden={activePage !== 'calculator'}
            inert={activePage !== 'calculator'}
            onScroll={(event) => handlePanelScroll('calculator', event)}
          >
            <CalculatorPage {...persistentParams} />
          </div>
          <div
            ref={(node) => { swipePanelRefs.current.fertilizers = node }}
            className="page swipe-panel"
            aria-hidden={activePage !== 'fertilizers'}
            inert={activePage !== 'fertilizers'}
            onScroll={(event) => handlePanelScroll('fertilizers', event)}
          >
            <FertilizersPage fertilizerState={persistentFertilizers} />
          </div>
          <div
            ref={(node) => { swipePanelRefs.current.recipe = node }}
            className="page swipe-panel"
            aria-hidden={activePage !== 'recipe'}
            inert={activePage !== 'recipe'}
            onScroll={(event) => handlePanelScroll('recipe', event)}
          >
            <RecipePage {...persistentParams} fertilizers={persistentFertilizers.fertilizers} />
          </div>
        </div>
      </main>
    </AppShell>
    {createPortal(
      <div className="mobile-nav-dock">
        <PageNavigation
          activePage={activePage}
          className="page-tabs--mobile"
          labels={{
            sections: t('nav.sections'),
            calculator: t('nav.calculator'),
            fertilizers: t('nav.fertilizers'),
            fertilizersShort: t('nav.fertilizersShort'),
            recipe: t('nav.recipe'),
            recipeShort: t('nav.recipeShort'),
          }}
          onSelect={selectPage}
        />
      </div>,
      document.body,
    )}
    </>
  )
}

export default App
