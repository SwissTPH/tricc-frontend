import { useCallback, useMemo, useRef, useState } from 'react'
import { BranchChoiceDialog, type BranchChoiceValue } from './BranchChoice.js'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
} from '@xyflow/react'
import type { Activity, Issue, NodeType, Project } from '@tricc/core'
import { useCanWrite, useMutate } from '../../runtime/context.js'
import { expressionNames, renderCqlLabels } from '../../cql/names.js'
import { TriccNodeView, type TriccFlowNode } from './TriccNode.js'
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

const nodeTypes = { tricc: TriccNodeView }
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
  onSelect: (id: string | undefined) => void
  onSelectEdge: (id: string | undefined) => void
  /** Filled while this canvas is mounted, so the palette can place a new node. */
  placementRef?: { current: CanvasPlacement | null }
  /** A palette drag is over the editor. The pane shows where a drop will land. */
  dropping?: boolean
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
  onSelect,
  onSelectEdge,
  placementRef,
  dropping,
}: CanvasProps) {
  const mutate = useMutate()
  const canWrite = useCanWrite()
  const instance = useRef<ReactFlowInstance<TriccFlowNode, TriccFlowEdge> | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const lang = project.languages.default
  const names = useMemo(
    () => expressionNames(project, lang, activityId),
    [project, lang, activityId],
  )
  /** Positions for the gesture in progress. Empty once the pointer is released. */
  const dragPositions = useRef(new Map<string, { x: number; y: number }>())
  const [dragTick, setDragTick] = useState(0)
  /** Last size React Flow measured, keyed by node id, so a new projection stays visible. */
  const measuredSizes = useRef(new Map<string, { width: number; height: number }>())
  const nodeCache = useRef(new Map<string, TriccFlowNode>())
  const seenActivity = useRef(activityId)
  const [pendingBranch, setPendingBranch] = useState<PendingBranch | null>(null)
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
  if (seenActivity.current !== activityId) {
    seenActivity.current = activityId
    dragPositions.current.clear()
    measuredSizes.current.clear()
    nodeCache.current.clear()
    if (pendingBranch) setPendingBranch(null)
  }

  const severityByNode = useMemo(() => {
    const map = new Map<string, 'error' | 'warning'>()
    for (const i of issues) {
      const id = i.location.nodeId
      if (!id || i.severity === 'info') continue
      // An error outranks a warning already recorded for the same node.
      if (i.severity === 'error' || !map.has(id)) map.set(id, i.severity)
    }
    return map
  }, [issues])

  const nodes = useMemo<TriccFlowNode[]>(() => {
    // Nodes without a stored position are laid out on read, so a hand-written or
    // machine-generated activity still opens (project-format §3.2).
    // dragTick bumps on every pointer move. The positions themselves live in the ref above.
    void dragTick
    const positions = autoLayout(activity)
    const previous = nodeCache.current
    const next = new Map<string, TriccFlowNode>()
    const projected = activity.nodeOrder
      .map((id) => activity.nodes[id])
      .filter((n): n is NonNullable<typeof n> => Boolean(n))
      .map((model) => {
        const concept = model.concept
          ? project.codeSystems[model.concept.system]?.concepts[model.concept.code]
          : undefined
        const severity = severityByNode.get(model.id)
        const missing =
          model.type === 'goto' && Boolean(model.link) && project.activities[model.link!] === undefined
        const drag = dragPositions.current.get(model.id)
        const measured = measuredSize(instance.current, measuredSizes.current, model.id)
        const node: TriccFlowNode = {
          id: model.id,
          type: 'tricc',
          position: drag ??
            (model.ui
              ? { x: model.ui.x, y: model.ui.y }
              : (positions.get(model.id) ?? { x: 0, y: 0 })),
          selected: model.id === selectedId,
          draggable: canWrite,
          deletable: canWrite,
          ...(measured ? { measured } : {}),
          ...(drag ? { dragging: true } : {}),
          data: {
            model,
            lang,
            ...(severity ? { severity } : {}),
            ...(concept?.display ? { conceptDisplay: concept.display } : {}),
            ...(missing ? { missing: true } : {}),
          },
        }
        // Same object means React Flow keeps the measured internals for every node
        // the gesture did not move. A fresh object drops them and the node vanishes.
        const cached = previous.get(model.id)
        const stable = cached && sameFlowNode(cached, node) ? cached : node
        next.set(model.id, stable)
        return stable
      })
    nodeCache.current = next
    return projected
  }, [activity, project, lang, selectedId, canWrite, severityByNode, dragTick])

  const edges = useMemo<TriccFlowEdge[]>(
    () =>
      activity.edgeOrder
        .map((id) => activity.edges[id])
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
        .map((e) => {
          const kind = branchKindOf(e.value)
          const answer = answerEdgeCaption(activity.nodes[e.source], e.value, lang)
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
            selected: e.id === selectedEdgeId,
            data: {
              ...(e.value !== undefined ? { value: e.value } : {}),
              ...(display ? { display } : {}),
              ...(answer ? { title: answer.title } : {}),
              kind,
            },
          }
        }),
    [activity, canWrite, selectedEdgeId, names, lang],
  )

  /**
   * Selection is single-sourced here, exactly as node data is: React Flow reports a
   * `select` change and this applies it, rather than keeping its own copy. Passing
   * `selected` down without applying the change leaves two selections that disagree.
   */
  const onNodesChange = useCallback(
    (changes: NodeChange<TriccFlowNode>[]) => {
      // Selection is resolved across the whole batch, not change by change. Clicking a new
      // node emits a deselect for the old one alongside the select for the new one, and
      // applying them in sequence against stale state lets the deselect win.
      const selects = changes.filter((c) => c.type === 'select')
      if (selects.length > 0) {
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
          dragPositions.current.delete(change.id)
          mutate((tx) => tx.removeNode(activityId, change.id))
          if (change.id === selectedId) onSelect(undefined)
        }
      }
      if (dragChanged) setDragTick((n) => n + 1)
      if (commits.length > 0) {
        mutate((tx) => {
          for (const commit of commits) tx.moveNode(activityId, commit.id, commit.x, commit.y)
        })
      }
    },
    [activityId, canWrite, mutate, onSelect, onSelectEdge, selectedId],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange<TriccFlowEdge>[]) => {
      const selects = changes.filter((c) => c.type === 'select')
      if (selects.length > 0) {
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
    [activity, canWrite, commitEdge],
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

  return (
    <div
      className="tricc-canvas"
      data-testid="activity-canvas"
      data-dropping={dropping ? 'true' : undefined}
      ref={frameRef}
    >
      <ReactFlow<TriccFlowNode, TriccFlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={(i) => (instance.current = i)}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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

function measuredSize(
  flow: ReactFlowInstance<TriccFlowNode, TriccFlowEdge> | null,
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

function sameFlowNode(a: TriccFlowNode, b: TriccFlowNode): boolean {
  return (
    a.position.x === b.position.x &&
    a.position.y === b.position.y &&
    a.selected === b.selected &&
    a.draggable === b.draggable &&
    a.deletable === b.deletable &&
    a.dragging === b.dragging &&
    a.measured?.width === b.measured?.width &&
    a.measured?.height === b.measured?.height &&
    a.data.model === b.data.model &&
    a.data.lang === b.data.lang &&
    a.data.severity === b.data.severity &&
    a.data.conceptDisplay === b.data.conceptDisplay &&
    a.data.missing === b.data.missing
  )
}

function uniqueEdgeId(activity: Activity, source: string, target: string): string {
  const base = `e-${source}-${target}`
  if (!activity.edges[base]) return base
  let n = 2
  while (activity.edges[`${base}-${n}`]) n++
  return `${base}-${n}`
}
