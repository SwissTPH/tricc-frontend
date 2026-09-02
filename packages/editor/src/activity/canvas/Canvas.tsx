import { useCallback, useMemo, useRef } from 'react'
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
import { TriccNodeView, type TriccFlowNode } from './TriccNode.js'
import { TriccEdgeView, branchKindOf, type TriccFlowEdge } from './BranchEdge.js'
import { autoLayout } from './layout.js'

const nodeTypes = { tricc: TriccNodeView }
const edgeTypes = { branch: TriccEdgeView }

export interface CanvasProps {
  activityId: string
  activity: Activity
  project: Project
  issues: Issue[]
  selectedId: string | undefined
  selectedEdgeId: string | undefined
  onSelect: (id: string | undefined) => void
  onSelectEdge: (id: string | undefined) => void
}

/**
 * The canvas.
 *
 * Nodes and edges are **projections of the project document**, not React Flow's internal
 * state: change handlers call `transact` and the document is the single source of truth.
 * Letting React Flow own state is what makes undo, collaboration and external-change
 * reconciliation intractable later (feature/20260825-activity-editor.md §1).
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
}: CanvasProps) {
  const mutate = useMutate()
  const canWrite = useCanWrite()
  const instance = useRef<ReactFlowInstance<TriccFlowNode, TriccFlowEdge> | null>(null)
  const lang = project.languages.default

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
    const positions = autoLayout(activity)
    return activity.nodeOrder
      .map((id) => activity.nodes[id])
      .filter((n): n is NonNullable<typeof n> => Boolean(n))
      .map((model) => {
        const concept = model.concept
          ? project.codeSystems[model.concept.system]?.concepts[model.concept.code]
          : undefined
        const severity = severityByNode.get(model.id)
        return {
          id: model.id,
          type: 'tricc' as const,
          position: model.ui
            ? { x: model.ui.x, y: model.ui.y }
            : (positions.get(model.id) ?? { x: 0, y: 0 }),
          selected: model.id === selectedId,
          draggable: canWrite,
          deletable: canWrite,
          data: {
            model,
            lang,
            ...(severity ? { severity } : {}),
            ...(concept?.display ? { conceptDisplay: concept.display } : {}),
          },
        }
      })
  }, [activity, project, lang, selectedId, canWrite, severityByNode])

  const edges = useMemo<TriccFlowEdge[]>(
    () =>
      activity.edgeOrder
        .map((id) => activity.edges[id])
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
        .map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'branch' as const,
          deletable: canWrite,
          selected: e.id === selectedEdgeId,
          data: {
            ...(e.value !== undefined ? { value: e.value } : {}),
            kind: branchKindOf(e.value),
          },
        })),
    [activity, canWrite, selectedEdgeId],
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
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          // Committed continuously; Yjs coalesces the drag into one undo entry.
          mutate((tx) => tx.moveNode(activityId, change.id, change.position!.x, change.position!.y))
        } else if (change.type === 'remove') {
          mutate((tx) => tx.removeNode(activityId, change.id))
          if (change.id === selectedId) onSelect(undefined)
        }
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
        if (change.type === 'remove') mutate((tx) => tx.removeEdge(activityId, change.id))
      }
    },
    [activityId, canWrite, mutate, onSelect, onSelectEdge, selectedEdgeId],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!canWrite || !connection.source || !connection.target) return
      const id = uniqueEdgeId(activity, connection.source, connection.target)
      mutate((tx) =>
        tx.addEdge(activityId, { id, source: connection.source, target: connection.target }),
      )
    },
    [activity, activityId, canWrite, mutate],
  )

  return (
    <div className="tricc-canvas" data-testid="activity-canvas">
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
    </div>
  )
}

function uniqueEdgeId(activity: Activity, source: string, target: string): string {
  const base = `e-${source}-${target}`
  if (!activity.edges[base]) return base
  let n = 2
  while (activity.edges[`${base}-${n}`]) n++
  return `${base}-${n}`
}
