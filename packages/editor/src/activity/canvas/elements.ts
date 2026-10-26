import {
  conceptRichText,
  conceptText,
  defaultCodeSystem,
  imageRefs,
  lookupConcept,
  nodeConceptKey,
  optionConceptKey,
  resolve,
  rootNode,
  type Activity,
  type CanvasGroup,
  type DisplayText,
  type Mutations,
  type Project,
} from '@tricc/core'
import { uniqueId } from '../../project/Overview.js'
import { answerLabel } from './answer.js'
import { visualFor } from './node-visuals.js'
import type { TriccFlowNode } from './TriccNode.js'
import { COMMENT_PREFIX, commentFlowId, commentIdOf, type CommentFlowNode } from './CommentNode.js'
import { GROUP_PREFIX, groupFlowId, groupIdOf, type GroupFlowNode } from './GroupNode.js'

/**
 * The kinds of element on the canvas: page groups, guideline nodes, and comments.
 *
 * Each kind answers the same questions: how it is drawn (`project`), how a move, a resize, a
 * delete or a connection from it is stored, how one is created at a point, and which of its
 * handles edges attach to. The canvas asks every kind the same way, so a kind cannot be
 * forgotten in one place and handled in another — the cause of the flicker comments and
 * groups had while only nodes were cached.
 */

export type FlowNode = TriccFlowNode | CommentFlowNode | GroupFlowNode
export type KindName = 'group' | 'tricc' | 'comment'
type Size = { width: number; height: number }
type Point = { x: number; y: number }

/** What projecting needs, resolved once per pass by the canvas. */
export interface ProjectContext {
  activity: Activity
  project: Project
  lang: string
  selectedId: string | undefined
  /** Set when a right-drag selected more than one element. Those ids are drawn selected. */
  boxSelection?: readonly string[]
  canWrite: boolean
  severityByNode: Map<string, 'error' | 'warning'>
  /** Positions for nodes the file has none for. */
  layout: Map<string, Point>
  /** Position during a drag in progress. */
  drag: (flowId: string) => Point | undefined
  /** Size during a resize in progress. */
  resize: (flowId: string) => Size | undefined
  /** Last size React Flow measured; keeps the element initialized across projections. */
  measured: (flowId: string) => Size | undefined
}

export interface CanvasKind {
  owns(flowId: string): boolean
  /** The flow nodes of this kind, in drawing order (a parent before its children). */
  project(ctx: ProjectContext): FlowNode[]
  /** Store where it was moved to (relative to its group, as React Flow reports it). */
  commitMove(tx: Mutations, activityId: string, activity: Activity, flowId: string, at: Point): void
  /** Store a new size. Absent when the kind cannot be resized. */
  commitResize?(tx: Mutations, activityId: string, activity: Activity, flowId: string, size: Size): void
  /** Delete from the keyboard. Absent when the kind must not be deleted that way. */
  remove?(tx: Mutations, activityId: string, flowId: string): void
  /** A connection dragged from it. Present only when it is not a guideline edge. */
  connectFrom?(tx: Mutations, activityId: string, activity: Activity, sourceId: string, targetId: string): void
  /** Create one, at a point or in a free spot; returns the flow id to select. */
  create?(tx: Mutations, activityId: string, activity: Activity, at?: Point): string
  /** Changes when the element's handles change, so React Flow re-reads where edges attach. */
  handleSignature?(node: FlowNode): string
}

/** Projection order: React Flow draws a parent before its children. */
export const KIND_ORDER: readonly KindName[] = ['group', 'tricc', 'comment']

/** One selected element, or every element in a right-drag selection. */
function marked(ctx: ProjectContext, id: string): boolean {
  if (ctx.boxSelection && ctx.boxSelection.length > 0) return ctx.boxSelection.includes(id)
  return id === ctx.selectedId
}

/** To the right of the diagram, below what is already there: a free spot for a click-add. */
function freeSpot(activity: Activity, index: number, step: number): Point {
  const right = Math.max(80, ...Object.values(activity.nodes).map((n) => (n.ui?.x ?? 0) + 260))
  return { x: right, y: 40 + index * step }
}

const group: CanvasKind = {
  owns: (id) => id.startsWith(GROUP_PREFIX),
  project(ctx) {
    const { activity, project, lang } = ctx
    const groups = activity.groups ?? []
    const ids = new Set(groups.map((g) => g.id))
    return groupsByDepth(groups).map((g): GroupFlowNode => {
      const id = groupFlowId(g.id)
      const size = ctx.resize(id) ?? { width: g.width, height: g.height }
      const concept = g.name ? defaultCodeSystem(project)?.concepts[g.name] : undefined
      const title =
        conceptText(concept, 'display', lang, project.languages.default) ??
        resolve(g.label, lang, lang) ??
        g.name ??
        ''
      const measured = ctx.measured(id)
      return {
        id,
        type: 'group-frame',
        position: ctx.drag(id) ?? { x: g.x, y: g.y },
        style: { width: size.width, height: size.height },
        ...(g.parent && ids.has(g.parent) ? { parentId: groupFlowId(g.parent) } : {}),
        ...(measured ? { measured } : {}),
        selected: marked(ctx, id),
        draggable: ctx.canWrite,
        deletable: false,
        data: { group: g, title, canWrite: ctx.canWrite },
      }
    })
  },
  commitMove(tx, activityId, activity, flowId, at) {
    const g = activity.groups?.find((x) => x.id === groupIdOf(flowId))
    if (g) tx.setGroup(activityId, { ...g, x: Math.round(at.x), y: Math.round(at.y) })
  },
  commitResize(tx, activityId, activity, flowId, size) {
    const g = activity.groups?.find((x) => x.id === groupIdOf(flowId))
    if (g) tx.setGroup(activityId, { ...g, width: Math.round(size.width), height: Math.round(size.height) })
  },
  // No keyboard delete: React Flow would delete the nodes inside too. Ungroup is in Details.
  create(tx, activityId, activity, at) {
    const groups = activity.groups ?? []
    const id = uniqueId('group', new Set(groups.map((g) => g.id)))
    const spot = at ?? freeSpot(activity, groups.length, 260)
    tx.setGroup(activityId, {
      id,
      name: id.replace(/-/g, '_'),
      color: 'grey',
      x: Math.round(spot.x),
      y: Math.round(spot.y),
      width: 320,
      height: 220,
    })
    return groupFlowId(id)
  },
}

/** The first picture a text shows, by image id. */
function firstPicture(text: DisplayText | undefined): string | undefined {
  return text === undefined ? undefined : imageRefs(text)[0]
}

const tricc: CanvasKind = {
  owns: (id) => !id.startsWith(GROUP_PREFIX) && !id.startsWith(COMMENT_PREFIX),
  project(ctx) {
    const { activity, project, lang } = ctx
    const defaultLang = project.languages.default
    const rootId = rootNode(activity)?.id
    const groupIds = new Set((activity.groups ?? []).map((g) => g.id))
    const activityTitle = resolve(activity.title, lang, lang) ?? activity.id
    return activity.nodeOrder
      .map((id) => activity.nodes[id])
      .filter((n): n is NonNullable<typeof n> => Boolean(n))
      .map((model): TriccFlowNode => {
        // The text is the concept's questionnaire text (its display when it has none).
        const concept = lookupConcept(project, nodeConceptKey(project, model))
        // A text that is only a picture has no words: the node falls back to its own label.
        const text = conceptText(concept, 'q-display', lang, defaultLang)?.trim() || undefined
        const picture = firstPicture(conceptRichText(concept, 'q-display', lang, defaultLang))
        const hint = conceptText(concept, 'hint', lang, defaultLang) ?? resolve(model.hint, lang, lang)
        const help = conceptText(concept, 'help', lang, defaultLang) ?? resolve(model.help, lang, lang)
        const answerTexts = model.options?.length
          ? Object.fromEntries(model.options.map((o) => [o.id, answerLabel(o, lang, project)]))
          : undefined
        const answerPictures = Object.fromEntries(
          (model.options ?? []).flatMap((o) => {
            const id = firstPicture(
              conceptRichText(lookupConcept(project, optionConceptKey(project, o)), 'q-display', lang, defaultLang),
            )
            return id ? [[o.id, id]] : []
          }),
        )
        const severity = ctx.severityByNode.get(model.id)
        const missing = model.type === 'goto' && Boolean(model.link) && project.activities[model.link!] === undefined
        const drag = ctx.drag(model.id)
        const measured = ctx.measured(model.id)
        return {
          id: model.id,
          type: 'tricc',
          position: drag ?? (model.ui ? { x: model.ui.x, y: model.ui.y } : (ctx.layout.get(model.id) ?? { x: 0, y: 0 })),
          selected: marked(ctx, model.id),
          draggable: ctx.canWrite,
          deletable: ctx.canWrite,
          ...(model.group && groupIds.has(model.group) ? { parentId: groupFlowId(model.group) } : {}),
          ...(measured ? { measured } : {}),
          ...(drag ? { dragging: true } : {}),
          data: {
            model,
            lang,
            ...(severity ? { severity } : {}),
            ...(text ? { conceptDisplay: text } : {}),
            ...(hint ? { hint } : {}),
            ...(help ? { help } : {}),
            ...(answerTexts ? { answerTexts } : {}),
            ...(picture ? { picture } : {}),
            ...(Object.keys(answerPictures).length > 0 ? { answerPictures } : {}),
            ...(model.id === rootId ? { activityTitle } : {}),
            ...(missing ? { missing: true } : {}),
          },
        }
      })
  },
  commitMove(tx, activityId, activity, flowId, at) {
    if (activity.nodes[flowId]) tx.moveNode(activityId, flowId, at.x, at.y)
  },
  remove(tx, activityId, flowId) {
    tx.removeNode(activityId, flowId)
  },
  handleSignature(node) {
    const model = (node as TriccFlowNode).data.model
    const visual = visualFor(model.type)
    const answers = model.type === 'select_one' || model.type === 'select_multiple'
    // A picture on top changes where the handles are, without changing the node's box always.
    const picture = (node as TriccFlowNode).data.picture ?? ''
    return `${model.type}|${visual.targets}|${visual.sources}|${answers ? (model.options ?? []).map((o) => o.id).join(',') : ''}|${picture}`
  },
}

const comment: CanvasKind = {
  owns: (id) => id.startsWith(COMMENT_PREFIX),
  project(ctx) {
    return (ctx.activity.ui?.comments ?? []).map((c): CommentFlowNode => {
      const id = commentFlowId(c.id)
      const measured = ctx.measured(id)
      return {
        id,
        type: 'comment',
        position: ctx.drag(id) ?? { x: c.x, y: c.y },
        ...(measured ? { measured } : {}),
        selected: marked(ctx, id),
        draggable: ctx.canWrite,
        deletable: ctx.canWrite,
        zIndex: 1,
        data: { comment: c },
      }
    })
  },
  commitMove(tx, activityId, activity, flowId, at) {
    const c = activity.ui?.comments?.find((x) => x.id === commentIdOf(flowId))
    if (c) tx.setComment(activityId, { ...c, x: at.x, y: at.y })
  },
  remove(tx, activityId, flowId) {
    const id = commentIdOf(flowId)
    if (id) tx.removeComment(activityId, id)
  },
  connectFrom(tx, activityId, activity, sourceId, targetId) {
    // It is now about that node. No edge, so conversion never sees it.
    const c = activity.ui?.comments?.find((x) => x.id === commentIdOf(sourceId))
    if (c && activity.nodes[targetId]) tx.setComment(activityId, { ...c, node: targetId })
  },
  create(tx, activityId, activity, at) {
    const comments = activity.ui?.comments ?? []
    const id = uniqueId('comment', new Set(comments.map((c) => c.id)))
    const spot = at ?? freeSpot(activity, comments.length, 100)
    tx.setComment(activityId, { id, text: '', color: 'yellow', x: Math.round(spot.x), y: Math.round(spot.y) })
    return commentFlowId(id)
  },
  handleSignature: () => 'about',
}

export const CANVAS_KINDS: Record<KindName, CanvasKind> = { group, tricc, comment }

/** The kind a flow id belongs to. */
export function kindOf(flowId: string): CanvasKind {
  return KIND_ORDER.map((k) => CANVAS_KINDS[k]).find((k) => k.owns(flowId)) ?? tricc
}

/**
 * Whether a freshly projected element is the same as the one React Flow already has. Keeping
 * the same object keeps React Flow's measured internals; a fresh one is re-measured and hidden
 * for a frame. Compares every data key (the node model by identity), so a new field cannot be
 * forgotten here.
 */
export function sameFlowNode(a: FlowNode, b: FlowNode): boolean {
  if (
    a.type !== b.type ||
    a.position.x !== b.position.x ||
    a.position.y !== b.position.y ||
    a.selected !== b.selected ||
    a.draggable !== b.draggable ||
    a.deletable !== b.deletable ||
    a.dragging !== b.dragging ||
    a.parentId !== b.parentId ||
    a.zIndex !== b.zIndex ||
    a.measured?.width !== b.measured?.width ||
    a.measured?.height !== b.measured?.height ||
    a.style?.width !== b.style?.width ||
    a.style?.height !== b.style?.height
  ) {
    return false
  }
  const da = a.data as Record<string, unknown>
  const db = b.data as Record<string, unknown>
  const keys = new Set([...Object.keys(da), ...Object.keys(db)])
  for (const key of keys) {
    const x = da[key]
    const y = db[key]
    if (x === y) continue
    if (key === 'model' || typeof x !== 'object' || x === null || typeof y !== 'object' || y === null) return false
    if (JSON.stringify(x) !== JSON.stringify(y)) return false
  }
  return true
}

/** Groups with every parent before its children. */
export function groupsByDepth(groups: CanvasGroup[]): CanvasGroup[] {
  const byId = new Map(groups.map((g) => [g.id, g]))
  const depth = (g: CanvasGroup, seen = new Set<string>()): number => {
    if (!g.parent || !byId.has(g.parent) || seen.has(g.id)) return 0
    seen.add(g.id)
    return 1 + depth(byId.get(g.parent)!, seen)
  }
  return [...groups].sort((a, b) => depth(a) - depth(b))
}

/** A group and every group inside it, at any depth: where it cannot be dropped. */
export function descendantsOf(groups: CanvasGroup[], id: string): Set<string> {
  const out = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const g of groups) {
      if (g.parent && out.has(g.parent) && !out.has(g.id)) {
        out.add(g.id)
        grew = true
      }
    }
  }
  return out
}
