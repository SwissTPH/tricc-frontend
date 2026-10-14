import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import {
  ProjectDocument,
  CapabilityError,
  READ_ONLY_CAPABILITIES,
  ALL_CAPABILITIES,
} from './doc.js'
import { projectFromDoc, projectToDoc } from './codec.js'
import { sampleProject, minimalActivity } from '../format/__fixtures__.js'
import { readProject, writeProject } from '../format/serialize/index.js'
import type { Project, TriccNode } from '../model/types.js'

function docOf(project = sampleProject()): ProjectDocument {
  return ProjectDocument.fromProject(project)
}

/** Two peers, connected so every update flows both ways. */
function connectedPair(project: Project): [ProjectDocument, ProjectDocument] {
  const a = ProjectDocument.fromProject(project)
  const b = ProjectDocument.fromDoc(new Y.Doc())
  Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc))
  a.doc.on('update', (u: Uint8Array, origin: unknown) => {
    if (origin !== 'sync') Y.applyUpdate(b.doc, u, 'sync')
  })
  b.doc.on('update', (u: Uint8Array, origin: unknown) => {
    if (origin !== 'sync') Y.applyUpdate(a.doc, u, 'sync')
  })
  return [a, b]
}

/** Two peers that diverge offline, then exchange. */
function divergedPair(project: Project): [ProjectDocument, ProjectDocument, () => void] {
  const a = ProjectDocument.fromProject(project)
  const b = ProjectDocument.fromDoc(new Y.Doc())
  Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc))
  const sync = () => {
    const sa = Y.encodeStateVector(a.doc)
    const sb = Y.encodeStateVector(b.doc)
    Y.applyUpdate(a.doc, Y.encodeStateAsUpdate(b.doc, sa), 'sync')
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc, sb), 'sync')
  }
  return [a, b, sync]
}

describe('projection', () => {
  it('project → doc → project is identity', () => {
    const original = sampleProject()
    expect(docOf(original).snapshot()).toEqual(original)
  })

  it('doc → files → doc round-trips', () => {
    const doc = docOf()
    const { project } = readProject(writeProject(doc.snapshot()))
    expect(project).toEqual(doc.snapshot())
  })

  it('converged peers write byte-identical files', () => {
    const [a, b] = connectedPair(sampleProject())
    a.transact((tx) => tx.moveNode('triage-danger-signs', 'n-weight', 999, 111))
    b.transact((tx) => tx.setActivityTitle('hp-cough', { en: 'Cough assessment' }))
    expect(writeProject(a.snapshot())).toEqual(writeProject(b.snapshot()))
  })

  it('memoizes the snapshot until the document changes', () => {
    const doc = docOf()
    const first = doc.snapshot()
    expect(doc.snapshot()).toBe(first)
    doc.transact((tx) => tx.moveNode('triage-danger-signs', 'n-weight', 1, 2))
    expect(doc.snapshot()).not.toBe(first)
  })
})

describe('convergence', () => {
  it('concurrent node creation keeps both nodes', () => {
    const [a, b, sync] = divergedPair(sampleProject())
    const mk = (id: string): TriccNode => ({ id, type: 'note', name: id, ui: { x: 0, y: 0 } })
    a.transact((tx) => tx.addNode('triage-danger-signs', mk('from_a')))
    b.transact((tx) => tx.addNode('triage-danger-signs', mk('from_b')))
    sync()
    const nodesA = a.snapshot().activities['triage-danger-signs']?.nodes ?? {}
    expect(Object.keys(nodesA)).toContain('from_a')
    expect(Object.keys(nodesA)).toContain('from_b')
    expect(a.snapshot()).toEqual(b.snapshot())
  })

  it('converges regardless of the order updates are applied', () => {
    const base = sampleProject()
    const src1 = ProjectDocument.fromProject(base)
    const src2 = ProjectDocument.fromProject(base)
    // Give both the same starting state, then produce one update each.
    const start = Y.encodeStateAsUpdate(src1.doc)
    const p1 = ProjectDocument.fromDoc(new Y.Doc())
    const p2 = ProjectDocument.fromDoc(new Y.Doc())
    Y.applyUpdate(p1.doc, start)
    Y.applyUpdate(p2.doc, start)
    p1.transact((tx) => tx.setActivityTitle('hp-cough', { en: 'One' }))
    p2.transact((tx) => tx.moveNode('triage-danger-signs', 'n-weight', 7, 7))
    const u1 = Y.encodeStateAsUpdate(p1.doc)
    const u2 = Y.encodeStateAsUpdate(p2.doc)

    const ab = new Y.Doc()
    Y.applyUpdate(ab, start)
    Y.applyUpdate(ab, u1)
    Y.applyUpdate(ab, u2)
    const ba = new Y.Doc()
    Y.applyUpdate(ba, start)
    Y.applyUpdate(ba, u2)
    Y.applyUpdate(ba, u1)

    expect(projectFromDoc(ab)).toEqual(projectFromDoc(ba))
    src2.destroy()
  })

  it('two authors editing one expression merge character-wise, losing nothing', () => {
    const [a, b, sync] = divergedPair(sampleProject())
    // Both edit the same relevance expression text concurrently.
    const textOf = (d: ProjectDocument) =>
      (
        (
          (d.doc.getMap('activities').get('triage-danger-signs') as Y.Map<unknown>).get(
            'nodes',
          ) as Y.Map<Y.Map<unknown>>
        )
          .get('n-convulsions')
          ?.get('relevance') as Y.Map<unknown>
      ).get('expression') as Y.Text

    a.transact(() => textOf(a).insert(0, 'true and '))
    b.transact(() => {
      const t = textOf(b)
      t.insert(t.length, ' and true')
    })
    sync()
    const merged = textOf(a).toString()
    expect(merged.startsWith('true and ')).toBe(true)
    expect(merged.endsWith(' and true')).toBe(true)
    expect(merged).toContain('AgeInMonths() < 60')
    expect(a.snapshot()).toEqual(b.snapshot())
  })

  it('delete versus edit of the same node converges', () => {
    const [a, b, sync] = divergedPair(sampleProject())
    a.transact((tx) => tx.removeNode('triage-danger-signs', 'n-score'))
    b.transact((tx) => tx.moveNode('triage-danger-signs', 'n-score', 5, 5))
    sync()
    expect(a.snapshot()).toEqual(b.snapshot())
  })

  it('offline divergence merges with no lost content', () => {
    const [a, b, sync] = divergedPair(sampleProject())
    a.transact((tx) => tx.addActivity(minimalActivity('offline-a')))
    b.transact((tx) => tx.addActivity(minimalActivity('offline-b')))
    sync()
    expect(Object.keys(a.snapshot().activities).sort()).toEqual([
      'hp-cough',
      'offline-a',
      'offline-b',
      'triage-danger-signs',
    ])
    expect(a.snapshot()).toEqual(b.snapshot())
  })
})

describe('undo', () => {
  it('reverses the local change', () => {
    const doc = docOf()
    doc.transact((tx) => tx.moveNode('triage-danger-signs', 'n-weight', 500, 500))
    expect(doc.snapshot().activities['triage-danger-signs']?.nodes['n-weight']?.ui?.x).toBe(500)
    doc.undo.undo()
    expect(doc.snapshot().activities['triage-danger-signs']?.nodes['n-weight']?.ui?.x).toBe(40)
  })

  it('spans project-level and node-level changes on one stack', () => {
    const doc = docOf()
    doc.transact((tx) => tx.setProjectTitle({ en: 'Renamed' }))
    doc.undo.breakGesture()
    doc.transact((tx) => tx.moveNode('triage-danger-signs', 'n-weight', 1, 1))

    doc.undo.undo()
    expect(doc.snapshot().activities['triage-danger-signs']?.nodes['n-weight']?.ui?.x).toBe(40)
    expect(doc.snapshot().title?.en).toBe('Renamed')

    doc.undo.undo()
    expect(doc.snapshot().title?.en).toBe('IMCI sick child')
  })

  it('coalesces a continuous gesture into one entry', () => {
    const doc = docOf()
    for (let x = 1; x <= 5; x++) {
      doc.transact((tx) => tx.moveNode('triage-danger-signs', 'n-weight', x * 10, 0))
    }
    doc.undo.undo()
    expect(doc.snapshot().activities['triage-danger-signs']?.nodes['n-weight']?.ui?.x).toBe(40)
    expect(doc.undo.canUndo).toBe(false)
  })

  it('never undoes a remote change', () => {
    const [a, b] = connectedPair(sampleProject())
    b.transact((tx) => tx.setActivityTitle('hp-cough', { en: 'Edited remotely' }))
    expect(a.snapshot().activities['hp-cough']?.title?.en).toBe('Edited remotely')

    a.undo.undo() // nothing local to undo
    expect(a.snapshot().activities['hp-cough']?.title?.en).toBe('Edited remotely')
    expect(a.undo.canUndo).toBe(false)
  })

  it('redo restores', () => {
    const doc = docOf()
    doc.transact((tx) => tx.moveNode('triage-danger-signs', 'n-weight', 77, 88))
    doc.undo.undo()
    doc.undo.redo()
    expect(doc.snapshot().activities['triage-danger-signs']?.nodes['n-weight']?.ui).toMatchObject({
      x: 77,
      y: 88,
    })
  })
})

describe('capabilities', () => {
  it('refuses mutation without project.write, at the document layer', () => {
    const doc = ProjectDocument.fromProject(sampleProject(), {
      capabilities: () => READ_ONLY_CAPABILITIES,
    })
    expect(() =>
      doc.transact((tx) => tx.moveNode('triage-danger-signs', 'n-weight', 1, 1)),
    ).toThrow(CapabilityError)
    expect(doc.snapshot().activities['triage-danger-signs']?.nodes['n-weight']?.ui?.x).toBe(40)
  })

  it('reading is always permitted', () => {
    const doc = ProjectDocument.fromProject(sampleProject(), {
      capabilities: () => READ_ONLY_CAPABILITIES,
    })
    expect(doc.read((p) => p.id)).toBe('smart-imci')
    expect(doc.can('project.write')).toBe(false)
  })

  it('a capability set can change at runtime', () => {
    let caps = READ_ONLY_CAPABILITIES
    const doc = ProjectDocument.fromProject(sampleProject(), { capabilities: () => caps })
    expect(doc.can('project.write')).toBe(false)
    caps = ALL_CAPABILITIES
    expect(doc.can('project.write')).toBe(true)
    doc.transact((tx) => tx.moveNode('triage-danger-signs', 'n-weight', 3, 3))
    expect(doc.snapshot().activities['triage-danger-signs']?.nodes['n-weight']?.ui?.x).toBe(3)
  })
})

describe('mutations', () => {
  it('deleting a node removes its edges atomically', () => {
    const doc = docOf()
    doc.transact((tx) => tx.removeNode('triage-danger-signs', 'n-convulsions'))
    const a = doc.snapshot().activities['triage-danger-signs']
    expect(a?.nodes['n-convulsions']).toBeUndefined()
    expect(Object.keys(a?.edges ?? {}).sort()).toEqual(['e1'])
    expect(a?.edgeOrder).toEqual(['e1'])
  })

  it('refuses an edge with a missing endpoint', () => {
    const doc = docOf()
    expect(() =>
      doc.transact((tx) =>
        tx.addEdge('triage-danger-signs', { id: 'x', source: 'n-start', target: 'nope' }),
      ),
    ).toThrow(/target does not exist/)
  })

  it('refuses duplicate ids', () => {
    const doc = docOf()
    expect(() => doc.transact((tx) => tx.addActivity(minimalActivity('hp-cough')))).toThrow(
      /already exists/,
    )
  })

  it('keeps node order stable across insertion and removal', () => {
    const doc = docOf()
    doc.transact((tx) => {
      tx.addNode('triage-danger-signs', { id: 'n-new', type: 'note', ui: { x: 0, y: 0 } })
      tx.removeNode('triage-danger-signs', 'n-score')
    })
    expect(doc.snapshot().activities['triage-danger-signs']?.nodeOrder).toEqual([
      'n-start',
      'n-weight',
      'n-convulsions',
      'n-severe',
      'n-end',
      'n-new',
    ])
  })

  it('upserts a concept and keeps it addressable', () => {
    const doc = docOf()
    const url = 'http://tricc.org/CodeSystem/tricc'
    doc.transact((tx) =>
      tx.upsertConcept(url, {
        system: url,
        code: 'fever',
        display: 'Fever',
        designations: [{ language: 'fr', value: 'Fièvre' }],
        dataType: 'boolean',
      }),
    )
    const cs = doc.snapshot().codeSystems[url]
    expect(cs?.concepts['fever']?.display).toBe('Fever')
    expect(cs?.conceptOrder).toEqual(['weight', 'date_of_birth', 'convulsions', 'severe_disease', 'fever'])
  })
})

describe('subscription', () => {
  it('fires on local and remote change', () => {
    const [a, b] = connectedPair(sampleProject())
    let count = 0
    const off = a.subscribe(() => count++)
    a.transact((tx) => tx.moveNode('triage-danger-signs', 'n-weight', 2, 2))
    const afterLocal = count
    expect(afterLocal).toBeGreaterThan(0)
    b.transact((tx) => tx.setActivityTitle('hp-cough', { en: 'Remote' }))
    expect(count).toBeGreaterThan(afterLocal)
    off()
  })
})

describe('no derived state in the document', () => {
  it('stores only the keys the model declares', () => {
    const doc = docOf()
    expect([...doc.doc.share.keys()].sort()).toEqual([
      'activities',
      'codeSystems',
      'contexts',
      'description',
      'images',
      'interventionOrder',
      'interventions',
      'languages',
      'libraries',
      'meta',
      'title',
    ])
  })
})

describe('comments', () => {
  it('adds, edits, keeps the viewport, and detaches from a deleted node', () => {
    const doc = docOf()
    const id = 'triage-danger-signs'
    const node = doc.snapshot().activities[id]!.nodeOrder[1]!
    doc.transact((tx) => tx.setComment(id, { id: 'c', text: 'Check', color: 'yellow', x: 1, y: 2, node }))
    doc.transact((tx) => tx.setActivityViewport(id, { x: 5, y: 5, zoom: 1 }))
    doc.transact((tx) => tx.setComment(id, { id: 'c', text: 'Checked', color: 'green', x: 1, y: 2, node }))
    expect(doc.snapshot().activities[id]!.ui).toEqual({
      viewport: { x: 5, y: 5, zoom: 1 },
      comments: [{ id: 'c', text: 'Checked', color: 'green', x: 1, y: 2, node }],
    })
    doc.transact((tx) => tx.removeNode(id, node))
    expect(doc.snapshot().activities[id]!.ui?.comments?.[0]).not.toHaveProperty('node')
    doc.transact((tx) => tx.removeComment(id, 'c'))
    expect(doc.snapshot().activities[id]!.ui).toEqual({ viewport: { x: 5, y: 5, zoom: 1 } })
  })
})

describe('groups', () => {
  it('puts a node in a group, and ungrouping keeps it where it is on screen', () => {
    const doc = docOf()
    const id = 'triage-danger-signs'
    const node = doc.snapshot().activities[id]!.nodeOrder[1]!
    doc.transact((tx) => tx.setGroup(id, { id: 'outer', name: 'triage', color: 'grey', x: 100, y: 100, width: 600, height: 400 }))
    doc.transact((tx) =>
      tx.setGroup(id, { id: 'danger', name: 'danger_signs', color: 'pink', x: 20, y: 30, width: 300, height: 200, parent: 'outer' }),
    )
    doc.transact((tx) => tx.setNodeGroup(id, node, 'danger', 10, 15))
    const inGroup = doc.snapshot().activities[id]!.nodes[node]!
    expect(inGroup.group).toBe('danger')
    expect(inGroup.ui).toMatchObject({ x: 10, y: 15 })

    doc.transact((tx) => tx.removeGroup(id, 'danger'))
    // Now in 'outer', at the same place on screen: 20+10, 30+15 relative to 'outer'.
    const lifted = doc.snapshot().activities[id]!.nodes[node]!
    expect(lifted.group).toBe('outer')
    expect(lifted.ui).toMatchObject({ x: 30, y: 45 })
    doc.transact((tx) => tx.removeGroup(id, 'outer'))
    const top = doc.snapshot().activities[id]!.nodes[node]!
    expect(top.group).toBeUndefined()
    expect(top.ui).toMatchObject({ x: 130, y: 145 })
    expect(doc.snapshot().activities[id]!.groups).toBeUndefined()
  })
})

