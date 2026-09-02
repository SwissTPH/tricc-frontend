import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react'

export type BranchKind = 'unconditional' | 'yes' | 'no' | 'continue' | 'score' | 'condition'

export type TriccFlowEdge = Edge<{ value?: string; kind: BranchKind }, 'branch'>

/**
 * Edge branch semantics, shown as a chosen label rather than free text.
 *
 * `follow` / `suivre` are read but never written, so an edge loaded with one displays as
 * Continue and is normalized on save (feature/20260825-project-format.md §5).
 */
export function branchKindOf(value: string | undefined): BranchKind {
  const v = value?.trim().toLowerCase()
  if (!v) return 'unconditional'
  if (v === 'yes' || v === 'oui') return 'yes'
  if (v === 'no' || v === 'non') return 'no'
  if (v === 'continue' || v === 'follow' || v === 'suivre') return 'continue'
  if (/^[+-]?\d+$/.test(v)) return 'score'
  return 'condition'
}

export function branchLabel(value: string | undefined): string {
  const kind = branchKindOf(value)
  switch (kind) {
    case 'unconditional':
      return ''
    case 'yes':
      return 'Yes'
    case 'no':
      return 'No'
    case 'continue':
      return 'Continue'
    case 'score':
      return `Score ${value}`
    case 'condition':
      // Truncated: the full expression lives in the properties panel.
      return (value ?? '').length > 28 ? `${(value ?? '').slice(0, 27)}…` : (value ?? '')
  }
}

export function TriccEdgeView({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<TriccFlowEdge>) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  })
  const kind = data?.kind ?? 'unconditional'
  const label = branchLabel(data?.value)

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        className={`tricc-edge tricc-edge--${kind} ${selected ? 'is-selected' : ''}`}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className={`tricc-edge__label tricc-edge__label--${kind}`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            data-testid={`edge-label-${id}`}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
