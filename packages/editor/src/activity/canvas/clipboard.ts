import {
  hasInternalName,
  nodeConceptKey,
  type Activity,
  type CanvasComment,
  type CanvasGroup,
  type Mutations,
  type Project,
  type TriccEdge,
  type TriccNode,
} from '@tricc/core'
import { uniqueId } from '../../project/Overview.js'
import { commentFlowId, commentIdOf } from './CommentNode.js'
import { groupFlowId, groupIdOf } from './GroupNode.js'
import { descendantsOf, groupsByDepth } from './elements.js'
import { dragSelection } from './marquee.js'

/**
 * Copy, cut and paste of drawing elements.
 *
 * A copy always gets new ids in the activity it came from: the original still owns them.
 * The concept stays. Arrows are copied only when both ends are copied, and those arrows
 * point at the new ids. Arrows that leave the selection stay on the original.
 *
 * A cut removes the originals, the way deleting a node removes the arrows that touch it.
 * Pasting that cut back into the same activity reuses the ids while they are free.
 * Pasting into another activity reuses an id only when that activity does not already use it.
 * Node ids are not unique across activities, and a reused id does not reconnect arrows
 * left behind in the activity the elements came from.
 */

const PASTE_STEP = 32

export interface ClipboardNode {
  node: TriccNode
  /** Position on the page, so a node can leave its group and stay where it was. */
  pageX: number
  pageY: number
}

export interface ClipboardGroup {
  group: CanvasGroup
  pageX: number
  pageY: number
}

export interface CanvasClipboard {
  fromActivityId: string
  /** The originals were removed. Paste can put the same ids back while they are free. */
  cut: boolean
  nodes: ClipboardNode[]
  groups: ClipboardGroup[]
  comments: CanvasComment[]
  /** Arrows whose both ends are in `nodes`. */
  edges: TriccEdge[]
}

export interface PastePlan {
  groups: CanvasGroup[]
  nodes: TriccNode[]
  comments: CanvasComment[]
  edges: TriccEdge[]
  /** Flow ids to select afterwards. A group stands in for the elements it carries. */
  select: string[]
}

let held: { clip: CanvasClipboard; pasteCount: number } | undefined

export function rememberClipboard(clip: CanvasClipboard): void {
  held = { clip, pasteCount: 0 }
}

export function heldClipboard(): CanvasClipboard | undefined {
  return held?.clip
}

export function clearClipboard(): void {
  held = undefined
}

/**
 * How far this paste sits from the copied positions.
 * The first paste of a cut back home, and the first paste into another activity, land
 * where the elements were. Every other paste steps down and right so copies do not stack.
 */
export function pasteShift(clip: Pick<CanvasClipboard, 'cut' | 'fromActivityId'>, activityId: string, n: number): number {
  const firstCutHome = clip.cut && clip.fromActivityId === activityId && n === 0
  const firstElsewhere = clip.fromActivityId !== activityId && n === 0
  if (firstCutHome || firstElsewhere) return 0
  const step = clip.fromActivityId === activityId && !clip.cut ? n + 1 : n
  return PASTE_STEP * step
}

export function nextPasteOffset(activityId: string): number {
  if (!held) return 0
  const offset = pasteShift(held.clip, activityId, held.pasteCount)
  held.pasteCount += 1
  return offset
}

/** The elements a selection covers. A selected group includes everything it carries. */
export function selectionSnapshot(activity: Activity, flowIds: readonly string[]): Omit<CanvasClipboard, 'fromActivityId' | 'cut'> {
  const groups = activity.groups ?? []
  const selectedGroups = new Set<string>()
  const selectedNodes = new Set<string>()
  const selectedComments = new Set<string>()

  for (const flowId of flowIds) {
    const groupId = groupIdOf(flowId)
    if (groupId && groups.some((g) => g.id === groupId)) {
      for (const id of descendantsOf(groups, groupId)) selectedGroups.add(id)
      continue
    }
    const commentId = commentIdOf(flowId)
    if (commentId && activity.ui?.comments?.some((c) => c.id === commentId)) {
      selectedComments.add(commentId)
      continue
    }
    if (activity.nodes[flowId]) selectedNodes.add(flowId)
  }

  for (const node of Object.values(activity.nodes)) {
    if (node.group && selectedGroups.has(node.group)) selectedNodes.add(node.id)
  }

  const nodes = activity.nodeOrder
    .filter((id) => selectedNodes.has(id))
    .map((id) => {
      const node = activity.nodes[id]!
      const page = pagePoint(activity, node.group, node.ui?.x ?? 0, node.ui?.y ?? 0)
      return { node: structuredClone(node), pageX: page.x, pageY: page.y }
    })

  const copiedGroups = groupsByDepth(groups)
    .filter((g) => selectedGroups.has(g.id))
    .map((g) => {
      const page = pagePoint(activity, g.parent, g.x, g.y)
      return { group: structuredClone(g), pageX: page.x, pageY: page.y }
    })

  const comments = (activity.ui?.comments ?? [])
    .filter((c) => selectedComments.has(c.id))
    .map((c) => structuredClone(c))

  const nodeIds = new Set(nodes.map((item) => item.node.id))
  const edges = activity.edgeOrder
    .filter((id) => {
      const edge = activity.edges[id]
      return edge !== undefined && nodeIds.has(edge.source) && nodeIds.has(edge.target)
    })
    .map((id) => structuredClone(activity.edges[id]!))

  return { nodes, groups: copiedGroups, comments, edges }
}

export function planPaste(clip: CanvasClipboard, target: Activity, project: Project, offset: number): PastePlan {
  const copiedGroupIds = new Set(clip.groups.map((item) => item.group.id))
  const groupTaken = new Set((target.groups ?? []).map((g) => g.id))
  const nodeTaken = new Set(Object.keys(target.nodes))
  const commentTaken = new Set((target.ui?.comments ?? []).map((c) => c.id))
  const edgeTaken = new Set(Object.keys(target.edges))
  const allowSame = clip.cut || clip.fromActivityId !== target.id

  const groupIds = new Map<string, string>()
  for (const item of clip.groups) groupIds.set(item.group.id, takeId(item.group.id, groupTaken, allowSame))

  const nodeIds = new Map<string, string>()
  for (const item of clip.nodes) nodeIds.set(item.node.id, takeId(item.node.id, nodeTaken, allowSame))

  const commentIds = new Map<string, string>()
  for (const comment of clip.comments) commentIds.set(comment.id, takeId(comment.id, commentTaken, allowSame))

  const names = new Set<string>()
  for (const node of Object.values(target.nodes)) {
    if (node.name && !hasInternalName(node.type)) names.add(nameKey(node.name, node.repeat))
  }

  const groups = groupsByDepth(clip.groups.map((item) => item.group)).map((source) => {
    const item = clip.groups.find((entry) => entry.group.id === source.id)!
    const group = structuredClone(item.group)
    group.id = groupIds.get(group.id)!
    if (group.parent && groupIds.has(group.parent)) group.parent = groupIds.get(group.parent)
    const parentCopied = item.group.parent !== undefined && copiedGroupIds.has(item.group.parent)
    const parentHere = group.parent !== undefined && (target.groups ?? []).some((g) => g.id === group.parent)
    // A copied parent already carries the offset, so a group inside it keeps its relative position.
    if (!parentCopied && item.group.parent && parentHere) {
      group.x = Math.round(group.x + offset)
      group.y = Math.round(group.y + offset)
    } else if (!parentCopied) {
      delete group.parent
      group.x = Math.round(item.pageX + offset)
      group.y = Math.round(item.pageY + offset)
    }
    return group
  })

  const nodes = clip.nodes.map((item) => {
    const node = structuredClone(item.node)
    node.id = nodeIds.get(node.id)!
    const groupCopied = node.group !== undefined && copiedGroupIds.has(node.group)
    if (node.group && groupIds.has(node.group)) node.group = groupIds.get(node.group)
    const groupHere = node.group !== undefined && (target.groups ?? []).some((g) => g.id === node.group)
    if (groupCopied) {
      node.ui = { ...(node.ui ?? { x: 0, y: 0 }), x: node.ui?.x ?? 0, y: node.ui?.y ?? 0 }
    } else if (item.node.group && groupHere) {
      node.ui = shifted(node.ui, offset, offset)
    } else {
      delete node.group
      node.ui = shifted({ ...(node.ui ?? { x: 0, y: 0 }), x: item.pageX, y: item.pageY }, offset, offset)
    }
    const renamed = rename(node, names, project)
    if (renamed.name && !hasInternalName(renamed.type)) names.add(nameKey(renamed.name, renamed.repeat))
    return renamed
  })

  const comments = clip.comments.map((source) => {
    const comment = structuredClone(source)
    comment.id = commentIds.get(comment.id)!
    comment.x = Math.round(comment.x + offset)
    comment.y = Math.round(comment.y + offset)
    if (comment.node && nodeIds.has(comment.node)) comment.node = nodeIds.get(comment.node)
    else if (comment.node && !target.nodes[comment.node]) delete comment.node
    return comment
  })

  const edges = clip.edges.map((source) => {
    const edge = structuredClone(source)
    edge.source = nodeIds.get(edge.source) ?? edge.source
    edge.target = nodeIds.get(edge.target) ?? edge.target
    edge.id = takeEdgeId(source.id, edge.source, edge.target, edgeTaken, allowSame)
    if (offset !== 0 && edge.ui?.waypoints) {
      edge.ui = {
        ...edge.ui,
        waypoints: edge.ui.waypoints.map((point) => ({
          x: Math.round(point.x + offset),
          y: Math.round(point.y + offset),
        })),
      }
    }
    return edge
  })

  const select = dragSelection(
    [
      ...groups.map((g) => groupFlowId(g.id)),
      ...nodes.map((n) => n.id),
      ...comments.map((c) => commentFlowId(c.id)),
    ],
    (flowId) => {
      const groupId = groupIdOf(flowId)
      if (groupId) {
        const parent = groups.find((g) => g.id === groupId)?.parent
        return parent ? groupFlowId(parent) : undefined
      }
      const node = nodes.find((n) => n.id === flowId)
      return node?.group ? groupFlowId(node.group) : undefined
    },
  )

  return { groups, nodes, comments, edges, select }
}

export function applyCut(tx: Mutations, activityId: string, clip: CanvasClipboard): void {
  for (const item of clip.nodes) tx.removeNode(activityId, item.node.id)
  for (const comment of clip.comments) tx.removeComment(activityId, comment.id)
  const deepestFirst = [...groupsByDepth(clip.groups.map((item) => item.group))].reverse()
  for (const group of deepestFirst) tx.removeGroup(activityId, group.id)
}

export function applyPaste(tx: Mutations, activityId: string, plan: PastePlan): void {
  for (const group of plan.groups) tx.setGroup(activityId, group)
  for (const node of plan.nodes) tx.addNode(activityId, node)
  for (const edge of plan.edges) tx.addEdge(activityId, edge)
  for (const comment of plan.comments) tx.setComment(activityId, comment)
}

function takeId(id: string, taken: Set<string>, allowSame: boolean): string {
  const blocked = new Set(taken)
  if (!allowSame) blocked.add(id)
  const next = uniqueId(id, blocked)
  taken.add(next)
  return next
}

function takeEdgeId(id: string, source: string, target: string, taken: Set<string>, allowSame: boolean): string {
  if (allowSame && !taken.has(id)) {
    taken.add(id)
    return id
  }
  const blocked = new Set(taken)
  if (!allowSame) blocked.add(id)
  const next = uniqueId(`e-${source}-${target}`, blocked)
  taken.add(next)
  return next
}

function nameKey(name: string, repeat: number | undefined): string {
  return `${name} ${repeat ?? 1}`
}

/** A copied question keeps its concept even when its name has to change to stay unique. */
function rename(node: TriccNode, names: Set<string>, project: Project): TriccNode {
  if (!node.name || hasInternalName(node.type) || !names.has(nameKey(node.name, node.repeat))) return node
  const key = nodeConceptKey(project, node)
  const pinned = node.concept || !key ? node : { ...node, concept: { system: key.system, code: key.code } }
  const sameSlot = new Set<string>()
  const slot = String(node.repeat ?? 1)
  for (const existing of names) {
    const space = existing.lastIndexOf(' ')
    if (existing.slice(space + 1) === slot) sameSlot.add(existing.slice(0, space))
  }
  return { ...pinned, name: uniqueId(pinned.name!, sameSlot, '_') }
}

function shifted(ui: TriccNode['ui'], dx: number, dy: number): NonNullable<TriccNode['ui']> {
  return { ...(ui ?? { x: 0, y: 0 }), x: Math.round((ui?.x ?? 0) + dx), y: Math.round((ui?.y ?? 0) + dy) }
}

function pagePoint(activity: Activity, groupId: string | undefined, x: number, y: number): { x: number; y: number } {
  let px = x
  let py = y
  let id = groupId
  const seen = new Set<string>()
  while (id && !seen.has(id)) {
    seen.add(id)
    const group = activity.groups?.find((item) => item.id === id)
    if (!group) break
    px += group.x
    py += group.y
    id = group.parent
  }
  return { x: px, y: py }
}
