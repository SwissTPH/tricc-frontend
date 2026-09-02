import * as Y from 'yjs'
import type {
  Activity,
  Intervention,
  TriccEdge,
  TriccNode,
  Concept,
  CodeSystem,
} from '../model/types.js'
import {
  activityToY,
  codeSystemToY,
  edgeToY,
  interventionToY,
  nodeToY,
  updateNodeY,
} from './codec.js'
import { localizedToY, newText, setPlain, setScalar, updateLocalized } from './ytypes.js'
import type { LocalizedText } from '../format/schema/localized.js'

/**
 * The mutation surface, handed to `transact`.
 *
 * Every operation is scoped and named rather than exposing raw Y types — a caller cannot
 * reach the document except through these, which is what keeps undo coherent and the
 * structural rules (§3) enforceable in one place.
 */
export class Mutations {
  constructor(private readonly doc: Y.Doc) {}

  // ------------------------------------------------------------- activities

  private activities(): Y.Map<Y.Map<unknown>> {
    return this.doc.getMap<Y.Map<unknown>>('activities')
  }

  private activity(activityId: string): Y.Map<unknown> {
    const a = this.activities().get(activityId)
    if (!a) throw new Error(`no such activity: ${activityId}`)
    return a
  }

  addActivity(activity: Activity): void {
    if (this.activities().has(activity.id))
      throw new Error(`activity already exists: ${activity.id}`)
    this.activities().set(activity.id, activityToY(activity))
  }

  removeActivity(activityId: string): void {
    this.activities().delete(activityId)
  }

  setActivityTitle(activityId: string, title: LocalizedText): void {
    const a = this.activity(activityId)
    const existing = a.get('title') as Y.Map<Y.Text> | undefined
    if (existing) updateLocalized(existing, title)
    else a.set('title', localizedToY(title))
  }

  setActivityProcess(activityId: string, process: string | undefined): void {
    setScalar(this.activity(activityId), 'process', process)
  }

  setActivityViewport(activityId: string, viewport: { x: number; y: number; zoom: number }): void {
    setPlain(this.activity(activityId), 'ui', { viewport })
  }

  // ------------------------------------------------------------- nodes

  addNode(activityId: string, node: TriccNode): void {
    const a = this.activity(activityId)
    const nodes = a.get('nodes') as Y.Map<Y.Map<unknown>>
    if (nodes.has(node.id)) throw new Error(`node already exists: ${node.id}`)
    nodes.set(node.id, nodeToY(node))
    ;(a.get('nodeOrder') as Y.Array<string>).push([node.id])
  }

  updateNode(activityId: string, node: TriccNode): void {
    const nodes = this.activity(activityId).get('nodes') as Y.Map<Y.Map<unknown>>
    const existing = nodes.get(node.id)
    if (!existing) throw new Error(`no such node: ${node.id}`)
    updateNodeY(existing, node)
  }

  /** Position only — the common, high-frequency mutation during a drag. */
  moveNode(activityId: string, nodeId: string, x: number, y: number): void {
    const nodes = this.activity(activityId).get('nodes') as Y.Map<Y.Map<unknown>>
    const n = nodes.get(nodeId)
    if (!n) throw new Error(`no such node: ${nodeId}`)
    const ui = (n.get('ui') as { x: number; y: number } | undefined) ?? { x: 0, y: 0 }
    n.set('ui', { ...ui, x, y })
  }

  removeNode(activityId: string, nodeId: string): void {
    const a = this.activity(activityId)
    const nodes = a.get('nodes') as Y.Map<Y.Map<unknown>>
    nodes.delete(nodeId)
    removeFromOrder(a.get('nodeOrder') as Y.Array<string>, nodeId)

    // Edges referencing a deleted node cannot survive — a dangling endpoint is not a
    // state the format permits, so removal is atomic with the node.
    const edges = a.get('edges') as Y.Map<Y.Map<unknown>>
    const order = a.get('edgeOrder') as Y.Array<string>
    for (const [id, e] of [...edges.entries()]) {
      if (e.get('source') === nodeId || e.get('target') === nodeId) {
        edges.delete(id)
        removeFromOrder(order, id)
      }
    }
  }

  // ------------------------------------------------------------- edges

  addEdge(activityId: string, edge: TriccEdge): void {
    const a = this.activity(activityId)
    const nodes = a.get('nodes') as Y.Map<Y.Map<unknown>>
    if (!nodes.has(edge.source)) throw new Error(`edge source does not exist: ${edge.source}`)
    if (!nodes.has(edge.target)) throw new Error(`edge target does not exist: ${edge.target}`)
    const edges = a.get('edges') as Y.Map<Y.Map<unknown>>
    if (edges.has(edge.id)) throw new Error(`edge already exists: ${edge.id}`)
    edges.set(edge.id, edgeToY(edge))
    ;(a.get('edgeOrder') as Y.Array<string>).push([edge.id])
  }

  updateEdge(activityId: string, edge: TriccEdge): void {
    const edges = this.activity(activityId).get('edges') as Y.Map<Y.Map<unknown>>
    const existing = edges.get(edge.id)
    if (!existing) throw new Error(`no such edge: ${edge.id}`)
    setScalar(existing, 'source', edge.source)
    setScalar(existing, 'target', edge.target)
    setScalar(existing, 'value', edge.value)
    setPlain(existing, 'ui', edge.ui)
  }

  removeEdge(activityId: string, edgeId: string): void {
    const a = this.activity(activityId)
    ;(a.get('edges') as Y.Map<Y.Map<unknown>>).delete(edgeId)
    removeFromOrder(a.get('edgeOrder') as Y.Array<string>, edgeId)
  }

  // ------------------------------------------------------------- interventions

  addIntervention(intervention: Intervention): void {
    const m = this.doc.getMap<Y.Map<unknown>>('interventions')
    if (m.has(intervention.id)) throw new Error(`intervention already exists: ${intervention.id}`)
    m.set(intervention.id, interventionToY(intervention))
    this.doc.getArray<string>('interventionOrder').push([intervention.id])
  }

  updateIntervention(intervention: Intervention): void {
    const m = this.doc.getMap<Y.Map<unknown>>('interventions')
    if (!m.has(intervention.id)) throw new Error(`no such intervention: ${intervention.id}`)
    m.set(intervention.id, interventionToY(intervention))
  }

  removeIntervention(id: string): void {
    this.doc.getMap<Y.Map<unknown>>('interventions').delete(id)
    removeFromOrder(this.doc.getArray<string>('interventionOrder'), id)
  }

  // ------------------------------------------------------------- terminology

  addCodeSystem(cs: CodeSystem): void {
    const m = this.doc.getMap<Y.Map<unknown>>('codeSystems')
    if (m.has(cs.url)) throw new Error(`code system already exists: ${cs.url}`)
    m.set(cs.url, codeSystemToY(cs))
  }

  upsertConcept(systemUrl: string, concept: Concept): void {
    const cs = this.doc.getMap<Y.Map<unknown>>('codeSystems').get(systemUrl)
    if (!cs) throw new Error(`no such code system: ${systemUrl}`)
    const concepts = cs.get('concepts') as Y.Map<Y.Map<unknown>>
    const isNew = !concepts.has(concept.code)
    const m = new Y.Map<unknown>()
    m.set('system', concept.system)
    m.set('code', concept.code)
    setScalar(m, 'display', concept.display)
    if (concept.definition !== undefined) m.set('definition', newText(concept.definition))
    m.set('designations', localizedToY(concept.designations))
    for (const k of [
      'dataType',
      'conceptType',
      'unit',
      'source',
      'sourceVersion',
      'targetResource',
      'targetPath',
    ] as const) {
      setScalar(m, k, concept[k])
    }
    concepts.set(concept.code, m)
    if (isNew) (cs.get('conceptOrder') as Y.Array<string>).push([concept.code])
  }

  removeConcept(systemUrl: string, code: string): void {
    const cs = this.doc.getMap<Y.Map<unknown>>('codeSystems').get(systemUrl)
    if (!cs) throw new Error(`no such code system: ${systemUrl}`)
    ;(cs.get('concepts') as Y.Map<Y.Map<unknown>>).delete(code)
    removeFromOrder(cs.get('conceptOrder') as Y.Array<string>, code)
  }

  // ------------------------------------------------------------- libraries & meta

  setLibrary(name: string, source: string): void {
    const libs = this.doc.getMap<Y.Text>('libraries')
    const existing = libs.get(name)
    if (existing) {
      const current = existing.toString()
      if (current !== source) {
        existing.delete(0, current.length)
        if (source) existing.insert(0, source)
      }
    } else {
      libs.set(name, newText(source))
    }
  }

  removeLibrary(name: string): void {
    this.doc.getMap<Y.Text>('libraries').delete(name)
  }

  setProjectTitle(title: LocalizedText): void {
    updateLocalized(this.doc.getMap<Y.Text>('title'), title)
  }

  setMeta(
    key: 'system' | 'code' | 'version' | 'mediaPath' | 'defaultCodeSystem',
    value: string | undefined,
  ): void {
    setScalar(this.doc.getMap<unknown>('meta'), key, value)
  }
}

function removeFromOrder(arr: Y.Array<string>, id: string): void {
  const idx = arr.toArray().indexOf(id)
  if (idx >= 0) arr.delete(idx, 1)
}
