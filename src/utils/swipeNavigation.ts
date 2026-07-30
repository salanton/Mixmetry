export const SWIPE_TRANSITION_MS = 380
export const SWIPE_TRANSITION_EASING = 'cubic-bezier(0.22, 0.92, 0.3, 1)'

const SWIPE_THRESHOLD = 48
const SWIPE_FLICK_THRESHOLD = 28
const SWIPE_FLICK_DURATION = 300
const AXIS_ACTIVATION_DISTANCE = 7
const HORIZONTAL_AXIS_RATIO = 1.04
const MIN_SWIPE_VELOCITY = 0.38

export type SwipeAxis = 'x' | 'y' | null

export const resolveSwipeAxis = (currentAxis: SwipeAxis, deltaX: number, deltaY: number): SwipeAxis => {
  if (currentAxis || Math.max(Math.abs(deltaX), Math.abs(deltaY)) < AXIS_ACTIVATION_DISTANCE) {
    return currentAxis
  }
  return Math.abs(deltaX) > Math.abs(deltaY) * HORIZONTAL_AXIS_RATIO ? 'x' : 'y'
}

export const isHorizontalSwipe = (axis: SwipeAxis, deltaX: number, deltaY: number) => (
  axis === 'x' || (axis === null && Math.abs(deltaX) > Math.abs(deltaY) * HORIZONTAL_AXIS_RATIO)
)

export const getSwipeDragOffset = (
  deltaX: number,
  currentIndex: number,
  lastIndex: number,
) => {
  const isOutsideStart = currentIndex === 0 && deltaX > 0
  const isOutsideEnd = currentIndex === lastIndex && deltaX < 0
  if (!isOutsideStart && !isOutsideEnd) return deltaX
  return Math.sign(deltaX) * Math.pow(Math.abs(deltaX), 0.72) * 0.72
}

export const interpolateSwipeHeight = (
  currentHeight: number,
  adjacentHeight: number,
  deltaX: number,
  viewportWidth: number,
) => {
  if (!adjacentHeight) return currentHeight
  const progress = Math.min(Math.abs(deltaX) / Math.max(viewportWidth, 1), 1)
  return Math.max(currentHeight, currentHeight + ((adjacentHeight - currentHeight) * progress))
}

export const shouldCompleteSwipe = (
  axis: SwipeAxis,
  deltaX: number,
  deltaY: number,
  duration: number,
) => {
  if (!isHorizontalSwipe(axis, deltaX, deltaY)) return false
  const distance = Math.abs(deltaX)
  const velocity = distance / Math.max(duration, 1)
  const isQuickFlick = duration <= SWIPE_FLICK_DURATION && distance >= SWIPE_FLICK_THRESHOLD
  return isQuickFlick || distance >= SWIPE_THRESHOLD || velocity >= MIN_SWIPE_VELOCITY
}

export const getAdjacentPageIndex = (currentIndex: number, deltaX: number) => (
  currentIndex + (deltaX < 0 ? 1 : -1)
)
