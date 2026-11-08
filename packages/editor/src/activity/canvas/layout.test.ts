import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFERENCES, type Activity } from '@tricc/core'
import { H_GAP, V_GAP, autoLayout } from './layout.js'

/** A start with two children: one rank of two siblings below it. */
function branching(): Activity {
  const node = (id: string, type: string) => ({ id, type, ui: { x: 0, y: 0 } })
  const edge = (id: string, source: string, target: string) => ({ id, source, target })
  return {
    id: 'a',
    nodeOrder: ['start', 'left', 'right'],
    edgeOrder: ['e1', 'e2'],
    nodes: {
      start: node('start', 'activity_start'),
      left: node('left', 'note'),
      right: node('right', 'note'),
    },
    edges: { e1: edge('e1', 'start', 'left'), e2: edge('e2', 'start', 'right') },
  } as Activity
}

const SIZE = { width: 200, height: 64 }

/** The horizontal space between the two siblings, and the vertical one above them. */
function gaps(pos: Map<string, { x: number; y: number }>) {
  const start = pos.get('start')!
  const [first, second] = [pos.get('left')!, pos.get('right')!].sort((a, b) => a.x - b.x)
  expect(first!.y).toBe(second!.y)
  return { h: second!.x - (first!.x + SIZE.width), v: first!.y - (start.y + SIZE.height) }
}

describe('autoLayout', () => {
  it('defaults to half a node plus 8 between siblings, the preference default', () => {
    expect(H_GAP).toBe(SIZE.width / 2 + 8)
    expect(DEFAULT_PREFERENCES.nodeGap).toBe(H_GAP)
    expect(gaps(autoLayout(branching(), () => SIZE))).toEqual({ h: 108, v: V_GAP })
  })

  it('uses the gap it is given and keeps the vertical one', () => {
    expect(gaps(autoLayout(branching(), () => SIZE, 240))).toEqual({ h: 240, v: 64 })
  })
})
