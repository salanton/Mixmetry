import { describe, expect, it } from 'vitest'
import {
  getAdjacentPageIndex,
  getSwipeDragOffset,
  interpolateSwipeHeight,
  isHorizontalSwipe,
  resolveSwipeAxis,
  shouldCompleteSwipe,
} from './swipeNavigation'

describe('swipe navigation math', () => {
  it('locks onto the dominant axis only after the activation distance', () => {
    expect(resolveSwipeAxis(null, 4, 2)).toBeNull()
    expect(resolveSwipeAxis(null, 20, 3)).toBe('x')
    expect(resolveSwipeAxis(null, 3, 20)).toBe('y')
    expect(resolveSwipeAxis('x', 0, 100)).toBe('x')
  })

  it('recognizes a horizontal gesture before the axis is locked', () => {
    expect(isHorizontalSwipe(null, 20, 5)).toBe(true)
    expect(isHorizontalSwipe(null, 5, 20)).toBe(false)
  })

  it('applies resistance only beyond the first and last page', () => {
    expect(getSwipeDragOffset(80, 1, 2)).toBe(80)
    expect(getSwipeDragOffset(80, 0, 2)).toBeLessThan(80)
    expect(getSwipeDragOffset(-80, 2, 2)).toBeGreaterThan(-80)
  })

  it('interpolates toward taller pages but never collapses during a drag', () => {
    expect(interpolateSwipeHeight(400, 800, 50, 100)).toBe(600)
    expect(interpolateSwipeHeight(800, 400, 50, 100)).toBe(800)
    expect(interpolateSwipeHeight(400, 0, 50, 100)).toBe(400)
  })

  it('accepts long, fast and flick gestures while rejecting vertical motion', () => {
    expect(shouldCompleteSwipe('x', 60, 2, 500)).toBe(true)
    expect(shouldCompleteSwipe('x', 30, 2, 100)).toBe(true)
    expect(shouldCompleteSwipe('x', 20, 2, 40)).toBe(true)
    expect(shouldCompleteSwipe('x', 20, 2, 500)).toBe(false)
    expect(shouldCompleteSwipe('y', 100, 2, 100)).toBe(false)
  })

  it('maps drag direction to the adjacent page index', () => {
    expect(getAdjacentPageIndex(1, -40)).toBe(2)
    expect(getAdjacentPageIndex(1, 40)).toBe(0)
  })
})
