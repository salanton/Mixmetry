import { useState } from 'react'
import { createPortal } from 'react-dom'
import ControlCard from '../components/ControlCard'
import ControlsGrid from '../components/ControlsGrid'
import SliderInput from '../components/SliderInput'
import { useAppPreferences } from '../contexts/AppPreferencesContext'
import { GROW_METHODS, PLANT_STAGES } from '../data/fertilizerLibrary'
import { PARAM_LIMITS, usePersistentParams } from '../hooks/usePersistentParams'
import { useModalAccessibility } from '../hooks/useModalAccessibility'
import type { FertilizerItem } from '../types'
import {
  formatRecipeDosage,
  formatRecipeFoliarDose,
  formatRecipePerLiterValue,
  formatRecipeTotalValue,
  formatStageDosageTotal,
  getRecipeRowName,
  getStageAmount,
  groupRecipeRowsByManufacturer,
  localizeDosageText,
  type RecipeRow,
} from '../utils/fertilizerDosage'
import { METHOD_EN, getStageDisplay } from '../utils/fertilizerLocalization'

type PersistentParams = ReturnType<typeof usePersistentParams>

const RecipePage = function RecipePage({
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


export default RecipePage
