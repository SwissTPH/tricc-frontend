import { useState } from 'react'
import {
  CPG_PROCESSES,
  IMPLEMENTED_TRIGGER_MODES,
  activityKind,
  createProcessActivity,
  processOf,
  TRIGGER_MODES,
  resolve,
  type Intervention,
  type Project,
} from '@tricc/core'
import { useMutate } from '../runtime/context.js'
import { Typeahead, type TypeaheadOption } from '../components/Typeahead.js'

/**
 * Layer 0 editing: which activities make up this package, and which suit this patient
 * (feature/20260826-project-and-interventions.md §2).
 *
 * Applicability appears at two levels and they are deliberately separate: an activity's
 * own applicability travels with it wherever it is used, while the per-reference one is
 * true only in this intervention. Collapsing them would force duplicating an activity to
 * vary its applicability, which is the copy-and-drift failure this is meant to prevent.
 */
export function InterventionEditor({
  intervention,
  project,
  readOnly,
}: {
  intervention: Intervention
  project: Project
  readOnly: boolean
}) {
  const mutate = useMutate()
  const lang = project.languages.default
  const [newProcess, setNewProcess] = useState('')

  const update = (patch: Partial<Intervention>) => {
    mutate((tx) => tx.updateIntervention({ ...intervention, ...patch }))
  }

  const usedProcesses = new Set(intervention.processes.map((p) => p.process))
  const availableProcesses = CPG_PROCESSES.filter((p) => !usedProcesses.has(p))
  // An intervention lists process activities. A normal activity cannot be a process entry
  // point without a wrapper, so offering one here would only produce a validation error.
  const processActivityIds = Object.keys(project.activities)
    .filter((id) => activityKind(project.activities[id]!) === 'process')
    .sort()

  return (
    <div data-testid={`intervention-editor-${intervention.id}`} className="tricc-intervention">
      <label htmlFor={`iv-title-${intervention.id}`}>Title</label>
      <input
        id={`iv-title-${intervention.id}`}
        data-testid={`iv-title-${intervention.id}`}
        value={resolve(intervention.title, lang, lang) ?? ''}
        disabled={readOnly}
        onChange={(e) => update({ title: e.target.value ? { [lang]: e.target.value } : undefined })}
      />

      <label htmlFor={`iv-code-${intervention.id}`}>Code</label>
      <input
        id={`iv-code-${intervention.id}`}
        data-testid={`iv-code-${intervention.id}`}
        value={intervention.code ?? ''}
        disabled={readOnly}
        onChange={(e) => update({ code: e.target.value || undefined })}
      />

      <label htmlFor={`iv-trigger-${intervention.id}`}>Starts</label>
      <select
        id={`iv-trigger-${intervention.id}`}
        data-testid={`iv-trigger-${intervention.id}`}
        value={intervention.trigger?.mode ?? 'on-demand'}
        disabled={readOnly}
        onChange={(e) =>
          update({
            trigger: {
              mode: e.target.value as Intervention['trigger'] extends undefined
                ? never
                : 'on-demand',
            },
          })
        }
      >
        {TRIGGER_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {mode}
            {(IMPLEMENTED_TRIGGER_MODES as readonly string[]).includes(mode)
              ? ''
              : ' (needs the planning layer)'}
          </option>
        ))}
      </select>

      <label htmlFor={`iv-intent-${intervention.id}`}>Applies when — in words</label>
      <input
        id={`iv-intent-${intervention.id}`}
        data-testid={`iv-intent-${intervention.id}`}
        value={resolve(intervention.applicability?.intent, lang, lang) ?? ''}
        disabled={readOnly}
        onChange={(e) =>
          update({
            applicability: mergeExpression(intervention.applicability, {
              intent: e.target.value ? { [lang]: e.target.value } : undefined,
            }),
          })
        }
      />

      <label htmlFor={`iv-cql-${intervention.id}`}>Applies when — CQL</label>
      <input
        id={`iv-cql-${intervention.id}`}
        data-testid={`iv-cql-${intervention.id}`}
        value={intervention.applicability?.expression ?? ''}
        disabled={readOnly}
        onChange={(e) =>
          update({
            applicability: mergeExpression(intervention.applicability, {
              expression: e.target.value || undefined,
            }),
          })
        }
      />

      <h4>Processes</h4>
      {intervention.processes.length === 0 && (
        <p data-testid={`iv-no-processes-${intervention.id}`}>
          No processes yet, so selecting this intervention would do nothing.
        </p>
      )}

      <ol className="tricc-process-list">
        {intervention.processes.map((pg, pgIndex) => {
          const used = new Set(pg.activities.map((a) => a.ref))
          // Only entry points for this process: one listed under the wrong process is an
          // error, so it should not be offerable in the first place.
          const addable = processActivityIds.filter(
            (id) =>
              !used.has(id) && (processOf(project.activities[id]!) ?? pg.process) === pg.process,
          )
          return (
            <li key={pg.process} data-testid={`iv-process-${intervention.id}-${pg.process}`}>
              <strong>{pg.process}</strong>
              {!readOnly && (
                <button
                  type="button"
                  data-testid={`remove-process-${intervention.id}-${pg.process}`}
                  onClick={() =>
                    update({ processes: intervention.processes.filter((_, i) => i !== pgIndex) })
                  }
                >
                  Remove process
                </button>
              )}

              <ul>
                {pg.activities.map((ref, refIndex) => (
                  <li
                    key={ref.ref}
                    data-testid={`iv-activity-${intervention.id}-${pg.process}-${ref.ref}`}
                  >
                    <span>{ref.ref}</span>
                    {!readOnly && (
                      <>
                        <button
                          type="button"
                          aria-label={`Move ${ref.ref} earlier`}
                          data-testid={`move-up-${intervention.id}-${pg.process}-${ref.ref}`}
                          disabled={refIndex === 0}
                          onClick={() =>
                            update({
                              processes: move(intervention.processes, pgIndex, refIndex, -1),
                            })
                          }
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${ref.ref} later`}
                          data-testid={`move-down-${intervention.id}-${pg.process}-${ref.ref}`}
                          disabled={refIndex === pg.activities.length - 1}
                          onClick={() =>
                            update({
                              processes: move(intervention.processes, pgIndex, refIndex, 1),
                            })
                          }
                        >
                          ↓
                        </button>
                      </>
                    )}
                    <input
                      aria-label={`When ${ref.ref} applies`}
                      placeholder="Applies when (CQL) — leave blank for always"
                      data-testid={`iv-activity-cql-${intervention.id}-${ref.ref}`}
                      value={ref.applicability?.expression ?? ''}
                      disabled={readOnly}
                      onChange={(e) => {
                        const next = structuredClone(intervention.processes)
                        const target = next[pgIndex]?.activities[refIndex]
                        if (!target) return
                        const expression = e.target.value || undefined
                        if (expression === undefined) delete target.applicability
                        else target.applicability = { ...target.applicability, expression }
                        update({ processes: next })
                      }}
                    />
                    {!readOnly && (
                      <button
                        type="button"
                        data-testid={`remove-activity-${intervention.id}-${pg.process}-${ref.ref}`}
                        onClick={() => {
                          const next = structuredClone(intervention.processes)
                          next[pgIndex]!.activities = next[pgIndex]!.activities.filter(
                            (_, i) => i !== refIndex,
                          )
                          update({ processes: next })
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {!readOnly && (
                <Typeahead
                  testId={`add-activity-to-${intervention.id}-${pg.process}`}
                  label={`Add an activity to ${pg.process}`}
                  placeholder="Search activities…"
                  options={addable.map((id) => activityOption(id, project))}
                  emptyMessage="No activity matches, and this project has none by that name."
                  exhaustedMessage={
                    processActivityIds.length === 0
                      ? `No process activity starts "${pg.process}" yet.`
                      : `Every process activity for "${pg.process}" is already listed.`
                  }
                  onSelect={(id) => {
                    const next = structuredClone(intervention.processes)
                    next[pgIndex]!.activities.push({ ref: id })
                    update({ processes: next })
                  }}
                />
              )}

              {!readOnly && (
                <button
                  type="button"
                  data-testid={`create-process-activity-${intervention.id}-${pg.process}`}
                  onClick={() => {
                    const taken = new Set(Object.keys(project.activities))
                    const id = uniqueActivityId(`${pg.process}-process`, taken)
                    mutate((tx) => {
                      tx.addActivity(
                        createProcessActivity({
                          id,
                          process: pg.process,
                          title: pg.process,
                          language: lang,
                        }),
                      )
                      const next = structuredClone(intervention.processes)
                      next[pgIndex]!.activities.push({ ref: id })
                      tx.updateIntervention({ ...intervention, processes: next })
                    })
                  }}
                >
                  New process activity for {pg.process}
                </button>
              )}
            </li>
          )
        })}
      </ol>

      {!readOnly && (
        <div className="tricc-add-process">
          <label htmlFor={`add-process-${intervention.id}`}>Add a process</label>
          <input
            id={`add-process-${intervention.id}`}
            list={`processes-${intervention.id}`}
            data-testid={`process-name-${intervention.id}`}
            value={newProcess}
            placeholder="e.g. triage"
            onChange={(e) => setNewProcess(e.target.value)}
          />
          {/* The canonical list is offered, but free text is permitted: tricc_oo assigns an
              unrecognized process the next free order slot rather than rejecting it. */}
          <datalist id={`processes-${intervention.id}`}>
            {availableProcesses.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <button
            type="button"
            data-testid={`add-process-${intervention.id}`}
            disabled={newProcess.trim() === '' || usedProcesses.has(newProcess.trim())}
            onClick={() => {
              update({
                processes: [
                  ...intervention.processes,
                  { process: newProcess.trim(), activities: [] },
                ],
              })
              setNewProcess('')
            }}
          >
            Add process
          </button>
        </div>
      )}

      {!readOnly && (
        <button
          type="button"
          data-testid={`delete-intervention-${intervention.id}`}
          onClick={() => mutate((tx) => tx.removeIntervention(intervention.id))}
        >
          Delete intervention
        </button>
      )}
    </div>
  )
}

/** Move an activity reference within its process; order on the link is what expresses sequence. */
function move(
  processes: Intervention['processes'],
  pgIndex: number,
  refIndex: number,
  delta: number,
): Intervention['processes'] {
  const next = structuredClone(processes)
  const list = next[pgIndex]!.activities
  const target = refIndex + delta
  if (target < 0 || target >= list.length) return processes
  const [moved] = list.splice(refIndex, 1)
  list.splice(target, 0, moved!)
  return next
}

function uniqueActivityId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

/** How an activity reads in the picker: its title, with its id as the secondary line. */
function activityOption(id: string, project: Project): TypeaheadOption {
  const activity = project.activities[id]
  const lang = project.languages.default
  const title = resolve(activity?.title, lang, lang)
  return title && title !== id ? { id, label: title, hint: id } : { id, label: id }
}

function mergeExpression(
  current: Intervention['applicability'],
  patch: { intent?: Record<string, string> | undefined; expression?: string | undefined },
): Intervention['applicability'] {
  const next = { ...current, ...patch }
  if (patch.intent === undefined && 'intent' in patch) delete next.intent
  if (patch.expression === undefined && 'expression' in patch) delete next.expression
  const hasIntent = next.intent && Object.keys(next.intent).length > 0
  const hasExpr = next.expression && next.expression !== ''
  return hasIntent || hasExpr ? next : undefined
}
