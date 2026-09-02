import * as Y from 'yjs'
import type {
  Activity,
  CodeSystem,
  Concept,
  Intervention,
  Project,
  SelectOption,
  TriccEdge,
  TriccNode,
} from '../model/types.js'
import type { LocalizedText } from '../format/schema/localized.js'
import type { Expression } from '../format/schema/expression.js'
import {
  expressionFromY,
  expressionToY,
  localizedFromY,
  localizedToY,
  newText,
  setPlain,
  setScalar,
  syncOrder,
  updateExpression,
  updateLocalized,
} from './ytypes.js'

/**
 * Project ⇄ Y.Doc.
 *
 * Free-text fields are Y.Text (labels, hints, help, expressions, intents, CQL libraries,
 * concept definitions). Identity-keyed collections are Y.Map. Order is a Y.Array of ids.
 * `ui` values are plain scalars — last-write-wins on a position is acceptable and visible;
 * nothing semantic is a bare scalar two people plausibly edit at once (§3).
 */

/** Narrow, local escape hatch for writing a known-good key onto a typed object. */
function assign<T extends object>(target: T, key: string, value: unknown): void {
  ;(target as unknown as Record<string, unknown>)[key] = value
}

const LOCALIZED_NODE_KEYS = ['label', 'hint', 'help', 'constraintMessage'] as const
const EXPRESSION_NODE_KEYS = ['relevance', 'calculate', 'expression', 'constraint'] as const
const PLAIN_NODE_KEYS = [
  'name',
  'required',
  'default',
  'min',
  'max',
  'repeat',
  'instance',
  'reference',
  'link',
  'listName',
  'severity',
  'priority',
  'context',
  'period',
  'formId',
  'process',
  'save',
] as const

export function nodeToY(n: TriccNode): Y.Map<unknown> {
  const m = new Y.Map<unknown>()
  m.set('id', n.id)
  m.set('type', n.type)
  for (const k of PLAIN_NODE_KEYS) setScalar(m, k, n[k])
  for (const k of LOCALIZED_NODE_KEYS) if (n[k]) m.set(k, localizedToY(n[k] as LocalizedText))
  for (const k of EXPRESSION_NODE_KEYS) if (n[k]) m.set(k, expressionToY(n[k] as Expression))
  setPlain(m, 'concept', n.concept)
  setPlain(m, 'media', n.media)
  setPlain(m, 'ui', n.ui)
  if (n.notAvailable) {
    const na = new Y.Map<unknown>()
    setScalar(na, 'name', n.notAvailable.name)
    if (n.notAvailable.label) na.set('label', localizedToY(n.notAvailable.label))
    setPlain(na, 'concept', n.notAvailable.concept)
    m.set('notAvailable', na)
  }
  if (n.options) {
    const arr = new Y.Array<Y.Map<unknown>>()
    arr.insert(0, n.options.map(optionToY))
    m.set('options', arr)
  }
  return m
}

function optionToY(o: SelectOption): Y.Map<unknown> {
  const m = new Y.Map<unknown>()
  m.set('id', o.id)
  setScalar(m, 'name', o.name)
  if (o.label) m.set('label', localizedToY(o.label))
  setPlain(m, 'concept', o.concept)
  if (o.relevance) m.set('relevance', expressionToY(o.relevance))
  return m
}

function optionFromY(m: Y.Map<unknown>): SelectOption {
  const o: SelectOption = { id: m.get('id') as string }
  const name = m.get('name') as string | undefined
  if (name !== undefined) o.name = name
  const label = localizedFromY(m.get('label') as Y.Map<Y.Text> | undefined)
  if (label) o.label = label
  const concept = m.get('concept') as SelectOption['concept']
  if (concept) o.concept = structuredClone(concept)
  const rel = expressionFromY(m.get('relevance') as Y.Map<unknown> | undefined)
  if (rel) o.relevance = rel
  return o
}

export function nodeFromY(m: Y.Map<unknown>): TriccNode {
  const n: TriccNode = { id: m.get('id') as string, type: m.get('type') as TriccNode['type'] }
  for (const k of PLAIN_NODE_KEYS) {
    const v = m.get(k)
    if (v !== undefined) assign(n, k, v)
  }
  for (const k of LOCALIZED_NODE_KEYS) {
    const v = localizedFromY(m.get(k) as Y.Map<Y.Text> | undefined)
    if (v) assign(n, k, v)
  }
  for (const k of EXPRESSION_NODE_KEYS) {
    const v = expressionFromY(m.get(k) as Y.Map<unknown> | undefined)
    if (v) assign(n, k, v)
  }
  const concept = m.get('concept') as TriccNode['concept']
  if (concept) n.concept = structuredClone(concept)
  const media = m.get('media') as TriccNode['media']
  if (media) n.media = structuredClone(media)
  const ui = m.get('ui') as TriccNode['ui']
  if (ui) n.ui = structuredClone(ui)
  const naM = m.get('notAvailable') as Y.Map<unknown> | undefined
  if (naM) {
    const na: NonNullable<TriccNode['notAvailable']> = {}
    const nn = naM.get('name') as string | undefined
    if (nn !== undefined) na.name = nn
    const nl = localizedFromY(naM.get('label') as Y.Map<Y.Text> | undefined)
    if (nl) na.label = nl
    const nc = naM.get('concept') as TriccNode['concept']
    if (nc) na.concept = structuredClone(nc)
    n.notAvailable = na
  }
  const opts = m.get('options') as Y.Array<Y.Map<unknown>> | undefined
  if (opts) n.options = opts.toArray().map(optionFromY)
  return n
}

export function updateNodeY(m: Y.Map<unknown>, n: TriccNode): void {
  setScalar(m, 'type', n.type)
  for (const k of PLAIN_NODE_KEYS) setScalar(m, k, n[k])
  const detached = m.doc === null
  for (const k of LOCALIZED_NODE_KEYS) {
    const value = n[k] as LocalizedText | undefined
    const existing = detached ? undefined : (m.get(k) as Y.Map<Y.Text> | undefined)
    if (value) {
      if (existing) updateLocalized(existing, value)
      else m.set(k, localizedToY(value))
    } else if (existing) m.delete(k)
  }
  for (const k of EXPRESSION_NODE_KEYS) {
    const value = n[k] as Expression | undefined
    const existing = detached ? undefined : (m.get(k) as Y.Map<unknown> | undefined)
    if (value) {
      if (existing) updateExpression(existing, value)
      else m.set(k, expressionToY(value))
    } else if (existing) m.delete(k)
  }
  setPlain(m, 'concept', n.concept)
  setPlain(m, 'media', n.media)
  setPlain(m, 'ui', n.ui)
  if (n.notAvailable) {
    let na = m.doc === null ? undefined : (m.get('notAvailable') as Y.Map<unknown> | undefined)
    if (!na) {
      na = new Y.Map<unknown>()
      m.set('notAvailable', na)
    }
    setScalar(na, 'name', n.notAvailable.name)
    const existing = na.doc === null ? undefined : (na.get('label') as Y.Map<Y.Text> | undefined)
    if (n.notAvailable.label) {
      if (existing) updateLocalized(existing, n.notAvailable.label)
      else na.set('label', localizedToY(n.notAvailable.label))
    } else if (existing) na.delete('label')
    setPlain(na, 'concept', n.notAvailable.concept)
  } else if (!detached && m.has('notAvailable')) m.delete('notAvailable')

  if (n.options) {
    const arr = new Y.Array<Y.Map<unknown>>()
    arr.insert(0, n.options.map(optionToY))
    m.set('options', arr)
  } else if (!detached && m.has('options')) m.delete('options')
}

export function edgeToY(e: TriccEdge): Y.Map<unknown> {
  const m = new Y.Map<unknown>()
  m.set('id', e.id)
  m.set('source', e.source)
  m.set('target', e.target)
  setScalar(m, 'value', e.value)
  setPlain(m, 'ui', e.ui)
  return m
}

export function edgeFromY(m: Y.Map<unknown>): TriccEdge {
  const e: TriccEdge = {
    id: m.get('id') as string,
    source: m.get('source') as string,
    target: m.get('target') as string,
  }
  const value = m.get('value') as string | undefined
  if (value !== undefined) e.value = value
  const ui = m.get('ui') as TriccEdge['ui']
  if (ui) e.ui = structuredClone(ui)
  return e
}

export function activityToY(a: Activity): Y.Map<unknown> {
  const m = new Y.Map<unknown>()
  m.set('id', a.id)
  setScalar(m, 'process', a.process)
  if (a.title) m.set('title', localizedToY(a.title))
  if (a.applicability) m.set('applicability', expressionToY(a.applicability))
  setPlain(m, 'ui', a.ui)
  const nodes = new Y.Map<Y.Map<unknown>>()
  for (const id of a.nodeOrder) {
    const n = a.nodes[id]
    if (n) nodes.set(id, nodeToY(n))
  }
  m.set('nodes', nodes)
  const edges = new Y.Map<Y.Map<unknown>>()
  for (const id of a.edgeOrder) {
    const e = a.edges[id]
    if (e) edges.set(id, edgeToY(e))
  }
  m.set('edges', edges)
  const nodeOrder = new Y.Array<string>()
  nodeOrder.insert(0, [...a.nodeOrder])
  m.set('nodeOrder', nodeOrder)
  const edgeOrder = new Y.Array<string>()
  edgeOrder.insert(0, [...a.edgeOrder])
  m.set('edgeOrder', edgeOrder)
  return m
}

export function activityFromY(m: Y.Map<unknown>): Activity {
  const nodesY = m.get('nodes') as Y.Map<Y.Map<unknown>>
  const edgesY = m.get('edges') as Y.Map<Y.Map<unknown>>
  const nodes: Record<string, TriccNode> = {}
  for (const [id, ym] of nodesY.entries()) nodes[id] = nodeFromY(ym)
  const edges: Record<string, TriccEdge> = {}
  for (const [id, ym] of edgesY.entries()) edges[id] = edgeFromY(ym)

  // Order arrays are the authority, but must never hide an entry: anything present in the
  // map and missing from the order (a concurrent insert whose order entry was lost) is
  // appended in sorted id order so it stays deterministic and visible.
  const nodeOrder = reconcileOrder((m.get('nodeOrder') as Y.Array<string>).toArray(), nodes)
  const edgeOrder = reconcileOrder((m.get('edgeOrder') as Y.Array<string>).toArray(), edges)

  const a: Activity = { id: m.get('id') as string, nodes, edges, nodeOrder, edgeOrder }
  const title = localizedFromY(m.get('title') as Y.Map<Y.Text> | undefined)
  if (title) a.title = title
  const process = m.get('process') as string | undefined
  if (process !== undefined) a.process = process
  const app = expressionFromY(m.get('applicability') as Y.Map<unknown> | undefined)
  if (app) a.applicability = app
  const ui = m.get('ui') as Activity['ui']
  if (ui) a.ui = structuredClone(ui)
  return a
}

function reconcileOrder(order: string[], present: Record<string, unknown>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of order) {
    if (id in present && !seen.has(id)) {
      out.push(id)
      seen.add(id)
    }
  }
  for (const id of Object.keys(present).sort()) if (!seen.has(id)) out.push(id)
  return out
}

export function interventionToY(i: Intervention): Y.Map<unknown> {
  const m = new Y.Map<unknown>()
  m.set('id', i.id)
  setScalar(m, 'code', i.code)
  if (i.title) m.set('title', localizedToY(i.title))
  if (i.description) m.set('description', localizedToY(i.description))
  if (i.applicability) m.set('applicability', expressionToY(i.applicability))
  setPlain(m, 'trigger', i.trigger)
  const processes = new Y.Array<Y.Map<unknown>>()
  processes.insert(
    0,
    i.processes.map((pg) => {
      const pm = new Y.Map<unknown>()
      pm.set('process', pg.process)
      const acts = new Y.Array<Y.Map<unknown>>()
      acts.insert(
        0,
        pg.activities.map((r) => {
          const am = new Y.Map<unknown>()
          am.set('ref', r.ref)
          if (r.applicability) am.set('applicability', expressionToY(r.applicability))
          return am
        }),
      )
      pm.set('activities', acts)
      return pm
    }),
  )
  m.set('processes', processes)
  return m
}

export function interventionFromY(m: Y.Map<unknown>): Intervention {
  const i: Intervention = {
    id: m.get('id') as string,
    processes: (m.get('processes') as Y.Array<Y.Map<unknown>>).toArray().map((pm) => ({
      process: pm.get('process') as string,
      activities: (pm.get('activities') as Y.Array<Y.Map<unknown>>).toArray().map((am) => {
        const ref: { ref: string; applicability?: Expression } = { ref: am.get('ref') as string }
        const app = expressionFromY(am.get('applicability') as Y.Map<unknown> | undefined)
        if (app) ref.applicability = app
        return ref
      }),
    })),
  }
  const code = m.get('code') as string | undefined
  if (code !== undefined) i.code = code
  const title = localizedFromY(m.get('title') as Y.Map<Y.Text> | undefined)
  if (title) i.title = title
  const desc = localizedFromY(m.get('description') as Y.Map<Y.Text> | undefined)
  if (desc) i.description = desc
  const app = expressionFromY(m.get('applicability') as Y.Map<unknown> | undefined)
  if (app) i.applicability = app
  const trigger = m.get('trigger') as Intervention['trigger']
  if (trigger) i.trigger = structuredClone(trigger)
  return i
}

export function codeSystemToY(cs: CodeSystem): Y.Map<unknown> {
  const m = new Y.Map<unknown>()
  for (const k of [
    'id',
    'url',
    'version',
    'name',
    'title',
    'description',
    'status',
    'content',
    'caseSensitive',
  ] as const) {
    setScalar(m, k, cs[k])
  }
  const concepts = new Y.Map<Y.Map<unknown>>()
  for (const code of cs.conceptOrder) {
    const c = cs.concepts[code]
    if (c) concepts.set(code, conceptToY(c))
  }
  m.set('concepts', concepts)
  const order = new Y.Array<string>()
  order.insert(0, [...cs.conceptOrder])
  m.set('conceptOrder', order)
  return m
}

const CONCEPT_PLAIN = [
  'dataType',
  'conceptType',
  'unit',
  'source',
  'sourceVersion',
  'targetResource',
  'targetPath',
] as const

function conceptToY(c: Concept): Y.Map<unknown> {
  const m = new Y.Map<unknown>()
  m.set('system', c.system)
  m.set('code', c.code)
  setScalar(m, 'display', c.display)
  if (c.definition !== undefined) m.set('definition', newText(c.definition))
  m.set('designations', localizedToY(c.designations))
  for (const k of CONCEPT_PLAIN) setScalar(m, k, c[k])
  return m
}

function conceptFromY(m: Y.Map<unknown>): Concept {
  const c: Concept = {
    system: m.get('system') as string,
    code: m.get('code') as string,
    designations: localizedFromY(m.get('designations') as Y.Map<Y.Text> | undefined) ?? {},
  }
  const display = m.get('display') as string | undefined
  if (display !== undefined) c.display = display
  const def = m.get('definition') as Y.Text | undefined
  if (def) {
    const s = def.toString()
    if (s !== '') c.definition = s
  }
  for (const k of CONCEPT_PLAIN) {
    const v = m.get(k) as string | undefined
    if (v !== undefined) assign(c, k, v)
  }
  return c
}

export function codeSystemFromY(m: Y.Map<unknown>): CodeSystem {
  const conceptsY = m.get('concepts') as Y.Map<Y.Map<unknown>>
  const concepts: Record<string, Concept> = {}
  for (const [code, ym] of conceptsY.entries()) concepts[code] = conceptFromY(ym)
  const cs: CodeSystem = {
    id: m.get('id') as string,
    url: m.get('url') as string,
    status: (m.get('status') as CodeSystem['status']) ?? 'draft',
    content: (m.get('content') as CodeSystem['content']) ?? 'complete',
    concepts,
    conceptOrder: reconcileOrder((m.get('conceptOrder') as Y.Array<string>).toArray(), concepts),
  }
  for (const k of ['version', 'name', 'title', 'description', 'caseSensitive'] as const) {
    const v = m.get(k)
    if (v !== undefined) assign(cs, k, v)
  }
  return cs
}

// ---------------------------------------------------------------- whole project

export function projectToDoc(project: Project, doc: Y.Doc): void {
  doc.transact(() => {
    const meta = doc.getMap<unknown>('meta')
    for (const k of [
      'formatVersion',
      'id',
      'system',
      'code',
      'version',
      'mediaPath',
      'defaultCodeSystem',
    ] as const) {
      setScalar(meta, k, project[k])
    }
    const languages = doc.getMap<unknown>('languages')
    languages.set('default', project.languages.default)
    const avail = new Y.Array<string>()
    avail.insert(0, [...project.languages.available])
    languages.set('available', avail)

    if (project.title) updateLocalized(doc.getMap<Y.Text>('title'), project.title)
    if (project.description) updateLocalized(doc.getMap<Y.Text>('description'), project.description)

    const interventions = doc.getMap<Y.Map<unknown>>('interventions')
    for (const i of project.interventions) interventions.set(i.id, interventionToY(i))
    const iOrder = doc.getArray<string>('interventionOrder')
    syncOrder(
      iOrder,
      project.interventions.map((i) => i.id),
    )

    const activities = doc.getMap<Y.Map<unknown>>('activities')
    for (const id of Object.keys(project.activities).sort()) {
      const a = project.activities[id]
      if (a) activities.set(id, activityToY(a))
    }

    const codeSystems = doc.getMap<Y.Map<unknown>>('codeSystems')
    for (const url of Object.keys(project.codeSystems).sort()) {
      const cs = project.codeSystems[url]
      if (cs) codeSystems.set(url, codeSystemToY(cs))
    }

    const libraries = doc.getMap<Y.Text>('libraries')
    for (const name of Object.keys(project.libraries).sort()) {
      libraries.set(name, newText(project.libraries[name] as string))
    }

    const contexts = doc.getArray<unknown>('contexts')
    syncOrder(contexts as unknown as Y.Array<string>, [] as string[])
    if (project.contexts.length > 0)
      contexts.insert(
        0,
        project.contexts.map((c) => structuredClone(c)),
      )
  }, LOCAL_ORIGIN)
}

export const LOCAL_ORIGIN = Symbol.for('tricc.local')

export function projectFromDoc(doc: Y.Doc): Project {
  const meta = doc.getMap<unknown>('meta')
  const languages = doc.getMap<unknown>('languages')
  const interventionsY = doc.getMap<Y.Map<unknown>>('interventions')
  const iOrder = doc.getArray<string>('interventionOrder').toArray()
  const byId: Record<string, Intervention> = {}
  for (const [id, ym] of interventionsY.entries()) byId[id] = interventionFromY(ym)

  const activitiesY = doc.getMap<Y.Map<unknown>>('activities')
  const activities: Record<string, Activity> = {}
  for (const [id, ym] of activitiesY.entries()) activities[id] = activityFromY(ym)

  const codeSystemsY = doc.getMap<Y.Map<unknown>>('codeSystems')
  const codeSystems: Record<string, CodeSystem> = {}
  for (const [url, ym] of codeSystemsY.entries()) codeSystems[url] = codeSystemFromY(ym)

  const librariesY = doc.getMap<Y.Text>('libraries')
  const libraries: Record<string, string> = {}
  for (const [name, t] of librariesY.entries()) libraries[name] = t.toString()

  const project: Project = {
    formatVersion: meta.get('formatVersion') as string,
    id: meta.get('id') as string,
    languages: {
      default: (languages.get('default') as string) ?? 'en',
      available: (
        (languages.get('available') as Y.Array<string> | undefined)?.toArray() ?? []
      ).slice(),
    },
    interventions: reconcileOrder(iOrder, byId).map((id) => byId[id] as Intervention),
    contexts: doc
      .getArray<unknown>('contexts')
      .toArray()
      .map((c) => structuredClone(c)) as Project['contexts'],
    codeSystems,
    libraries,
    activities,
  }
  for (const k of ['system', 'code', 'version', 'mediaPath', 'defaultCodeSystem'] as const) {
    const v = meta.get(k)
    if (v !== undefined) assign(project, k, v)
  }
  const title = localizedFromY(doc.getMap<Y.Text>('title'))
  if (title) project.title = title
  const description = localizedFromY(doc.getMap<Y.Text>('description'))
  if (description) project.description = description
  return project
}
