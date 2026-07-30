import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent as ReactTouchEvent,
  type UIEvent as ReactUIEvent,
} from 'react'
import type { PageId } from '../components/PageNavigation'

const PAGE_ORDER: PageId[] = ['calculator', 'fertilizers', 'recipe']
const SWIPE_THRESHOLD = 48
const SWIPE_FLICK_THRESHOLD = 28
const SWIPE_FLICK_DURATION = 300
const SWIPE_TRANSITION_MS = 380
const SWIPE_TRANSITION_FALLBACK_MS = SWIPE_TRANSITION_MS + 80
const SWIPE_TRANSITION_EASING = 'cubic-bezier(0.22, 0.92, 0.3, 1)'
const MOBILE_SWIPE_QUERY = '(max-width: 639px)'
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

type SwipeStart = {
  x: number
  y: number
  time: number
  axis: 'x' | 'y' | null
  viewportWidth: number
  panelHeights: number[]
}

const isMobileSwipeLayout = () => window.matchMedia(MOBILE_SWIPE_QUERY).matches

export const useSwipeNavigation = () => {
  const [activePage, setActivePage] = useState<PageId>('calculator')
  const [isHeaderOverContent, setIsHeaderOverContent] = useState(false)
  const [swipeViewportHeight, setSwipeViewportHeight] = useState<number | null>(null)
  const swipeStartRef = useRef<SwipeStart | null>(null)
  const swipeViewportRef = useRef<HTMLElement | null>(null)
  const swipeTrackRef = useRef<HTMLDivElement | null>(null)
  const swipePanelRefs = useRef<Record<PageId, HTMLDivElement | null>>({
    calculator: null,
    fertilizers: null,
    recipe: null,
  })
  const transitionCleanupRef = useRef<(() => void) | null>(null)
  const isSwipeTransitioningRef = useRef(false)

  const setPanelRef = useCallback((page: PageId, node: HTMLDivElement | null) => {
    swipePanelRefs.current[page] = node
  }, [])

  const syncMobileHeader = useCallback((scrollTop: number) => {
    setIsHeaderOverContent(scrollTop > 8)
  }, [])

  useEffect(() => {
    const updateHeaderState = () => {
      if (isMobileSwipeLayout()) return
      setIsHeaderOverContent(window.scrollY > 8)
    }

    updateHeaderState()
    window.addEventListener('scroll', updateHeaderState, { passive: true })
    return () => window.removeEventListener('scroll', updateHeaderState)
  }, [])

  const positionSwipeTrack = useCallback((pageIndex: number, offset = 0, animate = false) => {
    const track = swipeTrackRef.current
    if (!track || !swipeViewportRef.current) return
    track.style.transition = animate
      ? `transform ${SWIPE_TRANSITION_MS}ms ${SWIPE_TRANSITION_EASING}`
      : 'none'
    const panel = track.children.item(pageIndex)
    if (!(panel instanceof HTMLElement)) return
    const pageOffset = panel.getBoundingClientRect().left - track.getBoundingClientRect().left
    track.style.transform = `translate3d(${(-pageOffset) + offset}px, 0, 0)`
  }, [])

  const resizeSwipeViewport = useCallback((height: number, animate = false) => {
    const viewport = swipeViewportRef.current
    if (!viewport || isMobileSwipeLayout()) return
    viewport.style.transition = animate
      ? `height ${SWIPE_TRANSITION_MS}ms ${SWIPE_TRANSITION_EASING}`
      : 'none'
    viewport.style.height = `${height}px`
  }, [])

  const getSwipePanelHeight = useCallback((pageIndex: number) => {
    const page = PAGE_ORDER[pageIndex]
    return page ? swipePanelRefs.current[page]?.scrollHeight ?? 0 : 0
  }, [])

  const cancelTransitionCompletion = useCallback(() => {
    transitionCleanupRef.current?.()
    transitionCleanupRef.current = null
  }, [])

  const completeAfterSwipeTransition = useCallback((callback: () => void, animate: boolean) => {
    cancelTransitionCompletion()
    const track = swipeTrackRef.current
    if (!animate || !track) {
      callback()
      return
    }

    let completed = false
    let fallbackId: number | null = null
    const cleanup = () => {
      track.removeEventListener('transitionend', handleTransitionEnd)
      if (fallbackId !== null) window.clearTimeout(fallbackId)
    }
    const finish = () => {
      if (completed) return
      completed = true
      cleanup()
      transitionCleanupRef.current = null
      callback()
    }
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target === track && event.propertyName === 'transform') finish()
    }

    track.addEventListener('transitionend', handleTransitionEnd)
    fallbackId = window.setTimeout(finish, SWIPE_TRANSITION_FALLBACK_MS)
    transitionCleanupRef.current = cleanup
  }, [cancelTransitionCompletion])

  const settleSwipeBack = useCallback((pageIndex: number) => {
    isSwipeTransitioningRef.current = true
    positionSwipeTrack(pageIndex, 0, true)
    const currentHeight = getSwipePanelHeight(pageIndex)
    if (currentHeight) resizeSwipeViewport(currentHeight, true)
    completeAfterSwipeTransition(() => {
      isSwipeTransitioningRef.current = false
    }, true)
  }, [completeAfterSwipeTransition, getSwipePanelHeight, positionSwipeTrack, resizeSwipeViewport])

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
  }, [activePage, positionSwipeTrack, resizeSwipeViewport, syncMobileHeader])

  useEffect(() => cancelTransitionCompletion, [cancelTransitionCompletion])

  const selectPage = useCallback((page: PageId) => {
    if (page === activePage || isSwipeTransitioningRef.current) return
    const nextHeight = swipePanelRefs.current[page]?.scrollHeight
    if (nextHeight) resizeSwipeViewport(nextHeight)
    if (!isMobileSwipeLayout()) window.scrollTo({ top: 0, behavior: 'auto' })
    setActivePage(page)
  }, [activePage, resizeSwipeViewport])

  const handlePanelScroll = useCallback((page: PageId, event: ReactUIEvent<HTMLDivElement>) => {
    if (page !== activePage || !isMobileSwipeLayout()) return
    syncMobileHeader(event.currentTarget.scrollTop)
  }, [activePage, syncMobileHeader])

  const scrollActivePageToTop = useCallback(() => {
    if (isMobileSwipeLayout()) {
      swipePanelRefs.current[activePage]?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activePage])

  const handleSwipeStart = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target : null
    if (isSwipeTransitioningRef.current || event.touches.length !== 1 || target?.closest(SWIPE_BLOCK_SELECTOR)) {
      swipeStartRef.current = null
      return
    }

    const touch = event.touches[0]
    swipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: performance.now(),
      axis: null,
      viewportWidth: swipeViewportRef.current?.getBoundingClientRect().width ?? 1,
      panelHeights: PAGE_ORDER.map((_, index) => getSwipePanelHeight(index)),
    }
  }, [getSwipePanelHeight])

  const handleSwipeMove = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    const start = swipeStartRef.current
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
  }, [activePage, positionSwipeTrack, resizeSwipeViewport])

  const handleSwipeEnd = useCallback((event: ReactTouchEvent<HTMLElement>) => {
    const start = swipeStartRef.current
    swipeStartRef.current = null
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
    if (!isHorizontal) return
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

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animate = !prefersReducedMotion
    isSwipeTransitioningRef.current = true
    positionSwipeTrack(nextIndex, 0, animate)
    const nextHeight = getSwipePanelHeight(nextIndex)
    if (nextHeight) resizeSwipeViewport(nextHeight, animate)
    completeAfterSwipeTransition(() => {
      if (!isMobileSwipeLayout()) window.scrollTo({ top: 0, behavior: 'auto' })
      setActivePage(nextPage)
      isSwipeTransitioningRef.current = false
    }, animate)
  }, [activePage, completeAfterSwipeTransition, getSwipePanelHeight, positionSwipeTrack, resizeSwipeViewport, settleSwipeBack])

  const handleSwipeCancel = useCallback(() => {
    const wasHorizontal = swipeStartRef.current?.axis === 'x'
    swipeStartRef.current = null
    if (wasHorizontal) settleSwipeBack(PAGE_ORDER.indexOf(activePage))
  }, [activePage, settleSwipeBack])

  return {
    activePage,
    isHeaderOverContent,
    swipeViewportHeight,
    swipeViewportRef,
    swipeTrackRef,
    setPanelRef,
    selectPage,
    handlePanelScroll,
    scrollActivePageToTop,
    handleSwipeStart,
    handleSwipeMove,
    handleSwipeEnd,
    handleSwipeCancel,
  }
}
