import { useMemo, useState } from 'react'
import {
  DRAWABLE_TYPES,
  NODE_TYPE_GROUPS,
  isSelect,
  resolve,
  validateActivity,
  activityKind,
  processOf,
  type NodeType,
  type TriccEdge,
  type TriccNode,
} from '@tricc/core'
import { useCanWrite, useMutate, useProjectSnapshot } from '../runtime/context.js'
import { ValidationSummary, uniqueId } from '../project/Overview.js'
import { ActivityCanvas } from './canvas/Canvas.js'
import { autoLayout } from './canvas/layout.js'
import { branchKindOf, type BranchKind } from './canvas/BranchEdge.js'
import { ActivityRefField } from '../components/ActivityRefField.js'

export function ActivityEditor({ activityId }: { activityId: string }) {
  const project = useProjectSnapshot()
  const activity = project.activities[activityId]
  const canWrite = useCanWrite()
  const mutate = useMutate()
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | undefined>(undefined)
  const lang = project.languages.default
  const kind = activity ? activityKind(activity) : 'activity'

  const issues = useMemo(
    () => (activity ? validateActivity(activity, project) : []),
    [activity, project],
  )

  if (!activity) {
    return (
      <p data-testid="activity-missing">No activity called “{activityId}” is in this project.</p>
    )
  }

  const selected = selectedId ? activity.nodes[selectedId] : undefined
  const selectedEdge = selectedEdgeId ? activity.edges[selectedEdgeId] : undefined

  const addNode = (type: NodeType) => {
    const taken = new Set(Object.keys(activity.nodes))
    const id = uniqueId(`n-${type}`, taken)
    const names = new Set(
      Object.values(activity.nodes)
        .map((n) => n.name)
        .filter(Boolean) as string[],
    )
    // Place below the lowest existing node rather than at a fixed point, so repeated adds
    // do not stack on top of each other.
    const lowest = Object.values(activity.nodes).reduce((max, n) => Math.max(max, n.ui?.y ?? 0), 0)
    const node: TriccNode = { id, type, ui: { x: 80, y: lowest + 96 } }
    if (needsName(type)) node.name = uniqueId(type, names)
    if (isSelect(type) && type !== 'select_yesno') node.options = []
    mutate((tx) => tx.addNode(activityId, node))
    setSelectedId(id)
    setSelectedEdgeId(undefined)
  }

  return (
    <div className="tricc-editor" data-testid="activity-editor">
      <header className="tricc-editor__header">
        <h1>{resolve(activity.title, lang, lang) ?? activity.id}</h1>
        <span className="tricc-editor__kind" data-testid="activity-kind" data-kind={kind}>
          {kind === 'process' ? 'Process activity' : 'Activity'}
        </span>
        {kind === 'process' && (
          <label className="tricc-editor__process">
            Starts
            <input
              data-testid="activity-process"
              list="cpg-processes"
              value={processOf(activity) ?? ''}
              disabled={!canWrite}
              onChange={(e) => {
                const process = e.target.value || undefined
                const root = Object.values(activity.nodes).find((n) => n.type === 'start')
                mutate((tx) => {
                  if (root) tx.updateNode(activityId, { ...root, process })
                  tx.setActivityProcess(activityId, process)
                })
              }}
            />
          </label>
        )}
        {canWrite && (
          <button
            type="button"
            data-testid="tidy-layout"
            onClick={() => {
              const positions = autoLayout(activity)
              mutate((tx) => {
                for (const [id, pos] of positions) tx.moveNode(activityId, id, pos.x, pos.y)
              })
            }}
          >
            Tidy layout
          </button>
        )}
      </header>

      <div className="tricc-editor__body">
        {canWrite && (
          <aside className="tricc-palette" aria-labelledby="palette-heading">
            <h2 id="palette-heading">Add a node</h2>
            {Object.entries(NODE_TYPE_GROUPS).map(([group, types]) => (
              <fieldset
                key={group}
                data-testid={`palette-${group}`}
                className="tricc-palette__group"
              >
                <legend>{group}</legend>
                {types
                  .filter((t) => canOffer(t, activity.nodes))
                  .map((type) => (
                    <button
                      key={type}
                      type="button"
                      data-testid={`add-${type}`}
                      onClick={() => addNode(type)}
                    >
                      {type}
                    </button>
                  ))}
              </fieldset>
            ))}
          </aside>
        )}

        <ActivityCanvas
          activityId={activityId}
          activity={activity}
          project={project}
          issues={issues}
          selectedId={selectedId}
          selectedEdgeId={selectedEdgeId}
          onSelect={setSelectedId}
          onSelectEdge={setSelectedEdgeId}
        />

        <aside className="tricc-inspector">
          {selected && (
            <NodeProperties
              key={selected.id}
              activityId={activityId}
              node={selected}
              lang={lang}
              readOnly={!canWrite}
              onDelete={() => {
                mutate((tx) => tx.removeNode(activityId, selected.id))
                setSelectedId(undefined)
              }}
            />
          )}
          {selectedEdge && (
            <EdgeProperties
              key={selectedEdge.id}
              activityId={activityId}
              edge={selectedEdge}
              readOnly={!canWrite}
            />
          )}
          {!selected && !selectedEdge && (
            <p data-testid="nothing-selected">Select a node to edit its properties.</p>
          )}

          <section aria-labelledby="edges-heading" className="tricc-edge-list">
            <h2 id="edges-heading">Connections</h2>
            <ul data-testid="edge-list">
              {activity.edgeOrder.map((id) => {
                const e = activity.edges[id]
                if (!e) return null
                return (
                  <li key={id}>
                    <button
                      type="button"
                      data-testid={`select-edge-${id}`}
                      onClick={() => {
                        setSelectedEdgeId(id)
                        setSelectedId(undefined)
                      }}
                    >
                      {e.source} → {e.target}
                      {e.value ? ` (${e.value})` : ''}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <ValidationSummary issues={issues} />
        </aside>
      </div>
    </div>
  )
}

/**
 * Node properties.
 *
 * There is deliberately no `save` field — where an answer is persisted follows from its
 * concept (feature/20260825-project-format.md §3.1a), so it is shown as derived,
 * read-only information rather than authored per node.
 */
export function NodeProperties({
  activityId,
  node,
  lang,
  readOnly,
  onDelete,
}: {
  activityId: string
  node: TriccNode
  lang: string
  readOnly: boolean
  onDelete?: () => void
}) {
  const mutate = useMutate()
  const project = useProjectSnapshot()

  const update = (patch: Partial<TriccNode>) => {
    mutate((tx) => tx.updateNode(activityId, { ...node, ...patch }))
  }

  const concept = node.concept
    ? project.codeSystems[node.concept.system]?.concepts[node.concept.code]
    : undefined

  return (
    <section aria-labelledby="properties-heading" data-testid="node-properties">
      <h2 id="properties-heading">{node.type}</h2>

      <label htmlFor="node-name">Name</label>
      <input
        id="node-name"
        data-testid="field-name"
        value={node.name ?? ''}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={(e) => update({ name: e.target.value || undefined })}
      />

      <label htmlFor="node-label">Label</label>
      <input
        id="node-label"
        data-testid="field-label"
        value={resolve(node.label, lang, lang) ?? ''}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={(e) => update({ label: e.target.value ? { [lang]: e.target.value } : undefined })}
      />

      {node.type === 'goto' && (
        <ActivityRefField
          testId="field-link"
          label="Goes to"
          value={node.link}
          project={project}
          readOnly={readOnly}
          // Only normal activities: a process activity is an entry point chained by the
          // process mechanism, not something to jump into. tricc_oo documents the same
          // rule (feature/goto-snippet-injection.md), but nothing there enforces it.
          kind="activity"
          exclude={[activityId]}
          onChange={(link) => update({ link })}
        />
      )}

      <label htmlFor="node-intent">Relevance — what it should do</label>
      <input
        id="node-intent"
        data-testid="field-relevance-intent"
        value={resolve(node.relevance?.intent, lang, lang) ?? ''}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={(e) =>
          update({
            relevance: mergeExpression(node.relevance, {
              intent: e.target.value ? { [lang]: e.target.value } : undefined,
            }),
          })
        }
      />

      <label htmlFor="node-expression">Relevance — CQL</label>
      <input
        id="node-expression"
        data-testid="field-relevance-expression"
        value={node.relevance?.expression ?? ''}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={(e) =>
          update({
            relevance: mergeExpression(node.relevance, {
              expression: e.target.value || undefined,
            }),
          })
        }
      />

      {/* Derived, never authored here. */}
      <p data-testid="persistence-derived">
        Stored as:{' '}
        {concept?.targetResource
          ? `${concept.targetResource}${concept.targetPath ? `.${concept.targetPath}` : ''}`
          : (concept?.conceptType ?? 'not determined until a concept is bound')}
      </p>

      {!readOnly && onDelete && (
        <button type="button" data-testid={`delete-${node.id}`} onClick={onDelete}>
          Delete node
        </button>
      )}
    </section>
  )
}

const BRANCH_CHOICES: { kind: BranchKind; label: string; value: string | undefined }[] = [
  { kind: 'unconditional', label: 'Unconditional', value: undefined },
  { kind: 'yes', label: 'Yes', value: 'yes' },
  { kind: 'no', label: 'No', value: 'no' },
  { kind: 'continue', label: 'Continue', value: 'continue' },
]

/**
 * Branch semantics as a typed choice rather than free text. Free-typing `yes` into a
 * condition field is the most common draw.io authoring error this removes.
 */
export function EdgeProperties({
  activityId,
  edge,
  readOnly,
}: {
  activityId: string
  edge: TriccEdge
  readOnly: boolean
}) {
  const mutate = useMutate()
  const kind = branchKindOf(edge.value)

  const set = (value: string | undefined) => {
    mutate((tx) => tx.updateEdge(activityId, { ...edge, value }))
  }

  return (
    <section aria-labelledby="edge-heading" data-testid="edge-properties">
      <h2 id="edge-heading">Connection</h2>
      <p>
        {edge.source} → {edge.target}
      </p>

      <label htmlFor="edge-kind">Branch</label>
      <select
        id="edge-kind"
        data-testid="field-branch-kind"
        value={kind}
        disabled={readOnly}
        onChange={(e) => {
          const next = e.target.value as BranchKind
          if (next === 'score') set('1')
          else if (next === 'condition')
            set(edge.value && branchKindOf(edge.value) === 'condition' ? edge.value : 'true')
          else set(BRANCH_CHOICES.find((c) => c.kind === next)?.value)
        }}
      >
        {BRANCH_CHOICES.map((c) => (
          <option key={c.kind} value={c.kind}>
            {c.label}
          </option>
        ))}
        <option value="score">Score</option>
        <option value="condition">Condition</option>
      </select>

      {kind === 'score' && (
        <>
          <label htmlFor="edge-score">Score</label>
          <input
            id="edge-score"
            type="number"
            data-testid="field-branch-score"
            value={edge.value ?? '1'}
            disabled={readOnly}
            onChange={(e) => set(e.target.value)}
          />
        </>
      )}

      {kind === 'condition' && (
        <>
          <label htmlFor="edge-condition">Condition — CQL</label>
          <input
            id="edge-condition"
            data-testid="field-branch-condition"
            value={edge.value ?? ''}
            disabled={readOnly}
            onChange={(e) => set(e.target.value)}
          />
        </>
      )}
    </section>
  )
}

function mergeExpression(
  current: TriccNode['relevance'],
  patch: { intent?: Record<string, string> | undefined; expression?: string | undefined },
): TriccNode['relevance'] {
  const next = { ...current, ...patch }
  if (patch.intent === undefined && 'intent' in patch) delete next.intent
  if (patch.expression === undefined && 'expression' in patch) delete next.expression
  const hasIntent = next.intent && Object.keys(next.intent).length > 0
  const hasExpr = next.expression && next.expression !== ''
  return hasIntent || hasExpr ? next : undefined
}

function needsName(type: NodeType): boolean {
  return (
    [
      'select_one',
      'select_multiple',
      'select_yesno',
      'integer',
      'decimal',
      'text',
      'date',
      'calculate',
      'count',
      'add',
      'populate',
      'diagnosis',
      'proposed_diagnosis',
      'activity_start',
    ] as string[]
  ).includes(type)
}

/**
 * Context-aware palette: offering a node that will immediately fail validation is a worse
 * experience than not offering it (feature/20260825-activity-editor.md §2).
 */
function canOffer(type: NodeType, nodes: Record<string, TriccNode>): boolean {
  if (!(DRAWABLE_TYPES as readonly string[]).includes(type)) return false
  const existing = Object.values(nodes)
  // An activity has exactly one root, and which root it has decides its kind. Neither is
  // offered once one exists, and both are offered only to repair an activity that has none.
  if (type === 'start' || type === 'activity_start') {
    return !existing.some((n) => n.type === 'start' || n.type === 'activity_start')
  }
  if (type === 'activity_end') return !existing.some((n) => n.type === 'activity_end')
  if (type === 'select_option') return false // reached through its parent select
  return true
}
