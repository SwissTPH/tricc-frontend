import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BranchChoiceDialog, type BranchChoiceValue } from './BranchChoice.js'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useUpdateNodeInternals,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
} from '@xyflow/react'
import {
  isExtensionTarget,
  isTextNode,
  type Activity,
  type Issue,
  type NodeType,
  type Project,
} from '@tricc/core'
import { useCanWrite, useEditorPreferences, useMutate } from '../../runtime/context.js'
import { expressionNames, renderCqlLabels } from '../../cql/names.js'
import { FollowContext, TriccNodeView, type NodeIssue } from './TriccNode.js'
import { CommentNodeView, commentFlowId, commentIdOf } from './CommentNode.js'
import { GroupNodeView, groupFlowId, groupIdOf } from './GroupNode.js'

import {
  CANVAS_KINDS,
  KIND_ORDER,
  descendantsOf,
  kindOf,
  sameFlowNode,
  type FlowNode,
  type ProjectContext,
} from './elements.js'
import { TriccEdgeView, branchKindOf, type TriccFlowEdge } from './BranchEdge.js'
import {
  NODE_OUT_HANDLE,
  answerEdgeCaption,
  answerExpression,
  answerHandleId,
  optionCode,
  optionIdFromHandle,
} from './answer.js'
import { autoLayout } from './layout.js'
import { dragSelection, pointerPastMarquee, rectsMeet, screenRect } from './marquee.js'
import { draggingFiles, imageFiles } from '../../media/images.js'

const nodeTypes = { tricc: TriccNodeView, comment: CommentNodeView, 'group-frame': GroupNodeView }
const edgeTypes = { branch: TriccEdgeView }
/** React Flow's own default is Backspace. Delete is the key authors use. */
const DELETE_KEYS = ['Backspace', 'Delete']

interface PendingBranch {
  source: string
  target: string
  sourceType: 'select_yesno' | 'rhombus'
}

/** Screen-to-diagram conversion for the palette. The canvas owns the viewport. */
export interface CanvasPlacement {
  /** Diagram point under a screen coordinate, snapped to the canvas grid. */
  atClient: (clientX: number, clientY: number) => { x: number; y: number } | undefined
}

export interface CanvasProps {
  activityId: string
  activity: Activity
  project: Project
  issues: Issue[]
  selectedId: string | undefined
  selectedEdgeId: string | undefined
  /** Flow ids chosen by a right-drag. Empty unless more than one element was swept. */
  boxSelection?: readonly string[]
  onSelect: (id: string | undefined) => void
  onSelectEdge: (id: string | undefined) => void
  /** Replace the selection with what a right-drag covered. One id selects that element. */
  onBoxSelect?: (ids: string[]) => void
  /** Filled while this canvas is mounted, so the palette can place a new node. */
  placementRef?: { current: CanvasPlacement | null }
  /** A palette drag is over the editor. The pane shows where a drop will land. */
  dropping?: boolean
  /** Ctrl/Cmd+click on a goto opens the activity it goes to. */
  onOpenActivity?: (activityId: string) => void
  /** Bring these nodes into view. A new object (`seq`) asks again for the same ids. */
  reveal?: { ids: string[]; seq: number }
  /** Picture files dropped on a node, or on one of its answers. */
  onDropPictures?: (files: File[], at: { nodeId: string; optionId?: string }) => void
}

/**
 * The canvas.
 *
 * Nodes and edges are **projections of the project document**, not React Flow's internal
 * state: change handlers call `transact` and the document is the single source of truth.
 * Letting React Flow own state is what makes undo, collaboration and external-change
 * reconciliation intractable later (feature/20260825-activity-editor.md §1).
 *
 * A pointer drag is the exception. Publishing every move replaces every node object, and
 * React Flow then drops the measured size it needs to draw nodes and edges, so the canvas
 * goes blank until the activity is opened again. The gesture keeps its positions locally
 * and writes them once, when the pointer is released.
 */
export function ActivityCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}

function CanvasInner({
  activityId,
  activity,
  project,
  issues,
  selectedId,
  selectedEdgeId,
  boxSelection = [],
  onSelect,
  onSelectEdge,
  onBoxSelect = () => {},
  placementRef,
  dropping,
  onOpenActivity,
  reveal,
  onDropPictures,
}: CanvasProps) {
  const mutate = useMutate()
  const canWrite = useCanWrite()
  const { labelChars } = useEditorPreferences()
  const instance = useRef<ReactFlowInstance<FlowNode, TriccFlowEdge> | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const lang = project.languages.default
  const names = useMemo(
    () => expressionNames(project, lang, activityId),
    [project, lang, activityId],
  )
  // The follow button on a goto opens its target, like Ctrl+click does.
  const follow = useCallback(
    (link: string) => {
      if (onOpenActivity && project.activities[link]) onOpenActivity(link)
    },
    [onOpenActivity, project.activities],
  )
  /** Positions for the gesture in progress. Empty once the pointer is released. */
  const dragPositions = useRef(new Map<string, { x: number; y: number }>())
  /** Sizes of groups being resized, shown live and stored when the resize ends. */
  const resizeDims = useRef(new Map<string, { width: number; height: number }>())
  const [dragTick, setDragTick] = useState(0)
  /** Last size React Flow measured, keyed by node id, so a new projection stays visible. */
  const measuredSizes = useRef(new Map<string, { width: number; height: number }>())
  const nodeCache = useRef(new Map<string, FlowNode>())
  const seenActivity = useRef(activityId)
  const [pendingBranch, setPendingBranch] = useState<PendingBranch | null>(null)
  /** The right-drag rectangle, in canvas coordinates. Absent until the pointer has moved 6px. */
  const [marquee, setMarquee] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  /** The selection was just set by a right-drag, so the pointer release must not clear it. */
  const justBoxed = useRef(false)
  const placement = useMemo<CanvasPlacement>(
    () => ({
      atClient: (clientX, clientY) => {
        const flow = instance.current
        if (!flow) return undefined
        return flow.screenToFlowPosition({ x: clientX, y: clientY }, { snapToGrid: true })
      },
    }),
    [],
  )
  if (placementRef) placementRef.current = placement
  /** A reveal asked for before React Flow was ready; done once it is. */
  const pendingReveal = useRef<string[] | null>(null)
  const fitTo = useCallback((ids: string[]) => {
    const flow = instance.current
    if (!flow || ids.length === 0) return
    // After the frame that selects them, so the nodes are measured where they now are.
    requestAnimationFrame(() =>
      void flow.fitView({ nodes: ids.map((id) => ({ id })), duration: 300, maxZoom: 1, padding: 0.5 }),
    )
  }, [])
  useEffect(() => {
    if (!reveal) return
    if (instance.current) fitTo(reveal.ids)
    else pendingReveal.current = reveal.ids
  }, [reveal, fitTo])
  if (seenActivity.current !== activityId) {
    seenActivity.current = activityId
    dragPositions.current.clear()
    measuredSizes.current.clear()
    nodeCache.current.clear()
    if (pendingBranch) setPendingBranch(null)
  }

  const issuesByNode = useMemo(() => {
    const map = new Map<string, NodeIssue[]>()
    for (const i of issues) {
      const id = i.location.nodeId
      if (!id || i.severity === 'info') continue
      map.set(id, [...(map.get(id) ?? []), { severity: i.severity, message: i.message }])
    }
    return map
  }, [issues])

  const nodes = useMemo<FlowNode[]>(() => {
    // dragTick bumps on every pointer move. The positions themselves live in the refs above.
    void dragTick
    const ctx: ProjectContext = {
      activity,
      project,
      lang,
      selectedId,
      boxSelection,
      canWrite,
      issuesByNode,
      // Nodes without a stored position are laid out on read, so a hand-written or
      // machine-generated activity still opens (project-format §3.2).
      layout: autoLayout(activity),
      drag: (id) => dragPositions.current.get(id),
      resize: (id) => resizeDims.current.get(id),
      measured: (id) => measuredSize(instance.current, measuredSizes.current, id),
    }
    // Every kind is projected and cached the same way. Keeping the same object for an
    // unchanged element keeps React Flow's measured internals; a fresh object is re-measured
    // and hidden for a frame, which is what made comments and groups flicker.
    const previous = nodeCache.current
    const next = new Map<string, FlowNode>()
    const projected = KIND_ORDER.flatMap((kind) => CANVAS_KINDS[kind].project(ctx)).map((node) => {
      const cached = previous.get(node.id)
      const stable = cached && sameFlowNode(cached, node) ? cached : node
      next.set(node.id, stable)
      return stable
    })
    nodeCache.current = next
    return projected
  }, [activity, project, lang, selectedId, boxSelection, canWrite, issuesByNode, dragTick])

  // When an element's handles change (answers added, removed, reordered; a new type) and its
  // size does not, React Flow keeps the old handle positions. Tell it to read them again.
  const updateNodeInternals = useUpdateNodeInternals()
  const handleSignatures = useRef(new Map<string, string>())
  useEffect(() => {
    const changed: string[] = []
    const seen = new Map<string, string>()
    for (const node of nodes) {
      const signature = kindOf(node.id).handleSignature?.(node)
      if (signature === undefined) continue
      seen.set(node.id, signature)
      const before = handleSignatures.current.get(node.id)
      if (before !== undefined && before !== signature) changed.push(node.id)
    }
    handleSignatures.current = seen
    if (changed.length) updateNodeInternals(changed)
  }, [nodes, updateNodeInternals])

  const edges = useMemo<TriccFlowEdge[]>(
    () => [
      ...activity.edgeOrder
        .map((id) => activity.edges[id])
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
        .map((e) => {
          const kind = branchKindOf(e.value)
          const answer = answerEdgeCaption(activity.nodes[e.source], e.value, lang, project, labelChars)
          const display =
            answer?.short ??
            (kind === 'condition' && e.value ? renderCqlLabels(e.value, names) : undefined)
          return {
            id: e.id,
            source: e.source,
            target: e.target,
            // An edge with no handle id is drawn from the first source, which on a
            // choice node is the first answer. The node output has its own id.
            sourceHandle: answer?.optionId ? answerHandleId(answer.optionId) : NODE_OUT_HANDLE,
            type: 'branch' as const,
            deletable: canWrite,
            selected:
              boxSelection.length > 0
                ? nodeInBox(e.source, boxSelection, activity) && nodeInBox(e.target, boxSelection, activity)
                : e.id === selectedEdgeId,
            data: {
              ...(e.value !== undefined ? { value: e.value } : {}),
              ...(display ? { display } : {}),
              ...(answer ? { title: answer.title } : {}),
              kind,
            },
          }
        }),
      // What a comment is about: a dashed line, not an edge of the guideline.
      ...(activity.ui?.comments ?? [])
        .filter((c) => c.node && activity.nodes[c.node])
        .map(
          (c) =>
            ({
              id: `about:${c.id}`,
              source: commentFlowId(c.id),
              sourceHandle: 'about',
              target: c.node!,
              selectable: false,
              deletable: false,
              focusable: false,
              className: 'tricc-edge--about',
              style: { strokeDasharray: '4 4' },
            }) as TriccFlowEdge,
        ),
    ],
    [activity, boxSelection, canWrite, selectedEdgeId, names, lang, project, labelChars],
  )

  /**
   * Selection is single-sourced here, exactly as node data is: React Flow reports a
   * `select` change and this applies it, rather than keeping its own copy. Passing
   * `selected` down without applying the change leaves two selections that disagree.
   */
  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      // Selection is resolved across the whole batch, not change by change. Clicking a new
      // node emits a deselect for the old one alongside the select for the new one, and
      // applying them in sequence against stale state lets the deselect win.
      const selects = changes.filter((c) => c.type === 'select')
      if (selects.length > 0 && !justBoxed.current) {
        const picked = selects.find((c) => c.selected)
        if (picked) {
          onSelect(picked.id)
          onSelectEdge(undefined)
        } else if (selects.some((c) => c.id === selectedId)) {
          onSelect(undefined)
        }
      }

      if (!canWrite) return
      const commits: { id: string; x: number; y: number }[] = []
      let dragChanged = false
      for (const change of changes) {
        // A resize from a corner (groups): shown live, stored once the resize ends.
        if (change.type === 'dimensions' && change.dimensions && kindOf(change.id).commitResize) {
          if (change.resizing) {
            resizeDims.current.set(change.id, { ...change.dimensions })
            dragChanged = true
          } else if (change.resizing === false) {
            resizeDims.current.delete(change.id)
            dragChanged = true
            const size = { ...change.dimensions }
            mutate((tx) => kindOf(change.id).commitResize?.(tx, activityId, activity, change.id, size))
          }
          continue
        }
        if (change.type === 'position' && change.position) {
          const { x, y } = change.position
          if (change.dragging) {
            dragPositions.current.set(change.id, { x, y })
            dragChanged = true
          } else {
            // dragging is false for a pointer release and for a keyboard nudge.
            dragPositions.current.delete(change.id)
            dragChanged = true
            commits.push({ id: change.id, x, y })
          }
        } else if (change.type === 'remove') {
          const remove = kindOf(change.id).remove
          if (!remove) continue
          dragPositions.current.delete(change.id)
          mutate((tx) => remove(tx, activityId, change.id))
          if (change.id === selectedId) onSelect(undefined)
        }
      }
      if (dragChanged) setDragTick((n) => n + 1)
      if (commits.length > 0) {
        mutate((tx) => {
          for (const commit of commits) kindOf(commit.id).commitMove(tx, activityId, activity, commit.id, commit)
        })
      }
    },
    [activity, activityId, canWrite, mutate, onSelect, onSelectEdge, selectedId],
  )

  /**
   * Dropping a node (or a group) inside a group puts it in that group; dropping it outside
   * its group takes it out. Its position is made relative to its new group, so it stays
   * where it was dropped.
   */
  const onNodeDragStop = useCallback(
    (_event: unknown, dragged: FlowNode) => {
      const flow = instance.current
      if (!canWrite || !flow || commentIdOf(dragged.id)) return
      const internal = flow.getInternalNode(dragged.id)
      if (!internal) return
      const abs = internal.internals.positionAbsolute
      const w = internal.measured?.width ?? 0
      const h = internal.measured?.height ?? 0
      const centre = { x: abs.x + w / 2, y: abs.y + h / 2 }
      const draggedGroup = groupIdOf(dragged.id)
      const excluded = draggedGroup ? descendantsOf(activity.groups ?? [], draggedGroup) : new Set<string>()
      let best: { id: string; area: number; x: number; y: number } | undefined
      for (const g of activity.groups ?? []) {
        if (excluded.has(g.id)) continue
        const gi = flow.getInternalNode(groupFlowId(g.id))
        if (!gi) continue
        const gp = gi.internals.positionAbsolute
        const gw = gi.measured?.width ?? g.width
        const gh = gi.measured?.height ?? g.height
        const inside = centre.x >= gp.x && centre.x <= gp.x + gw && centre.y >= gp.y && centre.y <= gp.y + gh
        if (inside && (!best || gw * gh < best.area)) best = { id: g.id, area: gw * gh, x: gp.x, y: gp.y }
      }
      const x = Math.round(abs.x - (best?.x ?? 0))
      const y = Math.round(abs.y - (best?.y ?? 0))
      if (draggedGroup) {
        const group = activity.groups?.find((g) => g.id === draggedGroup)
        if (!group || group.parent === best?.id) return
        const next = { ...group, x, y }
        if (best) next.parent = best.id
        else delete next.parent
        mutate((tx) => tx.setGroup(activityId, next))
        return
      }
      const model = activity.nodes[dragged.id]
      if (!model || model.group === best?.id) return
      mutate((tx) => tx.setNodeGroup(activityId, dragged.id, best?.id, x, y))
    },
    [activity, activityId, canWrite, mutate],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange<TriccFlowEdge>[]) => {
      const selects = changes.filter((c) => c.type === 'select')
      if (selects.length > 0 && !justBoxed.current) {
        const picked = selects.find((c) => c.selected)
        if (picked) {
          onSelectEdge(picked.id)
          onSelect(undefined)
        } else if (selects.some((c) => c.id === selectedEdgeId)) {
          onSelectEdge(undefined)
        }
      }

      if (!canWrite) return
      for (const change of changes) {
        if (change.type === 'remove') {
          mutate((tx) => tx.removeEdge(activityId, change.id))
          if (change.id === selectedEdgeId) onSelectEdge(undefined)
        }
      }
    },
    [activityId, canWrite, mutate, onSelect, onSelectEdge, selectedEdgeId],
  )

  const commitEdge = useCallback(
    (source: string, target: string, value?: string) => {
      const id = uniqueEdgeId(activity, source, target)
      mutate((tx) =>
        tx.addEdge(activityId, {
          id,
          source,
          target,
          ...(value !== undefined ? { value } : {}),
        }),
      )
      onSelect(undefined)
      onSelectEdge(id)
    },
    [activity, activityId, mutate, onSelect, onSelectEdge],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!canWrite || !connection.source || !connection.target) return
      // A kind whose connections are not guideline edges (a comment's "about") stores its own.
      const connectFrom = kindOf(connection.source).connectFrom
      if (connectFrom) {
        mutate((tx) => connectFrom(tx, activityId, activity, connection.source!, connection.target!))
        return
      }
      // Not available attaches to its question: the link takes no answer and no branch.
      const targetType = activity.nodes[connection.target]?.type
      if (targetType && isExtensionTarget(targetType)) {
        commitEdge(connection.source, connection.target)
        return
      }
      const optionId = optionIdFromHandle(connection.sourceHandle)
      if (optionId) {
        const option = activity.nodes[connection.source]?.options?.find((item) => item.id === optionId)
        if (!option) return
        commitEdge(connection.source, connection.target, answerExpression(optionCode(option)))
        return
      }
      const sourceType = activity.nodes[connection.source]?.type
      if (sourceType === 'select_yesno' || sourceType === 'rhombus') {
        setPendingBranch({
          source: connection.source,
          target: connection.target,
          sourceType,
        })
        return
      }
      commitEdge(connection.source, connection.target)
    },
    [activity, activityId, canWrite, commitEdge, mutate],
  )

  const chooseBranch = useCallback(
    (value: BranchChoiceValue) => {
      if (!pendingBranch) return
      const { source, target } = pendingBranch
      setPendingBranch(null)
      if (!activity.nodes[source] || !activity.nodes[target]) return
      commitEdge(source, target, value)
    },
    [activity, commitEdge, pendingBranch],
  )

  const cancelBranch = useCallback(() => setPendingBranch(null), [])

  /** The node (and answer) a picture file is over, if it can take one. */
  const pictureTarget = (target: EventTarget | null) => {
    const el = target instanceof Element ? target : null
    const wrapper = el?.closest<HTMLElement>('.react-flow__node')
    const nodeId = wrapper?.dataset['id']
    const node = nodeId ? activity.nodes[nodeId] : undefined
    if (!wrapper || !node || !isTextNode(node.type)) return undefined
    const optionId = el?.closest<HTMLElement>('[data-option-id]')?.dataset['optionId']
    return { wrapper, nodeId: node.id, ...(optionId ? { optionId } : {}) }
  }
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    let gesture: { x: number; y: number; pointerId: number; active: boolean } | null = null

    const skip = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('.react-flow__controls, .react-flow__minimap'))

    const parentGroup = (flowId: string): string | undefined => {
      const gid = groupIdOf(flowId)
      if (gid) {
        const parent = activity.groups?.find((g) => g.id === gid)?.parent
        return parent ? groupFlowId(parent) : undefined
      }
      const nodeGroup = activity.nodes[flowId]?.group
      return nodeGroup ? groupFlowId(nodeGroup) : undefined
    }

    const onDown = (event: PointerEvent) => {
      if (event.button !== 2 || skip(event.target)) return
      event.preventDefault()
      event.stopPropagation()
      frame.setPointerCapture(event.pointerId)
      gesture = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, active: false }
    }
    const onMove = (event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.pointerId) return
      if (!gesture.active && !pointerPastMarquee(event.clientX - gesture.x, event.clientY - gesture.y)) return
      gesture.active = true
      event.preventDefault()
      event.stopPropagation()
      const bounds = frame.getBoundingClientRect()
      const area = screenRect(gesture.x, gesture.y, event.clientX, event.clientY)
      setMarquee({
        left: area.left - bounds.left,
        top: area.top - bounds.top,
        width: area.right - area.left,
        height: area.bottom - area.top,
      })
    }
    const finish = (event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.pointerId) return
      const was = gesture
      gesture = null
      setMarquee(null)
      if (!was.active) return
      const area = screenRect(was.x, was.y, event.clientX, event.clientY)
      const hits: string[] = []
      for (const el of frame.querySelectorAll<HTMLElement>('.react-flow__node[data-id]')) {
        const bounds = el.getBoundingClientRect()
        if (rectsMeet(area, { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom })) {
          const id = el.dataset.id
          if (id) hits.push(id)
        }
      }
      justBoxed.current = true
      window.setTimeout(() => {
        justBoxed.current = false
      }, 0)
      onBoxSelect(dragSelection(hits, parentGroup))
    }
    // The menu arrives after pointerup, and the release can be outside the canvas.
    let swallowMenu = false
    let menuTimer = 0
    const onMenu = (event: Event) => {
      if (!swallowMenu && !(event.target instanceof Node && frame.contains(event.target))) return
      swallowMenu = false
      event.preventDefault()
    }
    const down = (event: PointerEvent) => {
      if (event.button === 2) {
        swallowMenu = true
        window.clearTimeout(menuTimer)
        menuTimer = window.setTimeout(() => {
          swallowMenu = false
        }, 800)
      }
      onDown(event)
    }

    frame.addEventListener('pointerdown', down, true)
    frame.addEventListener('pointermove', onMove)
    frame.addEventListener('pointerup', finish)
    frame.addEventListener('pointercancel', finish)
    window.addEventListener('contextmenu', onMenu, true)
    return () => {
      frame.removeEventListener('pointerdown', down, true)
      frame.removeEventListener('pointermove', onMove)
      frame.removeEventListener('pointerup', finish)
      frame.removeEventListener('pointercancel', finish)
      window.removeEventListener('contextmenu', onMenu, true)
      window.clearTimeout(menuTimer)
    }
  }, [activity, onBoxSelect])

  const marked = useRef<HTMLElement | null>(null)
  const markDrop = (el: HTMLElement | null) => {
    if (marked.current === el) return
    marked.current?.removeAttribute('data-picture-drop')
    el?.setAttribute('data-picture-drop', 'true')
    marked.current = el
  }

  return (
    <div
      className="tricc-canvas"
      data-testid="activity-canvas"
      data-dropping={dropping ? 'true' : undefined}
      ref={frameRef}
      onDragOver={(event) => {
        if (!canWrite || !onDropPictures || !draggingFiles(event)) return
        const at = pictureTarget(event.target)
        markDrop(at?.wrapper ?? null)
        if (!at) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) markDrop(null)
      }}
      onDrop={(event) => {
        markDrop(null)
        if (!canWrite || !onDropPictures || !draggingFiles(event)) return
        const at = pictureTarget(event.target)
        if (!at) return
        event.preventDefault()
        const files = imageFiles(event.dataTransfer.files)
        if (files.length > 0) onDropPictures(files, at.optionId ? { nodeId: at.nodeId, optionId: at.optionId } : { nodeId: at.nodeId })
      }}
    >
      <FollowContext.Provider value={onOpenActivity ? follow : undefined}>
      <ReactFlow<FlowNode, TriccFlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={(i) => {
          instance.current = i
          if (pendingReveal.current) fitTo(pendingReveal.current)
          pendingReveal.current = null
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        panOnDrag={[0]}
        onPaneClick={() => {
          if (justBoxed.current) return
          onSelect(undefined)
          onSelectEdge(undefined)
        }}
        onNodeClick={(event, flowNode) => {
          if (!(event.ctrlKey || event.metaKey) || !onOpenActivity) return
          const link = activity.nodes[flowNode.id]?.type === 'goto' ? activity.nodes[flowNode.id]?.link : undefined
          if (link && project.activities[link]) onOpenActivity(link)
        }}
        nodesDraggable={canWrite}
        nodesConnectable={canWrite}
        elementsSelectable
        deleteKeyCode={canWrite ? DELETE_KEYS : null}
        snapToGrid
        snapGrid={[8, 8]}
        fitView
        proOptions={{ hideAttribution: true }}
        // Past this many nodes the cost of rendering off-screen elements shows up in
        // interaction latency.
        onlyRenderVisibleElements={nodes.length > 150}
      >
        <Background gap={16} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
      {marquee && (
        <div
          className="tricc-marquee"
          data-testid="selection-marquee"
          style={{ left: marquee.left, top: marquee.top, width: marquee.width, height: marquee.height }}
        />
      )}
      </FollowContext.Provider>
      {pendingBranch && canWrite && (
        <BranchChoiceDialog
          sourceType={pendingBranch.sourceType}
          onChoose={chooseBranch}
          onCancel={cancelBranch}
        />
      )}
    </div>
  )
}

/** A node the selection covers: it was swept, or it sits in a group that was. */
function nodeInBox(nodeId: string, box: readonly string[], activity: Activity): boolean {
  if (box.includes(nodeId)) return true
  const groups = activity.groups ?? []
  let group = activity.nodes[nodeId]?.group
  const seen = new Set<string>()
  while (group && !seen.has(group)) {
    if (box.includes(groupFlowId(group))) return true
    seen.add(group)
    group = groups.find((item) => item.id === group)?.parent
  }
  return false
}

function measuredSize(
  flow: ReactFlowInstance<FlowNode, TriccFlowEdge> | null,
  cache: Map<string, { width: number; height: number }>,
  id: string,
): { width: number; height: number } | undefined {
  const measured = flow?.getInternalNode(id)?.measured
  if (measured?.width && measured.height) {
    const size = { width: measured.width, height: measured.height }
    cache.set(id, size)
    return size
  }
  return cache.get(id)
}

function uniqueEdgeId(activity: Activity, source: string, target: string): string {
  const base = `e-${source}-${target}`
  if (!activity.edges[base]) return base
  let n = 2
  while (activity.edges[`${base}-${n}`]) n++
  return `${base}-${n}`
}
