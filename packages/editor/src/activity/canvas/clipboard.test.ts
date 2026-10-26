import { createProject, type Activity, type Project } from '@tricc/core'
import { describe, expect, it } from 'vitest'
import { pasteShift, planPaste, selectionSnapshot, type CanvasClipboard } from './clipboard.js'

function activity(patch: Partial<Activity> & Pick<Activity, 'id'>): Activity {
  return {
    nodeOrder: [],
    edgeOrder: [],
    nodes: {},
    edges: {},
    ...patch,
  }
}

function projectWithWeight(): Project {
  const project = createProject({ id: 'p' })
  project.defaultCodeSystem = 'http://example/cs'
  project.codeSystems['http://example/cs'] = {
    id: 'cs',
    url: 'http://example/cs',
    status: 'active',
    content: 'complete',
    concepts: { weight: { system: 'http://example/cs', code: 'weight', designations: [] } },
    conceptOrder: ['weight'],
  }
  return project
}

describe('selectionSnapshot', () => {
  const source = activity({
    id: 'a',
    groups: [{ id: 'box', name: 'signs', color: 'grey', x: 100, y: 40, width: 300, height: 200 }],
    nodeOrder: ['outside', 'inside', 'alone'],
    edgeOrder: ['keep', 'drop'],
    nodes: {
      outside: { id: 'outside', type: 'note', ui: { x: 0, y: 0 } },
      inside: { id: 'inside', type: 'integer', name: 'weight', group: 'box', ui: { x: 10, y: 12 } },
      alone: { id: 'alone', type: 'note', ui: { x: 400, y: 40 } },
    },
    edges: {
      keep: { id: 'keep', source: 'inside', target: 'alone' },
      drop: { id: 'drop', source: 'outside', target: 'inside' },
    },
    ui: { comments: [{ id: 'c1', text: 'check', color: 'yellow', x: 8, y: 9, node: 'inside' }] },
  })

  it('copies a group together with the nodes it carries, and only the arrows inside the selection', () => {
    const snap = selectionSnapshot(source, ['group:box', 'alone', 'comment:c1'])
    expect(snap.groups.map((item) => item.group.id)).toEqual(['box'])
    expect(snap.nodes.map((item) => item.node.id)).toEqual(['inside', 'alone'])
    expect(snap.edges.map((edge) => edge.id)).toEqual(['keep'])
    expect(snap.comments.map((comment) => comment.id)).toEqual(['c1'])
    expect(snap.nodes[0]?.pageX).toBe(110)
    expect(snap.nodes[0]?.pageY).toBe(52)
  })
})

describe('planPaste', () => {
  const project = projectWithWeight()
  const source = activity({
    id: 'a',
    nodeOrder: ['n-integer', 'n-note'],
    edgeOrder: ['e-n-integer-n-note', 'e-out'],
    nodes: {
      'n-integer': { id: 'n-integer', type: 'integer', name: 'weight', ui: { x: 40, y: 40 } },
      'n-note': { id: 'n-note', type: 'note', ui: { x: 40, y: 160 } },
      other: { id: 'other', type: 'note', ui: { x: 0, y: 0 } },
    },
    edges: {
      'e-n-integer-n-note': { id: 'e-n-integer-n-note', source: 'n-integer', target: 'n-note', value: 'yes' },
      'e-out': { id: 'e-out', source: 'n-integer', target: 'other' },
    },
    ui: { comments: [{ id: 'c1', text: 'check', color: 'yellow', x: 1, y: 2, node: 'n-integer' }] },
  })

  const copied = (): CanvasClipboard => ({
    fromActivityId: 'a',
    cut: false,
    ...selectionSnapshot(source, ['n-integer', 'n-note', 'comment:c1']),
  })

  it('gives a copy new ids, keeps the concept, and rewrites the arrow between the copies', () => {
    const plan = planPaste(copied(), source, project, 32)
    expect(plan.nodes.map((node) => node.id)).toEqual(['n-integer-2', 'n-note-2'])
    const integer = plan.nodes[0]!
    expect(integer.name).toBe('weight_2')
    expect(integer.concept).toEqual({ system: 'http://example/cs', code: 'weight' })
    expect(integer.ui).toMatchObject({ x: 72, y: 72 })
    expect(plan.edges).toEqual([
      expect.objectContaining({
        id: 'e-n-integer-2-n-note-2',
        source: 'n-integer-2',
        target: 'n-note-2',
        value: 'yes',
      }),
    ])
    expect(plan.comments[0]).toMatchObject({ id: 'c1-2', node: 'n-integer-2', x: 33, y: 34 })
    expect(plan.select).toEqual(['n-integer-2', 'n-note-2', 'comment:c1-2'])
  })

  it('reuses ids when a cut is pasted back into the same activity', () => {
    const home = activity({
      id: 'a',
      nodeOrder: ['other'],
      edgeOrder: [],
      nodes: { other: { id: 'other', type: 'note', ui: { x: 0, y: 0 } } },
      edges: {},
    })
    const plan = planPaste({ ...copied(), cut: true }, home, project, 0)
    expect(plan.nodes.map((node) => node.id)).toEqual(['n-integer', 'n-note'])
    expect(plan.nodes[0]?.name).toBe('weight')
    expect(plan.nodes[0]?.concept).toBeUndefined()
    expect(plan.edges[0]?.id).toBe('e-n-integer-n-note')
    expect(plan.nodes[0]?.ui).toMatchObject({ x: 40, y: 40 })
  })

  it('reuses a free id when pasting into another activity', () => {
    const other = activity({ id: 'b', nodeOrder: ['start'], nodes: { start: { id: 'start', type: 'activity_start', ui: { x: 0, y: 0 } } } })
    const plan = planPaste(copied(), other, project, 0)
    expect(plan.nodes.map((node) => node.id)).toEqual(['n-integer', 'n-note'])
    expect(plan.comments[0]?.node).toBe('n-integer')
  })

  it('drops a comment link that points at a node the other activity does not have', () => {
    const other = activity({ id: 'b' })
    const clip = copied()
    clip.nodes = []
    clip.edges = []
    const plan = planPaste(clip, other, project, 0)
    expect(plan.comments[0]?.node).toBeUndefined()
  })

  it('keeps a node in its group when the group itself was not copied', () => {
    const grouped = activity({
      id: 'a',
      groups: [{ id: 'box', color: 'grey', x: 100, y: 50, width: 200, height: 200 }],
      nodeOrder: ['q'],
      nodes: { q: { id: 'q', type: 'note', group: 'box', ui: { x: 8, y: 10 } } },
    })
    const clip: CanvasClipboard = { fromActivityId: 'a', cut: false, ...selectionSnapshot(grouped, ['q']) }
    const plan = planPaste(clip, grouped, project, 32)
    expect(plan.nodes[0]).toMatchObject({ id: 'q-2', group: 'box', ui: { x: 40, y: 42 } })
  })

  it('lifts a node out of a group the target activity does not have', () => {
    const grouped = activity({
      id: 'a',
      groups: [{ id: 'box', color: 'grey', x: 100, y: 50, width: 200, height: 200 }],
      nodeOrder: ['q'],
      nodes: { q: { id: 'q', type: 'note', group: 'box', ui: { x: 8, y: 10 } } },
    })
    const clip: CanvasClipboard = { fromActivityId: 'a', cut: true, ...selectionSnapshot(grouped, ['q']) }
    const plan = planPaste(clip, activity({ id: 'b' }), project, 0)
    expect(plan.nodes[0]?.group).toBeUndefined()
    expect(plan.nodes[0]?.ui).toMatchObject({ x: 108, y: 60 })
  })

  it('selects a copied group and not the nodes it carries', () => {
    const grouped = activity({
      id: 'a',
      groups: [{ id: 'box', color: 'grey', x: 10, y: 10, width: 200, height: 200 }],
      nodeOrder: ['q'],
      nodes: { q: { id: 'q', type: 'note', group: 'box', ui: { x: 8, y: 10 } } },
    })
    const clip: CanvasClipboard = { fromActivityId: 'a', cut: false, ...selectionSnapshot(grouped, ['group:box']) }
    const plan = planPaste(clip, grouped, project, 32)
    expect(plan.groups[0]).toMatchObject({ id: 'box-2', x: 42, y: 42 })
    expect(plan.nodes[0]).toMatchObject({ id: 'q-2', group: 'box-2', ui: { x: 8, y: 10 } })
    expect(plan.select).toEqual(['group:box-2'])
  })
})

describe('pasteShift', () => {
  const copy = { cut: false, fromActivityId: 'a' }
  const cut = { cut: true, fromActivityId: 'a' }

  it('steps copies in the same activity and lands a cut back where it was', () => {
    expect(pasteShift(copy, 'a', 0)).toBe(32)
    expect(pasteShift(copy, 'a', 1)).toBe(64)
    expect(pasteShift(cut, 'a', 0)).toBe(0)
    expect(pasteShift(cut, 'a', 1)).toBe(32)
    expect(pasteShift(copy, 'b', 0)).toBe(0)
    expect(pasteShift(cut, 'b', 0)).toBe(0)
  })
})
