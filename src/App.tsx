import { useCallback, useEffect, useRef, useState, type TouchEvent as ReactTouchEvent, type UIEvent as ReactUIEvent } from 'react'
import { createPortal } from 'react-dom'
import AppShell from './components/AppShell'
import AppSettings from './components/AppSettings'
import ControlCard from './components/ControlCard'
import ControlsGrid from './components/ControlsGrid'
import PageNavigation, { type PageId } from './components/PageNavigation'
import SliderInput from './components/SliderInput'
import { GROW_METHODS, PLANT_STAGES } from './data/fertilizerLibrary'
import { usePersistentFertilizers } from './hooks/usePersistentFertilizers'
import { PARAM_LIMITS, usePersistentParams } from './hooks/usePersistentParams'
import { useModalAccessibility } from './hooks/useModalAccessibility'
import type { FertilizerItem } from './types'
import CalculatorPage from './pages/CalculatorPage'
import FertilizersPage from './pages/FertilizersPage'
import { METHOD_EN, getStageDisplay } from './utils/fertilizerLocalization'
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
} from './utils/fertilizerDosage'
import mixmetryMark from './assets/mixmetry-mark.svg'
import { useAppPreferences } from './contexts/AppPreferencesContext'
import './App.css'

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
type PersistentParams = ReturnType<typeof usePersistentParams>

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
      <div className={`mobile-nav-dock app-shell--${activePage}`}>
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
