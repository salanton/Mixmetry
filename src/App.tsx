import { useCallback, useEffect, useRef, useState, type TouchEvent as ReactTouchEvent, type UIEvent as ReactUIEvent } from 'react'
import { createPortal } from 'react-dom'
import AppShell from './components/AppShell'
import AppSettings from './components/AppSettings'
import PageNavigation, { type PageId } from './components/PageNavigation'
import { usePersistentFertilizers } from './hooks/usePersistentFertilizers'
import { usePersistentParams } from './hooks/usePersistentParams'
import CalculatorPage from './pages/CalculatorPage'
import FertilizersPage from './pages/FertilizersPage'
import RecipePage from './pages/RecipePage'
import mixmetryMark from './assets/mixmetry-mark.svg'
import { useAppPreferences } from './contexts/AppPreferencesContext'
import './styles/tokens.css'
import './styles/foundation.css'
import './styles/recipe.css'
import './styles/fertilizers.css'
import './styles/calculator.css'
import './styles/responsive.css'
import './styles/polish.css'
import './styles/density.css'
import './styles/header.css'
import './styles/navigation.css'
import './styles/settings.css'
import './styles/fertilizer-refinements.css'
import './styles/composition.css'
import './styles/summary-refinements.css'
import './styles/semantic-finishing.css'

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
