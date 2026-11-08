import { describe, expect, it } from 'vitest'
import type { Activity } from '@tricc/core'
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

describe('autoLayout', () => {
  it('puts 96px between siblings and keeps 64px between ranks', () => {
    expect(H_GAP).toBe(96)
    expect(V_GAP).toBe(64)
    const size = { width: 200, height: 64 }
    const pos = autoLayout(branching(), () => size)
    const start = pos.get('start')!
    const [first, second] = [pos.get('left')!, pos.get('right')!].sort((a, b) => a.x - b.x)

    // Horizontal: the gap between the two siblings' boxes.
    expect(second!.x - (first!.x + size.width)).toBe(96)
    // Vertical: unchanged, the gap from the start's box to the rank below.
    expect(first!.y).toBe(second!.y)
    expect(first!.y - (start.y + size.height)).toBe(64)
  })
})
