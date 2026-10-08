import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  DRAWABLE_TYPES,
  NODE_TYPE_GROUPS,
  isCapture,
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
import { CqlExpressionField } from '../cql/CqlExpressionField.js'
import { expressionNames, renderCqlLabels } from '../cql/names.js'
import { ActivityCanvas, type CanvasPlacement } from './canvas/Canvas.js'
import { autoLayout } from './canvas/layout.js'
import { branchKindOf, branchLabel, type BranchKind } from './canvas/BranchEdge.js'
import { answerCode, answerEdgeCaption } from './canvas/answer.js'
import { ActivityRefField } from '../components/ActivityRefField.js'

export function ActivityEditor({
  activityId,
  focusNodeId,
  onOpen,
}: {
  activityId: string
  focusNodeId?: string
  /** Open a question that lives in another activity. */
  onOpen?: (activityId: string, nodeId: string) => void
}) {
  const project = useProjectSnapshot()
  const activity = project.activities[activityId]
  const canWrite = useCanWrite()
  const mutate = useMutate()
  const [selectedId, setSelectedId] = useState<string | undefined>(focusNodeId)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | undefined>(undefined)
  const [panel, setPanel] = useState<'details' | 'nodes' | 'connection' | 'validation'>(
    focusNodeId ? 'details' : 'nodes',
  )
  const lang = project.languages.default
  const kind = activity ? activityKind(activity) : 'activity'
  const names = useMemo(
    () => expressionNames(project, lang, activityId),
    [project, lang, activityId],
  )

  useEffect(() => {
    if (!focusNodeId) return
    setSelectedId(focusNodeId)
    setSelectedEdgeId(undefined)
    setPanel('details')
  }, [activityId, focusNodeId])

  const reveal = (nextActivity: string, nodeId: string) => {
    if (nextActivity === activityId) {
      setSelectedId(nodeId)
      setSelectedEdgeId(undefined)
      setPanel('details')
      return
    }
    onOpen?.(nextActivity, nodeId)
  }

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
  const hasSelection = Boolean(selected || selectedEdge)
  // Details is only a tab while something is selected. A stale "details" choice falls back to Nodes.
  const active: 'details' | 'nodes' | 'connection' | 'validation' =
    panel === 'details' && hasSelection
      ? 'details'
      : panel === 'connection'
        ? 'connection'
        : panel === 'validation'
          ? 'validation'
          : 'nodes'
  // A selected element shows its own issues. With nothing selected, the tab shows the activity.
  const validationIssues = selectedEdge
    ? issues.filter((issue) => issue.location.edgeId === selectedEdge.id)
    : selected
      ? issues.filter((issue) => issue.location.nodeId === selected.id)
      : issues
  const validationScope = selectedEdge ? 'This connection' : selected ? 'This node' : 'Whole activity'
  const activityIssueCount = issues.filter((issue) => issue.severity !== 'info').length

  const chooseNode = (id: string | undefined) => {
    setSelectedId(id)
    if (id) {
      setSelectedEdgeId(undefined)
      setPanel('details')
    }
  }
  const chooseEdge = (id: string | undefined) => {
    setSelectedEdgeId(id)
    if (id) {
      setSelectedId(undefined)
      setPanel('details')
    }
  }

  const placementRef = useRef<CanvasPlacement | null>(null)
  const [dropping, setDropping] = useState(false)

  const addNode = (type: NodeType, at?: { x: number; y: number }) => {
    if (!canOffer(type, activity.nodes)) return
    const taken = new Set(Object.keys(activity.nodes))
    const id = uniqueId(`n-${type}`, taken)
    const names = new Set(
      Object.values(activity.nodes)
        .map((n) => n.name)
        .filter(Boolean) as string[],
    )
    // A drag lands at the pointer. A click stacks below the lowest node, clear of the diagram.
    const lowest = Object.values(activity.nodes).reduce((max, n) => Math.max(max, n.ui?.y ?? 0), 0)
    const position = at ?? { x: 80, y: lowest + 96 }
    const node: TriccNode = { id, type, ui: { x: position.x, y: position.y } }
    if (needsName(type)) node.name = uniqueId(type, names)
    if (isSelect(type) && type !== 'select_yesno') node.options = []
    mutate((tx) => tx.addNode(activityId, node))
    chooseNode(id)
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
        <ActivityCanvas
          activityId={activityId}
          activity={activity}
          project={project}
          issues={issues}
          selectedId={selectedId}
          selectedEdgeId={selectedEdgeId}
          onSelect={chooseNode}
          onSelectEdge={chooseEdge}
          placementRef={placementRef}
          dropping={dropping}
        />

        <aside className="tricc-inspector">
          <div className="tricc-inspector__tabs" role="tablist" aria-label="Inspector">
            {hasSelection && (
              <button
                type="button"
                role="tab"
                id="tab-details"
                data-testid="tab-details"
                aria-selected={active === 'details'}
                aria-controls="inspector-details"
                onClick={() => setPanel('details')}
              >
                Details
              </button>
            )}
            <button
              type="button"
              role="tab"
              id="tab-nodes"
              data-testid="tab-nodes"
              aria-selected={active === 'nodes'}
              aria-controls="inspector-nodes"
              onClick={() => setPanel('nodes')}
            >
              Nodes
            </button>
            <button
              type="button"
              role="tab"
              id="tab-connection"
              data-testid="tab-connection"
              aria-selected={active === 'connection'}
              aria-controls="inspector-connection"
              onClick={() => setPanel('connection')}
            >
              Connection
            </button>
            <button
              type="button"
              role="tab"
              id="tab-validation"
              data-testid="tab-validation"
              aria-selected={active === 'validation'}
              aria-controls="inspector-validation"
              onClick={() => setPanel('validation')}
            >
              Validation
              {activityIssueCount > 0 && (
                <span className="tricc-inspector__count" title="Issues in this activity">
                  {activityIssueCount}
                </span>
              )}
            </button>
          </div>

          {active === 'details' && (
            <div role="tabpanel" id="inspector-details" aria-labelledby="tab-details">
              {selected && (
                <NodeProperties
                  key={selected.id}
                  activityId={activityId}
                  node={selected}
                  lang={lang}
                  readOnly={!canWrite}
                  onReveal={reveal}
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
                  onReveal={reveal}
                />
              )}
            </div>
          )}

          {active === 'nodes' && (
            <div role="tabpanel" id="inspector-nodes" aria-labelledby="tab-nodes">
              {canWrite && (
                <NodePalette
                  nodes={activity.nodes}
                  onAdd={addNode}
                  clientToFlow={(clientX, clientY) => placementRef.current?.atClient(clientX, clientY)}
                  onDraggingChange={setDropping}
                />
              )}
              <section className="tricc-node-list">
              {activity.nodeOrder.length === 0 && <p>This activity has no nodes.</p>}
              <ul data-testid="node-list">
                {activity.nodeOrder.map((id) => {
                  const n = activity.nodes[id]
                  if (!n) return null
                  const text = resolve(n.label, lang, lang) ?? n.name ?? TYPE_LABEL[n.type] ?? n.type
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        data-testid={`select-node-${id}`}
                        aria-current={selectedId === id ? 'true' : undefined}
                        onClick={() => chooseNode(id)}
                      >
                        {text}
                      </button>
                    </li>
                  )
                })}
              </ul>
              </section>
            </div>
          )}

          {active === 'connection' && (
            <section
              role="tabpanel"
              id="inspector-connection"
              aria-labelledby="tab-connection"
              className="tricc-edge-list"
            >
              {activity.edgeOrder.length === 0 && <p>This activity has no connections.</p>}
              <ul data-testid="edge-list">
                {activity.edgeOrder.map((id) => {
                  const e = activity.edges[id]
                  if (!e) return null
                  const answer = answerEdgeCaption(activity.nodes[e.source], e.value, lang)
                  const label = answer
                    ? answer.short
                    : branchKindOf(e.value) === 'condition'
                      ? shorten(renderCqlLabels(e.value ?? '', names))
                      : branchLabel(e.value)
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        data-testid={`select-edge-${id}`}
                        aria-current={selectedEdgeId === id ? 'true' : undefined}
                        onClick={() => chooseEdge(id)}
                      >
                        {e.source} → {e.target}
                        {label ? ` (${label})` : ''}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {active === 'validation' && (
            <section
              role="tabpanel"
              id="inspector-validation"
              aria-labelledby="tab-validation"
              className="tricc-validation"
            >
              <p data-testid="validation-scope">{validationScope}</p>
              <ValidationSummary issues={validationIssues} heading={false} />
            </section>
          )}
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
  onReveal,
  onDelete,
}: {
  activityId: string
  node: TriccNode
  lang: string
  readOnly: boolean
  onReveal?: (activityId: string, nodeId: string) => void
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

      {(node.type === 'calculate' || node.type === 'count' || node.type === 'add') && (
        <CqlExpressionField
          id="node-calculate"
          testId="field-calculate"
          label="Calculation — CQL"
          value={node.calculate?.expression ?? ''}
          readOnly={readOnly}
          activityId={activityId}
          onReveal={onReveal}
          onChange={(expression) =>
            update({ calculate: expression ? { expression } : undefined })
          }
        />
      )}

      {REF_TYPES.has(node.type) && typeof node.reference !== 'object' && (
        <CqlExpressionField
          id="node-reference"
          testId="field-reference"
          label={node.type === 'rhombus' ? 'Decision — CQL' : 'Applies when — CQL'}
          value={typeof node.reference === 'string' ? node.reference : ''}
          readOnly={readOnly}
          activityId={activityId}
          onReveal={onReveal}
          onChange={(expression) => update({ reference: expression || undefined })}
        />
      )}

      {node.type === 'start' && (
        <>
          <label htmlFor="node-form-id">Form id</label>
          <input
            id="node-form-id"
            data-testid="field-form-id"
            value={node.form_id ?? ''}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) => update({ form_id: e.target.value || undefined })}
          />
          <p>The form id of this process. Export names the form from it.</p>
        </>
      )}

      {(node.type === 'integer' || node.type === 'decimal' || node.type === 'quantity') && (
        <>
          <label htmlFor="node-min">Minimum</label>
          <input
            id="node-min"
            type="number"
            data-testid="field-min"
            value={node.min ?? ''}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) =>
              update({ min: e.target.value === '' ? undefined : Number(e.target.value) })
            }
          />
          <label htmlFor="node-max">Maximum</label>
          <input
            id="node-max"
            type="number"
            data-testid="field-max"
            value={node.max ?? ''}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) =>
              update({ max: e.target.value === '' ? undefined : Number(e.target.value) })
            }
          />
        </>
      )}

      {node.type === 'quantity' && (
        <>
          <label htmlFor="node-unit">Unit</label>
          <input
            id="node-unit"
            data-testid="field-unit"
            value={node.unit ?? ''}
            readOnly={readOnly}
            disabled={readOnly}
            placeholder="kg"
            onChange={(e) => update({ unit: e.target.value || undefined })}
          />
          <label htmlFor="node-unit-system">Unit system</label>
          <input
            id="node-unit-system"
            data-testid="field-unit-system"
            value={node.unit_system ?? ''}
            readOnly={readOnly}
            disabled={readOnly}
            placeholder="http://unitsofmeasure.org"
            onChange={(e) => update({ unit_system: e.target.value || undefined })}
          />
          <label htmlFor="node-unit-code">Unit code</label>
          <input
            id="node-unit-code"
            data-testid="field-unit-code"
            value={node.unit_code ?? ''}
            readOnly={readOnly}
            disabled={readOnly}
            placeholder="kg"
            onChange={(e) => update({ unit_code: e.target.value || undefined })}
          />
        </>
      )}

      {isCapture(node.type) && (
        <label>
          <input
            type="checkbox"
            data-testid="field-required"
            checked={node.required === true}
            disabled={readOnly}
            onChange={(e) => update({ required: e.target.checked ? true : undefined })}
          />{' '}
          Required
        </label>
      )}

      {(isCapture(node.type) || node.constraint || node.constraintMessage) && (
        <>
          <CqlExpressionField
            id="node-constraint"
            testId="field-constraint"
            label="Constraint — CQL"
            value={node.constraint?.expression ?? ''}
            readOnly={readOnly}
            activityId={activityId}
            onReveal={onReveal}
            onChange={(expression) =>
              update({
                constraint: expression ? { expression } : undefined,
              })
            }
          />
          <label htmlFor="node-constraint-message">Message when the constraint fails</label>
          <input
            id="node-constraint-message"
            data-testid="field-constraint-message"
            value={resolve(node.constraintMessage, lang, lang) ?? ''}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) =>
              update({
                constraintMessage: e.target.value ? { [lang]: e.target.value } : undefined,
              })
            }
          />
        </>
      )}

      {(isCapture(node.type) || node.type === 'note' || node.hint || node.help) && (
        <>
          <label htmlFor="node-hint">Hint</label>
          <input
            id="node-hint"
            data-testid="field-hint"
            value={resolve(node.hint, lang, lang) ?? ''}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) => update({ hint: e.target.value ? { [lang]: e.target.value } : undefined })}
          />
          <label htmlFor="node-help">Help</label>
          <textarea
            id="node-help"
            data-testid="field-help"
            value={resolve(node.help, lang, lang) ?? ''}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) => update({ help: e.target.value ? { [lang]: e.target.value } : undefined })}
          />
        </>
      )}

      {isSelect(node.type) && node.filter && (
        <>
          <label htmlFor="node-code">Code</label>
          <input
            id="node-code"
            data-testid="field-code"
            value={node.filter}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) => update({ filter: e.target.value.trim() ? e.target.value.trim() : undefined })}
          />
          <p>Conversion uses this code. The name on the drawing can stay a local placeholder.</p>
        </>
      )}

      {isSelect(node.type) && node.type !== 'select_yesno' && (
        <fieldset>
          <legend>Answers</legend>
          <p>Each answer is a line on the node. A link from that line follows the answer.</p>
          {(node.options ?? []).length === 0 && (
            <p>This question offers nothing to choose. Add the possible answers.</p>
          )}
          {(node.options ?? []).map((op) => (
            <div key={op.id}>
              <label htmlFor={`opt-label-${op.id}`}>Answer</label>
              <input
                id={`opt-label-${op.id}`}
                data-testid={`option-label-${op.id}`}
                value={resolve(op.label, lang, lang) ?? ''}
                readOnly={readOnly}
                disabled={readOnly}
                onChange={(e) => {
                  const options = (node.options ?? []).map((o) =>
                    o.id === op.id
                      ? { ...o, label: e.target.value ? { [lang]: e.target.value } : undefined }
                      : o,
                  )
                  update({ options })
                }}
              />
              <label htmlFor={`opt-name-${op.id}`}>Answer name</label>
              <input
                id={`opt-name-${op.id}`}
                data-testid={`option-name-${op.id}`}
                value={op.name ?? ''}
                readOnly={readOnly}
                disabled={readOnly}
                onChange={(e) => {
                  const options = (node.options ?? []).map((o) =>
                    o.id === op.id ? { ...o, name: e.target.value || undefined } : o,
                  )
                  update({ options })
                }}
              />
              {!readOnly && (
                <button
                  type="button"
                  data-testid={`remove-option-${op.id}`}
                  onClick={() =>
                    update({ options: (node.options ?? []).filter((o) => o.id !== op.id) })
                  }
                >
                  Remove answer
                </button>
              )}
            </div>
          ))}
          {!readOnly && (
            <button
              type="button"
              data-testid="add-option"
              onClick={() => {
                const taken = new Set((node.options ?? []).map((o) => o.id))
                const id = uniqueId('option', taken)
                update({
                  options: [
                    ...(node.options ?? []),
                    { id, name: id.replace(/-/g, '_'), label: { [lang]: 'New answer' } },
                  ],
                })
              }}
            >
              Add answer
            </button>
          )}
        </fieldset>
      )}

      {node.type === 'select_yesno' && (
        <p>Yes and no are the answers. You do not list them separately.</p>
      )}

      {(node.type === 'diagnosis' || node.type === 'proposed_diagnosis') && (
        <>
          <label htmlFor="node-severity">Severity</label>
          <select
            id="node-severity"
            data-testid="field-severity"
            value={node.severity ?? ''}
            disabled={readOnly}
            onChange={(e) =>
              update({
                severity: (e.target.value || undefined) as TriccNode['severity'],
              })
            }
          >
            <option value="">Not set</option>
            <option value="light">Light</option>
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
          </select>
          <label htmlFor="node-priority">Priority</label>
          <input
            id="node-priority"
            type="number"
            data-testid="field-priority"
            value={node.priority ?? ''}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) =>
              update({
                priority: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
          />
        </>
      )}

      {node.type === 'populate' && (
        <>
          <label htmlFor="node-context">Read from</label>
          <select
            id="node-context"
            data-testid="field-context"
            value={node.context ?? ''}
            disabled={readOnly}
            onChange={(e) =>
              update({
                context: (e.target.value || undefined) as TriccNode['context'],
              })
            }
          >
            <option value="">Not set</option>
            <option value="patient">Patient</option>
            <option value="facility">Facility</option>
            <option value="practitioner">Practitioner</option>
            <option value="location">Location</option>
            <option value="encounter">Encounter</option>
            <option value="history">History</option>
          </select>
        </>
      )}

      {node.type === 'continue_with' && (
        <>
          <label htmlFor="node-continue-intervention">Target intervention</label>
          <select
            id="node-continue-intervention"
            data-testid="field-continue-intervention"
            value={node.intervention ?? ''}
            disabled={readOnly}
            onChange={(e) => update({ intervention: e.target.value || undefined })}
          >
            <option value="">Choose an intervention</option>
            {project.interventions.map((iv) => (
              <option key={iv.id} value={iv.id}>
                {resolve(iv.title, lang, lang) ?? iv.id}
              </option>
            ))}
          </select>
          <label htmlFor="node-continue-condition">Start condition</label>
          <textarea
            id="node-continue-condition"
            data-testid="field-continue-condition"
            value={node.condition ?? ''}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) => update({ condition: e.target.value || undefined })}
          />
          <label htmlFor="node-continue-delay">Delay</label>
          <input
            id="node-continue-delay"
            data-testid="field-continue-delay"
            value={node.delay ?? ''}
            placeholder="P3D"
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) => update({ delay: e.target.value || undefined })}
          />
          <p>An ISO-8601 period, for example P3D. This is not the UCUM duration used by an intervention start.</p>
        </>
      )}

      {node.type === 'goto' && (
        <>
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
        <label htmlFor="node-instance">Instance</label>
        <input
          id="node-instance"
          type="number"
          data-testid="field-instance"
          value={node.instance ?? ''}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(e) =>
            update({ instance: e.target.value === '' ? undefined : Number(e.target.value) })
          }
        />
        </>
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

      <CqlExpressionField
        id="node-expression"
        testId="field-relevance-expression"
        label="Relevance — CQL"
        rows={2}
        value={node.relevance?.expression ?? ''}
        readOnly={readOnly}
        activityId={activityId}
        onReveal={onReveal}
        onChange={(expression) =>
          update({
            relevance: mergeExpression(node.relevance, {
              expression: expression || undefined,
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

const GROUP_LABEL: Record<string, string> = {
  flow: 'Flow',
  questions: 'Questions',
  logic: 'Logic',
  data: 'Data',
  clinical: 'Clinical',
}

const TYPE_LABEL: Partial<Record<NodeType, string>> = {
  start: 'Start',
  activity_start: 'Activity start',
  activity_end: 'Activity end',
  end: 'End',
  goto: 'Go to activity',
  link_in: 'Link in',
  link_out: 'Link out',
  bridge: 'Bridge',
  wait: 'Wait',
  continue_with: 'Continue with',
  select_one: 'Single choice',
  select_multiple: 'Multiple choice',
  select_yesno: 'Yes or no',
  select_option: 'Choice',
  integer: 'Whole number',
  decimal: 'Decimal number',
  quantity: 'Quantity',
  text: 'Text',
  date: 'Date',
  note: 'Note',
  calculate: 'Calculation',
  rhombus: 'Decision',
  count: 'Count',
  add: 'Add',
  not: 'Not',
  populate: 'Prefilled value',
  diagnosis: 'Diagnosis',
  proposed_diagnosis: 'Proposed diagnosis',
}

const REF_TYPES = new Set<NodeType>(['rhombus', 'diagnosis', 'proposed_diagnosis'])

const BRANCH_CHOICES: { kind: BranchKind; label: string; value: string | undefined }[] = [
  { kind: 'unconditional', label: 'Unconditional', value: undefined },
  { kind: 'yes', label: 'Yes', value: 'yes' },
  { kind: 'no', label: 'No', value: 'no' },
  { kind: 'continue', label: 'Follow', value: 'continue' },
]

/**
 * Branch semantics as a typed choice rather than free text. Free-typing `yes` into a
 * condition field is the most common draw.io authoring error this removes.
 */
export function EdgeProperties({
  activityId,
  edge,
  readOnly,
  onReveal,
}: {
  activityId: string
  edge: TriccEdge
  readOnly: boolean
  onReveal?: (activityId: string, nodeId: string) => void
}) {
  const mutate = useMutate()
  const project = useProjectSnapshot()
  const lang = project.languages.default
  const source = project.activities[activityId]?.nodes[edge.source]
  const followed = answerEdgeCaption(source, edge.value, lang)
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

      {followed && answerCode(edge.value) && (
        <p data-testid="edge-answer">Follows {followed.title}.</p>
      )}

      {kind === 'condition' && (
        <CqlExpressionField
          id="edge-condition"
          testId="field-branch-condition"
          label="Condition — CQL"
          rows={2}
          value={edge.value ?? ''}
          readOnly={readOnly}
          activityId={activityId}
          onReveal={onReveal}
          onChange={(expression) => set(expression)}
        />
      )}
    </section>
  )
}

function shorten(text: string): string {
  return text.length > 42 ? `${text.slice(0, 41)}…` : text
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
      'quantity',
      'text',
      'date',
      'calculate',
      'count',
      'add',
      'populate',
      'diagnosis',
      'proposed_diagnosis',
      'activity_start',
      'continue_with',
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
  // An activity may finish in several places, so Activity end stays on the palette.
  if (type === 'start' || type === 'activity_start') {
    return !existing.some((n) => n.type === 'start' || n.type === 'activity_start')
  }
  if (type === 'select_option') return false // reached through its parent select
  return true
}

const DRAG_THRESHOLD_PX = 4

/**
 * Palette entries are dragged onto the diagram. A click, or a keyboard press, still
 * adds the node below the lowest one.
 */
function NodePalette({
  nodes,
  onAdd,
  clientToFlow,
  onDraggingChange,
}: {
  nodes: Record<string, TriccNode>
  onAdd: (type: NodeType, at?: { x: number; y: number }) => void
  clientToFlow: (clientX: number, clientY: number) => { x: number; y: number } | undefined
  onDraggingChange: (dragging: boolean) => void
}) {
  const onAddRef = useRef(onAdd)
  const clientToFlowRef = useRef(clientToFlow)
  onAddRef.current = onAdd
  clientToFlowRef.current = clientToFlow
  const gesture = useRef<{ type: NodeType; x: number; y: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const stopDrag = useRef<(() => void) | null>(null)
  const [ghost, setGhost] = useState<{ type: NodeType; x: number; y: number } | null>(null)

  useEffect(() => {
    onDraggingChange(ghost !== null)
  }, [ghost, onDraggingChange])

  useEffect(() => () => stopDrag.current?.(), [])

  useEffect(() => {
    if (!ghost) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (gesture.current?.moved) suppressClick.current = true
      gesture.current = null
      stopDrag.current?.()
      stopDrag.current = null
      setGhost(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ghost])

  const pointerDown = (type: NodeType) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    stopDrag.current?.()
    suppressClick.current = false
    gesture.current = { type, x: event.clientX, y: event.clientY, moved: false }
    const move = (ev: PointerEvent) => {
      const current = gesture.current
      if (!current) return
      const dx = ev.clientX - current.x
      const dy = ev.clientY - current.y
      if (!current.moved && dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return
      current.moved = true
      setGhost({ type: current.type, x: ev.clientX, y: ev.clientY })
    }
    const clear = () => {
      stopDrag.current?.()
      stopDrag.current = null
      gesture.current = null
      setGhost(null)
    }
    const finish = (ev: PointerEvent) => {
      const current = gesture.current
      const moved = current?.moved ?? false
      clear()
      if (!moved || !current) return
      suppressClick.current = true
      const hit = document.elementFromPoint(ev.clientX, ev.clientY)
      if (!hit?.closest('[data-testid="activity-canvas"]')) return
      const at = clientToFlowRef.current(ev.clientX, ev.clientY)
      if (at) onAddRef.current(current.type, at)
    }
    const cancel = () => {
      if (gesture.current?.moved) suppressClick.current = true
      clear()
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', cancel)
    }
    stopDrag.current = stop
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', cancel)
  }

  return (
    <div className="tricc-palette" aria-labelledby="palette-heading">
      <h2 id="palette-heading">Add a node</h2>
      <p className="tricc-palette__hint">Drag onto the diagram to choose where it lands.</p>
      {Object.entries(NODE_TYPE_GROUPS).map(([group, types]) => (
        <fieldset key={group} data-testid={`palette-${group}`} className="tricc-palette__group">
          <legend>{GROUP_LABEL[group] ?? group}</legend>
          {types
            .filter((t) => canOffer(t, nodes))
            .map((type) => (
              <button
                key={type}
                type="button"
                data-testid={`add-${type}`}
                title="Drag onto the diagram to place it"
                onPointerDown={pointerDown(type)}
                onClick={() => {
                  if (suppressClick.current) {
                    suppressClick.current = false
                    return
                  }
                  onAdd(type)
                }}
              >
                {TYPE_LABEL[type] ?? type}
              </button>
            ))}
        </fieldset>
      ))}
      {ghost &&
        createPortal(
          <div
            className="tricc-palette-ghost"
            data-testid="palette-drag-ghost"
            style={{ left: ghost.x, top: ghost.y }}
          >
            {TYPE_LABEL[ghost.type] ?? ghost.type}
          </div>,
          document.body,
        )}
    </div>
  )
}
