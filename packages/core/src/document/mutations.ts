import * as Y from 'yjs'
import type {
  Activity,
  ActivityParam,
  Project,
  ActivityUi,
  CanvasComment,
  CanvasGroup,
  NodeUi,
  Intervention,
  TriccEdge,
  TriccNode,
  Concept,
  CodeSystem,
  ProjectImage,
  ProjectRepository,
} from '../model/types.js'
import { uniqueImageId } from '../model/types.js'
import {
  activityToY,
  codeSystemToY,
  conceptFromY,
  conceptToY,
  imageToY,
  edgeToY,
  interventionToY,
  nodeToY,
  projectFromDoc,
  updateNodeY,
} from './codec.js'
import { syncedParamConcepts, syncedParams, paramConceptCode } from '../params/sync.js'
import { coerceArg, planParamRename } from '../params/rename.js'
import { calculateCodeSystem } from '../terminology/dictionaries.js'
import {
  expressionToY,
  localizedToY,
  newText,
  setPlain,
  setScalar,
  updateLocalized,
} from './ytypes.js'
import type { Expression } from '../format/schema/expression.js'
import { designationText, retargetImage, withDesignationText } from '../text/message.js'
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
    if (activity.params?.length || Object.values(activity.nodes).some(isCall)) this.syncParams()
  }

  removeActivity(activityId: string): void {
    this.activities().delete(activityId)
  }

  /**
   * Delete an activity and take it off every intervention that lists it. Links to it
   * from other activities stay, so they show as missing and an undo restores them.
   */
  deleteActivity(activityId: string): void {
    const before = projectFromDoc(this.doc)
    for (const iv of this.doc.getMap<Y.Map<unknown>>('interventions').values()) {
      const refs = iv.get('activities') as Y.Array<Y.Map<unknown>> | undefined
      if (!refs) continue
      for (let i = refs.length - 1; i >= 0; i--) {
        if (refs.get(i).get('ref') === activityId) refs.delete(i, 1)
      }
    }
    this.removeActivity(activityId)
    this.syncParams(before)
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

  /** The name is part of each parameter concept's code: those concepts move with it. */
  setActivityName(activityId: string, name: string | undefined): void {
    const before = projectFromDoc(this.doc).activities[activityId]
    setScalar(this.activity(activityId), 'name', name)
    if (!before?.params?.length) return
    for (const p of before.params) {
      this.moveParamConcept(
        paramConceptCode(before, p.name),
        paramConceptCode({ id: activityId, name }, p.name),
      )
    }
    this.syncParams()
  }

  // ------------------------------------------------------------- parameters

  /** Replace a page's parameter rows, then bring computed rows and concepts up to date. */
  setActivityParams(activityId: string, params: ActivityParam[] | undefined): void {
    setPlain(this.activity(activityId), 'params', params?.length ? params : undefined)
    this.syncParams()
  }

  /**
   * Change one declared parameter. A new name follows through the call chain (§5.3); a new type
   * keeps the values set at calls where nothing is lost, and clears the others.
   */
  updateParam(activityId: string, name: string, next: ActivityParam): void {
    let project = projectFromDoc(this.doc)
    const before = project
    const activity = project.activities[activityId]
    const current = activity?.params?.find((p) => p.name === name)
    if (!activity || !current) throw new Error(`no such parameter: ${activityId}.${name}`)
    if (next.name !== name) {
      this.moveParamConcept(paramConceptCode(activity, name), paramConceptCode(activity, next.name))
      const plan = planParamRename(project, activityId, name, next.name)
      for (const page of plan.activities) {
        if (page.params) setPlain(this.activity(page.id), 'params', page.params)
        for (const node of page.nodes) this.updateNodeOnly(page.id, node)
        for (const edge of page.edges) this.updateEdge(page.id, edge)
      }
      for (const iv of plan.interventions) this.updateIntervention(iv)
      project = projectFromDoc(this.doc)
    }
    const rows = (project.activities[activityId]!.params ?? []).map((p) =>
      p.name === next.name ? next : p,
    )
    setPlain(this.activity(activityId), 'params', rows)
    if (next.type !== current.type) {
      for (const caller of Object.values(project.activities)) {
        for (const node of Object.values(caller.nodes)) {
          if (!isCall(node) || node.link !== activityId || node.args?.[next.name] === undefined)
            continue
          const args = { ...node.args }
          const value = coerceArg(args[next.name]!, next.type)
          if (value === undefined) delete args[next.name]
          else args[next.name] = value
          this.updateNodeOnly(caller.id, {
            ...node,
            args: Object.keys(args).length ? args : undefined,
          } as TriccNode)
        }
      }
    }
    this.syncParams(before)
  }

  /** Remove a parameter row. Values set for it at calls stay and are flagged until cleared. */
  removeParam(activityId: string, name: string): void {
    const before = projectFromDoc(this.doc)
    const activity = before.activities[activityId]
    if (!activity) throw new Error(`no such activity: ${activityId}`)
    const rows = (activity.params ?? []).filter((p) => p.name !== name)
    setPlain(this.activity(activityId), 'params', rows.length ? rows : undefined)
    this.syncParams(before)
  }

  /**
   * Bring every page's computed parameter rows, and the calculate dictionary's parameter
   * concepts, in line with the call graph. Runs inside the transaction that changed it.
   */
  syncParams(before?: Project): void {
    let project = projectFromDoc(this.doc)
    const rows = syncedParams(project, before)
    for (const [id, params] of rows) setPlain(this.activity(id), 'params', params)
    if (rows.size > 0) project = projectFromDoc(this.doc)
    const concepts = syncedParamConcepts(project)
    if (concepts.createDefault) {
      this.addCodeSystem(concepts.createDefault)
      this.setMeta('defaultCodeSystem', concepts.createDefault.url)
    }
    if (concepts.create) this.addCodeSystem(concepts.create)
    for (const concept of concepts.upserts) this.upsertConcept(concepts.system, concept)
    for (const code of concepts.removes) this.removeConcept(concepts.system, code)
    // Texts from a drawing are on the concepts now: the rows keep codes only.
    for (const activity of Object.values(project.activities)) {
      if (!activity.params?.some((p) => p.label || p.description)) continue
      setPlain(
        this.activity(activity.id),
        'params',
        activity.params.map(({ label: _l, description: _d, ...rest }) => rest),
      )
    }
  }

  /** Give a parameter concept a new code, keeping its texts. */
  private moveParamConcept(from: string, to: string): void {
    if (from === to) return
    const cs = calculateCodeSystem(projectFromDoc(this.doc))
    const concept = cs?.concepts[from]
    if (!cs || !concept || cs.concepts[to]) return
    this.removeConcept(cs.url, from)
    this.upsertConcept(cs.url, { ...concept, code: to })
  }

  setActivityApplicability(activityId: string, applicability: Expression | undefined): void {
    const a = this.activity(activityId)
    if (applicability) a.set('applicability', expressionToY(applicability))
    else a.delete('applicability')
  }

  setActivityViewport(activityId: string, viewport: { x: number; y: number; zoom: number }): void {
    const a = this.activity(activityId)
    setPlain(a, 'ui', { ...((a.get('ui') as ActivityUi | undefined) ?? {}), viewport })
  }

  /** Add or replace a comment on the diagram (matched by id). */
  setComment(activityId: string, comment: CanvasComment): void {
    const a = this.activity(activityId)
    const ui = (a.get('ui') as ActivityUi | undefined) ?? {}
    const comments = [...(ui.comments ?? [])]
    const at = comments.findIndex((c) => c.id === comment.id)
    if (at >= 0) comments[at] = { ...comment }
    else comments.push({ ...comment })
    setPlain(a, 'ui', { ...ui, comments })
  }

  /** Add or replace a page group (matched by id). */
  setGroup(activityId: string, group: CanvasGroup): void {
    const a = this.activity(activityId)
    const groups = [...((a.get('groups') as CanvasGroup[] | undefined) ?? [])]
    const at = groups.findIndex((g) => g.id === group.id)
    if (at >= 0) groups[at] = { ...group }
    else groups.push({ ...group })
    setPlain(a, 'groups', groups)
  }

  /**
   * Remove a group, keeping what was in it where it is on screen: its nodes and inner groups
   * move to the group's own parent, with their positions made relative to that.
   */
  removeGroup(activityId: string, groupId: string): void {
    const a = this.activity(activityId)
    const all = (a.get('groups') as CanvasGroup[] | undefined) ?? []
    const group = all.find((g) => g.id === groupId)
    if (!group) return
    const nodes = a.get('nodes') as Y.Map<Y.Map<unknown>>
    for (const n of nodes.values()) {
      if (n.get('group') !== groupId) continue
      const ui = (n.get('ui') as NodeUi | undefined) ?? { x: 0, y: 0 }
      n.set('ui', { ...ui, x: ui.x + group.x, y: ui.y + group.y })
      setScalar(n, 'group', group.parent)
    }
    const groups = all
      .filter((g) => g.id !== groupId)
      .map((g) => {
        if (g.parent !== groupId) return g
        const next: CanvasGroup = { ...g, x: g.x + group.x, y: g.y + group.y }
        if (group.parent) next.parent = group.parent
        else delete next.parent
        return next
      })
    setPlain(a, 'groups', groups.length ? groups : undefined)
  }

  /** Put a node in a group (or none), at a position relative to it. */
  setNodeGroup(
    activityId: string,
    nodeId: string,
    group: string | undefined,
    x: number,
    y: number,
  ): void {
    const nodes = this.activity(activityId).get('nodes') as Y.Map<Y.Map<unknown>>
    const n = nodes.get(nodeId)
    if (!n) throw new Error(`no such node: ${nodeId}`)
    n.set('ui', { ...((n.get('ui') as NodeUi | undefined) ?? { x: 0, y: 0 }), x, y })
    setScalar(n, 'group', group)
  }

  removeComment(activityId: string, commentId: string): void {
    const a = this.activity(activityId)
    const ui = (a.get('ui') as ActivityUi | undefined) ?? {}
    const comments = (ui.comments ?? []).filter((c) => c.id !== commentId)
    const next: ActivityUi = { ...ui, comments }
    if (comments.length === 0) delete next.comments
    setPlain(a, 'ui', Object.keys(next).length ? next : undefined)
  }

  // ------------------------------------------------------------- nodes

  addNode(activityId: string, node: TriccNode): void {
    const a = this.activity(activityId)
    const nodes = a.get('nodes') as Y.Map<Y.Map<unknown>>
    if (nodes.has(node.id)) throw new Error(`node already exists: ${node.id}`)
    nodes.set(node.id, nodeToY(node))
    ;(a.get('nodeOrder') as Y.Array<string>).push([node.id])
    if (isCall(node)) this.syncParams()
  }

  updateNode(activityId: string, node: TriccNode): void {
    const nodes = this.activity(activityId).get('nodes') as Y.Map<Y.Map<unknown>>
    const existing = nodes.get(node.id)
    if (!existing) throw new Error(`no such node: ${node.id}`)
    const wasCall = isCallType(existing.get('type'))
    const before = wasCall || isCall(node) ? projectFromDoc(this.doc) : undefined
    updateNodeY(existing, node)
    // What a call sets, or where it goes, changes the parameters of the page holding it.
    if (before) this.syncParams(before)
  }

  /** `updateNode` without the parameter sync: for a caller that syncs once at the end. */
  private updateNodeOnly(activityId: string, node: TriccNode): void {
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
    const before = isCallType(nodes.get(nodeId)?.get('type')) ? projectFromDoc(this.doc) : undefined
    nodes.delete(nodeId)
    removeFromOrder(a.get('nodeOrder') as Y.Array<string>, nodeId)
    if (before) this.syncParams(before)

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

    // A comment about the node stays on the diagram; it is just no longer about anything.
    const ui = a.get('ui') as ActivityUi | undefined
    if (ui?.comments?.some((c) => c.node === nodeId)) {
      setPlain(a, 'ui', {
        ...ui,
        comments: ui.comments.map((c) => {
          if (c.node !== nodeId) return c
          const { node: _node, ...rest } = c
          return rest
        }),
      })
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
    const m = conceptToY(concept)
    concepts.set(concept.code, m)
    if (isNew) (cs.get('conceptOrder') as Y.Array<string>).push([concept.code])
  }

  removeConcept(systemUrl: string, code: string): void {
    const cs = this.doc.getMap<Y.Map<unknown>>('codeSystems').get(systemUrl)
    if (!cs) throw new Error(`no such code system: ${systemUrl}`)
    ;(cs.get('concepts') as Y.Map<Y.Map<unknown>>).delete(code)
    removeFromOrder(cs.get('conceptOrder') as Y.Array<string>, code)
  }

  // ------------------------------------------------------------- images

  private images(): Y.Map<Y.Map<unknown>> {
    return this.doc.getMap<Y.Map<unknown>>('images')
  }

  /**
   * Add an image. With `unique`, a taken id gets a free suffix instead of failing.
   * Returns the id it was stored under.
   */
  addImage(image: ProjectImage, opts: { unique?: boolean } = {}): string {
    const taken = new Set(this.images().keys())
    if (taken.has(image.id) && !opts.unique) throw new Error(`image already exists: ${image.id}`)
    const id = uniqueImageId(image.id, taken)
    this.images().set(id, imageToY({ ...image, id }))
    return id
  }

  /** New bytes under the same id: every text showing it shows the new picture. */
  replaceImage(image: ProjectImage): void {
    if (!this.images().has(image.id)) throw new Error(`no such image: ${image.id}`)
    this.images().set(image.id, imageToY(image))
  }

  /** Rename an image and every picture that shows it, in one step. */
  renameImage(from: string, to: string): void {
    if (from === to) return
    const m = this.images().get(from)
    if (!m) throw new Error(`no such image: ${from}`)
    if (this.images().has(to)) throw new Error(`image already exists: ${to}`)
    const image = { id: to, contentType: m.get('contentType'), data: m.get('data') } as ProjectImage
    this.images().delete(from)
    this.images().set(to, imageToY(image))
    this.retargetImages(from, to)
  }

  /** Delete an image and take its pictures out of every text. */
  removeImage(id: string): void {
    this.images().delete(id)
    this.retargetImages(id, undefined)
  }

  private retargetImages(from: string, to: string | undefined): void {
    for (const cs of this.doc.getMap<Y.Map<unknown>>('codeSystems').values()) {
      const concepts = cs.get('concepts') as Y.Map<Y.Map<unknown>>
      for (const [code, cm] of [...concepts.entries()]) {
        const concept = conceptFromY(cm)
        let changed = false
        const designations = concept.designations.map((d) => {
          const text = designationText(d)
          const next = retargetImage(text, from, to)
          if (next === text) return d
          changed = true
          return withDesignationText(d, next)
        })
        if (changed) concepts.set(code, conceptToY({ ...concept, designations }))
      }
    }
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
    key: 'system' | 'code' | 'version' | 'mediaPath' | 'defaultCodeSystem' | 'calculateCodeSystem',
    value: string | undefined,
  ): void {
    setScalar(this.doc.getMap<unknown>('meta'), key, value)
  }

  setRepository(repository: ProjectRepository | undefined): void {
    setPlain(this.doc.getMap<unknown>('meta'), 'repository', repository)
  }
}

function isCallType(type: unknown): boolean {
  return type === 'goto' || type === 'block'
}

function isCall(node: TriccNode): boolean {
  return isCallType(node.type)
}

function removeFromOrder(arr: Y.Array<string>, id: string): void {
  const idx = arr.toArray().indexOf(id)
  if (idx >= 0) arr.delete(idx, 1)
}
