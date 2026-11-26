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

/** A two-node flow `start → end` plus `n` unconnected nodes `d0…d(n-1)`. */
function withDangling(n: number, flow = true): Activity {
  const node = (id: string) => ({
    id,
    type: id === 'start' ? 'activity_start' : 'note',
    ui: { x: 0, y: 0 },
  })
  const dangling = Array.from({ length: n }, (_, i) => `d${i}`)
  const ids = [...(flow ? ['start', 'end'] : []), ...dangling]
  return {
    id: 'a',
    nodeOrder: ids,
    edgeOrder: flow ? ['e1'] : [],
    nodes: Object.fromEntries(ids.map((id) => [id, node(id)])),
    edges: flow ? { e1: { id: 'e1', source: 'start', target: 'end' } } : {},
  } as Activity
}

/** The distinct x and y values of the dangling nodes. */
function grid(pos: Map<string, { x: number; y: number }>, n: number) {
  const cells = Array.from({ length: n }, (_, i) => pos.get(`d${i}`)!)
  return {
    cells,
    cols: new Set(cells.map((c) => c.x)).size,
    rows: new Set(cells.map((c) => c.y)).size,
  }
}

describe('autoLayout: unconnected nodes', () => {
  it('packs 20 unconnected nodes in 5 columns × 4 rows right of the flow (#27)', () => {
    const pos = autoLayout(withDangling(20), () => SIZE)
    const { cells, cols, rows } = grid(pos, 20)
    expect({ cols, rows }).toEqual({ cols: 5, rows: 4 })
    const flowRight = Math.max(pos.get('start')!.x, pos.get('end')!.x) + SIZE.width
    for (const c of cells) expect(c.x).toBeGreaterThanOrEqual(flowRight + H_GAP)
  })

  it("puts the first row on the start node's line, one node gap right of the flow", () => {
    const pos = autoLayout(withDangling(4), () => SIZE)
    const start = pos.get('start')!
    expect(pos.get('d0')).toEqual({ x: start.x + SIZE.width + H_GAP, y: start.y })
    expect(pos.get('d1')!.y).toBe(start.y)
  })

  it('fills rows in node order with ceil(sqrt(n)) per row: 10 → 4 + 4 + 2', () => {
    const { cells } = grid(
      autoLayout(withDangling(10), () => SIZE),
      10,
    )
    const perRow = new Map<number, number>()
    for (const c of cells) perRow.set(c.y, (perRow.get(c.y) ?? 0) + 1)
    expect([...perRow.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1])).toEqual([4, 4, 2])
    expect(cells[0]!.x).toBeLessThan(cells[1]!.x)
    expect(cells[4]!.y).toBeGreaterThan(cells[3]!.y)
    // gaps: the node gap across, V_GAP down
    expect(cells[1]!.x - cells[0]!.x).toBe(SIZE.width + H_GAP)
    expect(cells[4]!.y - cells[0]!.y).toBe(SIZE.height + V_GAP)
  })

  it('starts the grid at the top margin when no node is connected', () => {
    const { cells, cols, rows } = grid(
      autoLayout(withDangling(4, false), () => SIZE),
      4,
    )
    expect({ cols, rows }).toEqual({ cols: 2, rows: 2 })
    expect(cells[0]).toEqual({ x: 24, y: 24 })
  })

  it('puts a single unconnected node beside the start node', () => {
    const pos = autoLayout(withDangling(1), () => SIZE)
    expect(pos.get('d0')!.y).toBe(pos.get('start')!.y)
  })

  it('never overlaps cells of different sizes', () => {
    const sizeOf = (id: string) =>
      id === 'd1' ? { width: 320, height: 140 } : id === 'd5' ? { width: 120, height: 200 } : SIZE
    const pos = autoLayout(withDangling(9), sizeOf)
    const boxes = Array.from({ length: 9 }, (_, i) => ({
      ...pos.get(`d${i}`)!,
      ...sizeOf(`d${i}`),
    }))
    for (const a of boxes)
      for (const b of boxes) {
        if (a === b) continue
        const apart =
          a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y
        expect(apart).toBe(true)
      }
  })
})
