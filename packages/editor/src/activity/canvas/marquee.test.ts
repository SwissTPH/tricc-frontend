import { describe, expect, it } from 'vitest'
import { dragSelection, pointerPastMarquee, rectsMeet, screenRect } from './marquee.js'

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
