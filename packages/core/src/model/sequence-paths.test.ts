import { describe, expect, it } from 'vitest'
import { sequencePaths } from './sequence-paths.js'
import type { Activity } from './types.js'

/** start → fever (yes) → calc, start → fever (no) → cough → calc, and a loop cough ↔ back. */
function activity(): Activity {
  return {
    id: 'a',
    nodeOrder: ['s', 'fever', 'cough', 'back', 'calc'],
    edgeOrder: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'],
    nodes: {
      s: { id: 's', type: 'activity_start', name: 'a' },
      fever: { id: 'fever', type: 'select_yesno', name: 'fever' },
      cough: { id: 'cough', type: 'select_yesno', name: 'cough' },
      back: { id: 'back', type: 'note', name: 'back' },
      calc: { id: 'calc', type: 'calculate', name: 'seen' },
    },
    edges: {
      e1: { id: 'e1', source: 's', target: 'fever' },
      e2: { id: 'e2', source: 'fever', target: 'calc', value: 'yes' },
      e3: { id: 'e3', source: 'fever', target: 'cough', value: 'no' },
      e4: { id: 'e4', source: 'cough', target: 'calc', value: 'yes' },
      e5: { id: 'e5', source: 'cough', target: 'back' },
      e6: { id: 'e6', source: 'back', target: 'cough' },
    },
  }
}

describe('sequencePaths', () => {
  it('lists every path from the start, the start first, loops left out', () => {
    expect(sequencePaths(activity(), 'calc')).toEqual({
      paths: [
        [{ nodeId: 's' }, { nodeId: 'fever', value: 'yes' }],
        [{ nodeId: 's' }, { nodeId: 'fever', value: 'no' }, { nodeId: 'cough', value: 'yes' }],
      ],
      more: false,
    })
  })

  it('stops at the limit and says there are more', () => {
    const result = sequencePaths(activity(), 'calc', 1)
    expect(result.paths).toHaveLength(1)
    expect(result.more).toBe(true)
  })

  it('finds nothing for a node nothing leads to', () => {
    expect(sequencePaths(activity(), 's')).toEqual({ paths: [], more: false })
  })
})
