import { useMemo, useState } from 'react'
import AppShell from './components/AppShell'
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
import dripCalcMark from './assets/dripcalc-mark.svg'
import './App.css'

type PageId = 'calculator' | 'recipe' | 'fertilizers'
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

const PAGE_TITLES: Record<PageId, string> = {
  calculator: 'Калькулятор автополива',
  recipe: 'Мой рецепт',
  fertilizers: 'Мои удобрения',
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

const getStageDisplay = (stage: PlantStage, fertilizer?: FertilizerItem | null) => {
  const label = fertilizer?.stageLabels?.[stage.id]

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
  const nextRefillDateLabel = nextRefillDate.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  })
  const daysWord =
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
    const reminderTitle = `Наполнить бак (${params.tankVolumeLiters} л)`
    const reminderDescription = 'Следующее наполнение бака автополива'
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
            title="Световой режим растений"
            description="Часы света и время включения"
          >
            <SliderInput
              showHeader={false}
              displayValue={`${params.lightHours}/${24 - params.lightHours}`}
              value={params.lightHours}
              min={PARAM_LIMITS.lightHours.min}
              max={PARAM_LIMITS.lightHours.max}
              step={1}
              onChange={(v) => updateParam('lightHours', v)}
              helper={`Свет: ${params.lightHours} ч · Тьма: ${24 - params.lightHours} ч`}
            />
            <SliderInput
              showHeader={false}
              value={timeStringToMinutes(params.lampOnTime)}
              min={0}
              max={23 * 60 + 45}
              step={15}
              displayValue={params.lampOnTime}
              helper="Время включения света"
              onChange={(v) => updateParam('lampOnTime', minutesToTimeString(v))}
            />
          </ControlCard>

          <ControlCard
            className="control-card--waterings"
            title="Частота и количество поливов"
            description="Количество включений и длительность"
          >
            <SliderInput
              showHeader={false}
              value={params.durationMinutes}
              min={PARAM_LIMITS.durationMinutes.min}
              max={PARAM_LIMITS.durationMinutes.max}
              step={1}
              suffix="мин"
              helper="Минуты за раз"
              onChange={(v) => updateParam('durationMinutes', v)}
            />
            <SliderInput
              showHeader={false}
              value={params.wateringsPerDay}
              min={PARAM_LIMITS.wateringsPerDay.min}
              max={maxWateringsPerDay}
              step={1}
              helper="Количество включений"
              onChange={(v) => updateParam('wateringsPerDay', v)}
            />
          </ControlCard>

          <ControlCard
            title="Опции"
            description="Дополнительные параметры"
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
                <div className="toggle-row__title">Правильный полив</div>
                <p className="toggle-row__desc">
                  Только в световом окне, без первых и последних {EDGE_OFFSET_MIN} мин.
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
                <div className="toggle-row__title">Без ограничений</div>
                <p className="toggle-row__desc">До 100 поливов в сутки, специфичное применение</p>
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
                <div className="toggle-row__title">Компенсированные капельницы</div>
                <p className="toggle-row__desc">
                  Позволяет рассчитать расход при использовании таких капельниц
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
                <div className="toggle-row__title">Рассчитать расход</div>
                <p className="toggle-row__desc">Позволяет рассчитать день следующего наполнения бака.</p>
              </div>
            </label>
          </ControlCard>

          {params.showCompensatedDripsCard ? (
            <ControlCard
              className="control-card--drips"
              bentoSpan="desktop-full"
              title="Компенсированные капельницы"
              description="Параметры системы"
            >
              <SliderInput
                showHeader={false}
                displayValue={`${params.dripRateLph.toFixed(1)} л/ч`}
                value={params.dripRateLph}
                min={PARAM_LIMITS.dripRateLph.min}
                max={PARAM_LIMITS.dripRateLph.max}
                step={0.1}
                helper="Расход одной капельницы"
                onChange={(v) => updateParam('dripRateLph', Number(v.toFixed(1)))}
              />
              <SliderInput
                showHeader={false}
                value={params.dripCount}
                min={PARAM_LIMITS.dripCount.min}
                max={PARAM_LIMITS.dripCount.max}
                step={1}
                suffix="x"
                helper="Количество капельниц на растение"
                onChange={(v) => updateParam('dripCount', v)}
              />
              <SliderInput
                showHeader={false}
                value={params.plantCount}
                min={PARAM_LIMITS.plantCount.min}
                max={PARAM_LIMITS.plantCount.max}
                step={1}
                suffix="x"
                helper="Количество растений в системе"
                onChange={(v) => updateParam('plantCount', v)}
              />
            </ControlCard>
          ) : null}

          {params.showTankCard ? (
            <ControlCard
              className="control-card--tank"
              bentoSpan="desktop-full"
              title="Объём бака"
              description="Расчёт до следующего наполнения"
              bodyClassName="control-card--tank__body"
            >
              <SliderInput
                showHeader={false}
                value={params.dailyConsumptionLiters}
                min={PARAM_LIMITS.dailyConsumptionLiters.min}
                max={PARAM_LIMITS.dailyConsumptionLiters.max}
                step={0.1}
                suffix="л"
                helper="Расход литров в день"
                onChange={(v) => updateParam('dailyConsumptionLiters', v)}
                disabled={params.showCompensatedDripsCard}
              />
              <SliderInput
                showHeader={false}
                value={params.tankVolumeLiters}
                min={PARAM_LIMITS.tankVolumeLiters.min}
                max={PARAM_LIMITS.tankVolumeLiters.max}
                step={1}
                suffix="л"
                helper="Объём воды"
                onChange={(v) => updateParam('tankVolumeLiters', v)}
              />
              <div className="tank-result" aria-live="polite">
                <strong className="tank-result__value">
                  {daysUntilRefillRounded} {daysWord}
                </strong>
                <span className="tank-result__date">Запас до ≈ {nextRefillDateLabel}</span>
                <button
                  className="reminder-button"
                  onClick={handleCreateReminder}
                  title="Создать напоминание"
                  aria-label="Создать напоминание о наполнении бака"
                >
                  <span className="reminder-button__text">Напомнить</span>
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

function FertilizersPage() {
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
  } = usePersistentFertilizers()

  const selectedAddCategory = FERTILIZER_CATEGORIES.find((category) => category.id === addFlowCategoryId)
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
  ) => formatStageDosage(item, stageId)

  const renderDosageLabel = (item: FertilizerItem, stageId: (typeof PLANT_STAGES)[number]['id']) => {
    if (!item.components?.length) return <strong>{getDosageLabel(item, stageId)}</strong>

    return (
      <div className="fertilizer-dosage-table__components">
        {item.components.map((component) => (
          <span className="fertilizer-dosage-table__component" key={component.id}>
            <small>{component.name}</small>
            <strong>{formatRecipeDosage(item, stageId, item.growMethodId, component)}</strong>
          </span>
        ))}
      </div>
    )
  }

  const getSourceLabel = () => 'Из базы'
  const renderFertilizerCard = (item: FertilizerItem, showBaseActions = false) => {
    const badge = formatFertilizerBadge(item.name)

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
                  <span className="fertilizer-card__base-description">{item.shortDescription}</span>
                ) : null}
              </span>
            </button>
          </div>
          {!showBaseActions ? <p className="fertilizer-card__meta">{item.shortDescription}</p> : null}
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
      aria-label="Удобрения"
    >
      {addFlowCategoryId ? (
        <div className="fertilizer-tools-overlay" role="presentation" onClick={closeAddFlow}>
          <section
            className="fertilizer-tools"
            role="dialog"
            aria-modal="true"
            aria-label="Добавление удобрений"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fertilizer-tools__bar">
              <div>
                <p className="fertilizer-tools__eyebrow">Добавление</p>
                <h2>{selectedAddCategory?.title ?? 'Удобрение'}</h2>
              </div>
              <button className="fertilizer-tools__close" type="button" onClick={closeAddFlow} aria-label="Закрыть">
                ×
              </button>
            </div>

            <section className="fertilizer-library" aria-labelledby="fertilizer-library-title">
                <div className="fertilizer-form__header">
                  <h2 id="fertilizer-library-title">
                    {selectedManufacturer ?? 'Список производителей'}
                  </h2>
                  <p>
                    {selectedManufacturer
                      ? 'Выберите удобрение этого производителя.'
                      : 'Сначала выберите производителя, потом конкретное удобрение.'}
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
                              <small>{manufacturerItemsCount} поз.</small>
                            </span>
                            <span className="fertilizer-library__plus">→</span>
                          </button>
                        )
                      })
                    ) : (
                      <p className="fertilizer-library__empty">Для этой категории все шаблоны уже добавлены.</p>
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
                                <small>{preset.manufacturer} · {preset.shortDescription}</small>
                              </span>
                            </button>
                            <button
                              className={`fertilizer-library__plus ${isAdded ? 'fertilizer-library__plus--added' : ''}`}
                              type="button"
                              aria-label={isAdded ? `${preset.name} уже добавлено` : `Добавить ${preset.name}`}
                              aria-pressed={isAdded}
                              disabled={isAdded}
                              onClick={(event) => {
                                event.stopPropagation()
                                handleLibraryAdd(preset)
                              }}
                            >
                              {isAdded ? '✓' : '+'}
                            </button>
                          </article>
                        )
                      })
                    ) : (
                      <p className="fertilizer-library__empty">У этого производителя все шаблоны уже добавлены.</p>
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
                  Назад
                </button>
            </section>
          </section>
        </div>
      ) : null}

      {baseLineReplacement ? (
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
                <p className="fertilizer-tools__eyebrow">Предупреждение</p>
                <h2 id="base-line-warning-title">Заменить базовую линейку?</h2>
              </div>
              <button
                className="fertilizer-tools__close"
                type="button"
                onClick={() => setBaseLineReplacement(null)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            <p id="base-line-warning-copy">
              Сейчас выбрана база {baseLineReplacement.currentName}. Если добавить{' '}
              {baseLineReplacement.preset.manufacturer} · {baseLineReplacement.preset.name}, текущая базовая линейка будет удалена
              {baseLineReplacement.currentCount > 1 ? ` (${baseLineReplacement.currentCount} поз.)` : ''}.
            </p>
            <div className="fertilizer-line-warning__actions">
              <button
                className="fertilizer-line-warning__cancel"
                type="button"
                onClick={() => setBaseLineReplacement(null)}
              >
                Отмена
              </button>
              <button
                className="fertilizer-line-warning__confirm"
                type="button"
                onClick={confirmBaseLineReplacement}
              >
                Заменить линейку
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {selectedLibraryPreset ? (
        <div className="fertilizer-tools-overlay fertilizer-tools-overlay--details fertilizer-tools-overlay--stacked" role="presentation" onClick={closeLibraryDetails}>
          <section
            className="fertilizer-details-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Описание удобрения ${selectedLibraryPreset.name}`}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fertilizer-tools__bar">
              <div>
                <p className="fertilizer-tools__eyebrow">Из базы</p>
                <h2>{selectedLibraryPreset.name}</h2>
                <p className="fertilizer-details-modal__meta">
                  {selectedLibraryPreset.manufacturer}
                </p>
              </div>
              <button
                className="fertilizer-tools__close"
                type="button"
                onClick={closeLibraryDetails}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <div className="fertilizer-card__details">
              <p>{selectedLibraryPreset.description}</p>
              <div className="fertilizer-card__chips" aria-label="Поля описания">
                {selectedLibraryPreset.details.map((detail) => (
                  <span className="fertilizer-card__chip" key={detail}>
                    {detail}
                  </span>
                ))}
              </div>
              <div className="fertilizer-dosage-table" aria-label="Дозировки по этапам">
                <div className="fertilizer-dosage-table__row fertilizer-dosage-table__row--head">
                  <span>Этап</span>
                  <strong>Дозировка</strong>
                </div>
                {PLANT_STAGES.map((stage) => {
                  const display = getStageDisplay(stage, selectedLibraryPreset)

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
              <div className="fertilizer-details-actions fertilizer-details-actions--single">
                <button
                  className={`fertilizer-details-actions__change ${fertilizerIds.has(selectedLibraryPreset.id) ? 'fertilizer-details-actions__change--added' : ''}`}
                  type="button"
                  aria-pressed={fertilizerIds.has(selectedLibraryPreset.id)}
                  disabled={fertilizerIds.has(selectedLibraryPreset.id)}
                  onClick={() => handleLibraryAdd(selectedLibraryPreset)}
                >
                  {fertilizerIds.has(selectedLibraryPreset.id) ? '✓ Добавлено' : 'Добавить'}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {selectedFertilizer ? (
        <div className="fertilizer-tools-overlay fertilizer-tools-overlay--details" role="presentation" onClick={closeFertilizerDetails}>
          <section
            className="fertilizer-details-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Карточка удобрения ${selectedFertilizer.name}`}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fertilizer-tools__bar">
              <div>
                <p className="fertilizer-tools__eyebrow">Удобрение</p>
                <h2>{selectedFertilizer.name}</h2>
                <p className="fertilizer-details-modal__meta">
                  {selectedFertilizer.manufacturer} · {getSourceLabel()}
                </p>
              </div>
              <button
                className="fertilizer-tools__close"
                type="button"
                onClick={closeFertilizerDetails}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <div className="fertilizer-card__details">
              <p>{selectedFertilizer.description}</p>
              <div className="fertilizer-card__chips" aria-label="Поля описания">
                {selectedFertilizer.details.map((detail) => (
                  <span className="fertilizer-card__chip" key={detail}>
                    {detail}
                  </span>
                ))}
              </div>
              <div className="fertilizer-dosage-table" aria-label="Дозировки по этапам">
                <div className="fertilizer-dosage-table__row fertilizer-dosage-table__row--head">
                  <span>Этап</span>
                  <strong>Дозировка</strong>
                </div>
                {PLANT_STAGES.map((stage) => {
                  const display = getStageDisplay(stage, selectedFertilizer)

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
                    Сменить базу
                  </button>
                ) : null}
                {!isBaseDeleteConfirmOpen ? (
                  <button
                    className="fertilizer-details-actions__more"
                    type="button"
                    onClick={() => setIsBaseDeleteConfirmOpen(true)}
                  >
                    {selectedFertilizer.categoryId === 'base' ? 'Удалить' : 'Удалить добавку'}
                  </button>
                ) : (
                  <div className="fertilizer-details-actions__confirm" role="alert">
                    <span>
                      {selectedFertilizer.categoryId === 'base'
                        ? 'Удалить базу из набора?'
                        : 'Удалить добавку из набора?'}
                    </span>
                    <button type="button" onClick={() => setIsBaseDeleteConfirmOpen(false)}>
                      Отмена
                    </button>
                    <button
                      className="fertilizer-details-actions__delete"
                      type="button"
                      onClick={() => handleDelete(selectedFertilizer.id)}
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <section className="fertilizer-overview" aria-label="Сводка по удобрениям">
        <div className="fertilizer-overview__tile fertilizer-overview__tile--base">
          <span>База</span>
          <strong>{formatBaseComponentCount(baseFertilizers[0])}</strong>
        </div>
        <div className="fertilizer-overview__tile">
          <span>Добавки</span>
          <strong>{additiveFertilizers.length}x</strong>
        </div>
        <div className="fertilizer-overview__tile">
          <span>Производители</span>
          <strong>{manufacturerCount}x</strong>
        </div>
      </section>

      <div className="fertilizer-shelf">
        {FERTILIZER_CATEGORIES.map((category) => {
          const categoryItems = fertilizers.filter((item) => item.categoryId === category.id)
          const categoryGroups = groupFertilizersByManufacturer(categoryItems)

          return (
          <section
            className={`fertilizer-category${category.id === 'base' ? ' fertilizer-category--base' : ''}`}
            key={category.id}
          >
            <header className="fertilizer-category__header">
              <div>
                <h2 className="fertilizer-category__title">{category.title}</h2>
                <p className="fertilizer-category__description">{category.description}</p>
              </div>
              <span
                className="fertilizer-category__count"
                aria-label={category.id === 'base'
                  ? `Схема компонентов: ${formatBaseComponentCount(categoryItems[0])}`
                  : `${categoryItems.length} позиций`}
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
                    <span>Добавить удобрение</span>
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
                  <span>{category.id === 'base' ? 'Выбрать базу' : 'Добавить удобрение'}</span>
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

function RecipePage({ params, updateParam }: PersistentParams) {
  const [openRecipePicker, setOpenRecipePicker] = useState<'method' | 'stage' | null>(null)

  useModalAccessibility(
    openRecipePicker,
    '.recipe-page [role="dialog"]',
    () => setOpenRecipePicker(null),
  )
  const { fertilizers } = usePersistentFertilizers()

  const waterVolumeLiters = params.tankVolumeLiters
  const growMethodId = params.recipeGrowMethodId
  const plantStageId = params.recipePlantStageId
  const selectedMethod = GROW_METHODS.find((method) => method.id === growMethodId)
  const selectedStage = PLANT_STAGES.find((stage) => stage.id === plantStageId)
  const pickerTitle = openRecipePicker === 'method' ? 'Метод выращивания' : 'Стадия растения'
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
  const selectedStageDisplay = selectedStage ? getStageDisplay(selectedStage, stageLabelSource) : null
  const solutionTarget = targetBaseFertilizers
    .map((fertilizer) => fertilizer.solutionTargets?.find((target) => target.stageId === plantStageId))
    .find((target) => target && (target.phRange || target.ecRange))
  const baseRecipeGroups = groupRecipeRowsByManufacturer(baseRecipeRows)
  const rootAdditiveGroups = groupRecipeRowsByManufacturer(rootAdditiveRows)
  const foliarAdditiveGroups = groupRecipeRowsByManufacturer(foliarAdditiveRows)

  return (
    <section className="recipe-page" aria-label="Мой рецепт">
      {openRecipePicker ? (
        <div className="recipe-picker-overlay" role="presentation" onClick={() => setOpenRecipePicker(null)}>
          <section
            className="recipe-picker"
            role="dialog"
            aria-modal="true"
            aria-label={`Выбор: ${pickerTitle}`}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="recipe-picker__bar">
              <div>
                <p className="recipe-picker__eyebrow">Настройка рецепта</p>
                <h2>{pickerTitle}</h2>
              </div>
              <button
                className="recipe-picker__close"
                type="button"
                onClick={() => setOpenRecipePicker(null)}
                aria-label="Закрыть"
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
                    <span>{method.title}</span>
                    {growMethodId === method.id ? <strong>Выбрано</strong> : null}
                  </button>
                )) : PLANT_STAGES.map((stage) => {
                  const display = getStageDisplay(stage, stageLabelSource)

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
                      {plantStageId === stage.id ? <strong>Выбрано</strong> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <ControlsGrid>
        <ControlCard
          className="recipe-card recipe-card--method"
          title="Метод выращивания"
          description="Среда для рецепта"
        >
          <button
            className="recipe-choice-button recipe-choice-button--single"
            type="button"
            aria-haspopup="dialog"
            onClick={() => setOpenRecipePicker('method')}
          >
            <span className="recipe-choice-button__value">{selectedMethod?.title}</span>
            <span className="recipe-choice-button__chevron" aria-hidden="true">
              ›
            </span>
          </button>
        </ControlCard>

        <ControlCard
          className="recipe-card recipe-card--stage"
          title="Стадия растения"
          description="Фаза цикла"
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
          title="Объём воды"
          description="Сколько раствора нужно приготовить"
        >
          <SliderInput
            showHeader={false}
            value={waterVolumeLiters}
            min={PARAM_LIMITS.tankVolumeLiters.min}
            max={PARAM_LIMITS.tankVolumeLiters.max}
            step={1}
            suffix="л"
            helper="Общий объём воды для рецепта"
            onChange={(value) => updateParam('tankVolumeLiters', value)}
          />
        </ControlCard>
      </ControlsGrid>

      <section className="recipe-result" aria-labelledby="recipe-result-title">
        <div className="recipe-result__header">
          <div>
            <p className="recipe-result__eyebrow">Рецепт</p>
            <h2 id="recipe-result-title">Результаты расчета</h2>
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
                ?? (solutionTarget?.phRange ? 'Приоритет отдан дозировке удобрения' : '—')}
            </strong>
          </div>
          <div className="recipe-result__tile">
            <span>База</span>
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
            <span>Добавки</span>
            <strong>{rootAdditiveRows.length + foliarAdditiveRows.length}x</strong>
          </div>
        </div>

        <div className="recipe-result__tables">
          <section className="recipe-table" aria-labelledby="recipe-base-title">
            <h3 id="recipe-base-title">База</h3>
            <div className="recipe-table__head">
              <span>Удобрение</span>
              <span>На 1л</span>
              <span>На {waterVolumeLiters}л</span>
            </div>
            {baseRecipeGroups.length > 0 ? (
              baseRecipeGroups.map((group) => (
                <div className="recipe-table__manufacturer-group" key={group.manufacturer}>
                  <div className="recipe-table__manufacturer">{group.manufacturer}</div>
                  {group.items.map((row) => (
                    <div className="recipe-table__row" key={`${row.fertilizer.id}-${row.component?.id ?? 'main'}`}>
                      <strong>{getRecipeRowName(row)}</strong>
                      <span>{formatRecipeDosage(row.fertilizer, plantStageId, growMethodId, row.component)}</span>
                      <span>{formatStageDosageTotal(row.fertilizer, plantStageId, waterVolumeLiters, growMethodId, row.component)}</span>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="recipe-table__empty">Нет базового удобрения для выбранных параметров.</p>
            )}
          </section>

          <section className="recipe-table" aria-labelledby="recipe-root-title">
            <h3 id="recipe-root-title">Добавки под корень</h3>
            <div className="recipe-table__head">
              <span>Добавка</span>
              <span>На 1л</span>
              <span>На {waterVolumeLiters}л</span>
            </div>
            {rootAdditiveGroups.length > 0 ? (
              rootAdditiveGroups.map((group) => (
                <div className="recipe-table__manufacturer-group" key={group.manufacturer}>
                  <div className="recipe-table__manufacturer">{group.manufacturer}</div>
                  {group.items.map((row) => (
                    <div className="recipe-table__row" key={`${row.fertilizer.id}-${row.component?.id ?? 'main'}`}>
                      <strong>{getRecipeRowName(row)}</strong>
                      <span>{formatRecipeDosage(row.fertilizer, plantStageId, growMethodId, row.component)}</span>
                      <span>{formatStageDosageTotal(row.fertilizer, plantStageId, waterVolumeLiters, growMethodId, row.component)}</span>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="recipe-table__empty">Нет добавок под корень для выбранной стадии.</p>
            )}
          </section>

          <section className="recipe-table" aria-labelledby="recipe-foliar-title">
            <h3 id="recipe-foliar-title">По листу</h3>
            <div className="recipe-table__head recipe-table__head--foliar">
              <span>Добавка</span>
              <span>Капли</span>
              <span>На 1л</span>
            </div>
            {foliarAdditiveGroups.length > 0 ? (
              foliarAdditiveGroups.map((group) => (
                <div className="recipe-table__manufacturer-group" key={group.manufacturer}>
                  <div className="recipe-table__manufacturer">{group.manufacturer}</div>
                  {group.items.map((row) => (
                    <div className="recipe-table__row recipe-table__row--foliar" key={`${row.fertilizer.id}-${row.component?.id ?? 'main'}`}>
                      <strong>{getRecipeRowName(row)}</strong>
                      <span>{formatRecipeFoliarDose(row.fertilizer.foliarDose)}</span>
                      <span>{formatRecipeDosage(row.fertilizer, plantStageId, growMethodId, row.component)}</span>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="recipe-table__empty">Нет листовых добавок для выбранной стадии.</p>
            )}
          </section>
        </div>
      </section>
    </section>
  )
}

function App() {
  const [activePage, setActivePage] = useState<PageId>('calculator')
  const persistentParams = usePersistentParams()

  return (
    <AppShell className={`app-shell--${activePage}`}>
      <header className="topbar">
        <div className="topbar__heading">
          <div className="topbar__brand">
            <img className="topbar__mark" src={dripCalcMark} alt="" />
            <div className="topbar__title">DripCalc</div>
          </div>
          <h1 className="topbar__subtitle">{PAGE_TITLES[activePage]}</h1>
        </div>
        <nav className="page-tabs" aria-label="Разделы приложения">
          <button
            className={`page-tabs__button page-tabs__button--calculator ${
              activePage === 'calculator' ? 'page-tabs__button--active' : ''
            }`}
            type="button"
            aria-label="Полив"
            aria-current={activePage === 'calculator' ? 'page' : undefined}
            onClick={() => setActivePage('calculator')}
          >
            <PageIcon page="calculator" />
            <span className="page-tabs__label page-tabs__label--desktop">Полив</span>
            <span className="page-tabs__label page-tabs__label--mobile">Полив</span>
          </button>
          <button
            className={`page-tabs__button page-tabs__button--fertilizers ${
              activePage === 'fertilizers' ? 'page-tabs__button--active' : ''
            }`}
            type="button"
            aria-label="Мои удобрения"
            aria-current={activePage === 'fertilizers' ? 'page' : undefined}
            onClick={() => setActivePage('fertilizers')}
          >
            <PageIcon page="fertilizers" />
            <span className="page-tabs__label page-tabs__label--desktop">Мои удобрения</span>
            <span className="page-tabs__label page-tabs__label--mobile">Удобрения</span>
          </button>
          <button
            className={`page-tabs__button page-tabs__button--recipe ${
              activePage === 'recipe' ? 'page-tabs__button--active' : ''
            }`}
            type="button"
            aria-label="Мой рецепт"
            aria-current={activePage === 'recipe' ? 'page' : undefined}
            onClick={() => setActivePage('recipe')}
          >
            <PageIcon page="recipe" />
            <span className="page-tabs__label page-tabs__label--desktop">Мой рецепт</span>
            <span className="page-tabs__label page-tabs__label--mobile">Рецепт</span>
          </button>
        </nav>
      </header>

      <main className="page">
        {activePage === 'calculator' ? <CalculatorPage {...persistentParams} /> : null}
        {activePage === 'recipe' ? <RecipePage {...persistentParams} /> : null}
        {activePage === 'fertilizers' ? <FertilizersPage /> : null}
      </main>
    </AppShell>
  )
}

export default App
