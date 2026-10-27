import { describe, expect, it } from 'vitest'
import { dragSelection, edgePan, pointerPastMarquee, rectContains, rectsMeet, screenRect } from './marquee.js'

describe('pointerPastMarquee', () => {
  it('stays a click inside 6 pixels', () => {
    expect(pointerPastMarquee(0, 0)).toBe(false)
    expect(pointerPastMarquee(5, 0)).toBe(false)
    expect(pointerPastMarquee(4, 4)).toBe(false)
  })

  it('starts a selection at 6 pixels', () => {
    expect(pointerPastMarquee(6, 0)).toBe(true)
    expect(pointerPastMarquee(0, -6)).toBe(true)
    expect(pointerPastMarquee(5, 5)).toBe(true)
  })
})

describe('rectsMeet', () => {
  it('meets when the boxes overlap and misses when they only touch an edge', () => {
    const area = screenRect(0, 0, 40, 40)
    expect(rectsMeet(area, screenRect(10, 10, 20, 20))).toBe(true)
    expect(rectsMeet(area, screenRect(40, 0, 50, 10))).toBe(false)
    expect(rectsMeet(area, screenRect(50, 50, 60, 60))).toBe(false)
  })
})

describe('rectContains', () => {
  const area = screenRect(0, 0, 100, 80)

  it('accepts an element that sits wholly inside', () => {
    expect(rectContains(area, screenRect(10, 10, 40, 40), 0)).toBe(true)
    expect(rectContains(area, area, 0)).toBe(true)
  })

  it('rejects an element that only overlaps the rectangle', () => {
    expect(rectContains(area, screenRect(90, 10, 120, 40), 0)).toBe(false)
    expect(rectContains(area, screenRect(-10, 10, 20, 40), 0)).toBe(false)
    expect(rectContains(area, screenRect(10, 70, 40, 100), 0)).toBe(false)
  })
})

describe('edgePan', () => {
  const size = { width: 400, height: 300 }

  it('stays still while the pointer is away from the edge', () => {
    expect(edgePan({ x: 200, y: 150 }, size)).toEqual({ x: 0, y: 0 })
  })

  it('moves the diagram so the side past the pointer comes into view', () => {
    expect(edgePan({ x: 0, y: 150 }, size).x).toBeGreaterThan(0)
    expect(edgePan({ x: 400, y: 150 }, size).x).toBeLessThan(0)
    expect(edgePan({ x: 200, y: 0 }, size).y).toBeGreaterThan(0)
    expect(edgePan({ x: 200, y: 300 }, size).y).toBeLessThan(0)
  })
})

describe('dragSelection', () => {
  it('keeps separate elements', () => {
    expect(dragSelection(['a', 'b'], () => undefined)).toEqual(['a', 'b'])
  })

  it('lets a swept group carry the nodes inside it', () => {
    const parent = (id: string) => (id === 'n1' || id === 'n2' ? 'group:a' : undefined)
    expect(dragSelection(['group:a', 'n1', 'n2'], parent)).toEqual(['group:a'])
  })

  it('lets an outer group carry an inner one', () => {
    const parent = (id: string) => (id === 'group:inner' ? 'group:outer' : undefined)
    expect(dragSelection(['group:outer', 'group:inner'], parent)).toEqual(['group:outer'])
  })
})
