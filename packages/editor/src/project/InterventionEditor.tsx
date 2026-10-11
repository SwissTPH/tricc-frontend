import { useCallback, useState } from 'react'
import {
  CPG_PROCESSES,
  IMPLEMENTED_TRIGGER_MODES,
  createProcessActivity,
  isProcessActivity,
  processOf,
  resolve,
  TRIGGER_MODES,
  type Intervention,
  type Project,
} from '@tricc/core'
import { useMutate } from '../runtime/context.js'
import { CqlExpressionField } from '../cql/CqlExpressionField.js'
import { Typeahead, type TypeaheadOption } from '../components/Typeahead.js'
import { BinIcon, ConfirmDelete, Dialog, GearIcon, mergeExpression } from '../components/Dialog.js'

/**
 * An intervention card.
 *
 * The card lists the processes it runs, in order. A page activity stays in the
 * library and is opened from a process, so it is not a row on the card.
 * The gear holds the start: title, code, when it is offered, and who it is for.
 */
export function InterventionEditor({
  intervention,
  project,
  readOnly,
  onReveal,
  onSelect,
  sharedWith,
}: {
  intervention: Intervention
  project: Project
  readOnly: boolean
  onReveal?: (activityId: string, nodeId: string) => void
  onSelect?: (activityId: string) => void
  sharedWith?: Map<string, string[]>
}) {
  const mutate = useMutate()
  const lang = project.languages.default
  const [newProcess, setNewProcess] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const closeSettings = useCallback(() => {
    setSettingsOpen(false)
    setConfirmingDelete(false)
  }, [])
  const cancelDelete = useCallback(() => setConfirmingDelete(false), [])
  const closeAdd = useCallback(() => setAddOpen(false), [])

  const update = (patch: Partial<Intervention>) => {
    mutate((tx) => tx.updateIntervention({ ...intervention, ...patch }))
  }

  const title = resolve(intervention.title, lang, lang) ?? intervention.id
  const processes = intervention.activities.filter((ref) => {
    const activity = project.activities[ref.ref]
    return activity ? isProcessActivity(activity) : false
  })
  const activityIds = Object.keys(project.activities).sort()
  const used = new Set(intervention.activities.map((a) => a.ref))
  const processIds = activityIds.filter((id) => {
    const activity = project.activities[id]
    return activity ? isProcessActivity(activity) : false
  })
  const addable = processIds.filter((id) => !used.has(id))

  return (
    <li className="tricc-intervention-card" data-testid={`intervention-${intervention.id}`}>
      <header className="tricc-intervention-card__header">
        <h3>{title}</h3>
        <button
          type="button"
          className="tricc-icon-button"
          data-testid={`configure-intervention-${intervention.id}`}
          aria-label={`Configure ${title}`}
          title="Start, title, and who this is for"
          onClick={() => {
            setAddOpen(false)
            setSettingsOpen(true)
          }}
        >
          <GearIcon />
        </button>
      </header>
      <p data-testid={`intervention-${intervention.id}-trigger`}>
        Starts: {intervention.trigger?.mode ?? 'on-demand'}
      </p>
      {intervention.applicability && (
        <p data-testid={`intervention-${intervention.id}-applicability`}>
          Applies when:{' '}
          {resolve(intervention.applicability.intent, lang, lang) ??
            intervention.applicability.expression ??
            'not yet specified'}
        </p>
      )}

      {processes.length === 0 && (
        <p data-testid={`iv-no-activities-${intervention.id}`}>
          No processes yet. Add one with +.
        </p>
      )}
      <ol className="tricc-process-rows" data-testid={`iv-activities-${intervention.id}`}>
        {processes.map((ref, index) => {
          const activity = project.activities[ref.ref]
          const label = resolve(activity?.title, lang, lang) ?? ref.ref
          const process = activity ? processOf(activity) : undefined
          const others = (sharedWith?.get(ref.ref) ?? []).filter((other) => other !== intervention.id)
          return (
            <li
              key={ref.ref}
              className="tricc-process-row"
              data-testid={`intervention-${intervention.id}-activity-${ref.ref}`}
            >
              <button
                type="button"
                className="tricc-chip"
                data-kind="process"
                title={process ? `Starts the ${process} process` : label}
                onClick={() => onSelect?.(ref.ref)}
              >
                {label}
                <span className="tricc-nav__process">{process ?? 'no process'}</span>
                {others.length > 0 && (
                  <span
                    className="tricc-nav__shared"
                    data-testid={`shared-${ref.ref}`}
                    title={`The same process as on ${others.join(', ')}`}
                  >
                    shared
                  </span>
                )}
              </button>
              {!readOnly && (
                <span className="tricc-process-row__actions">
                  <button
                    type="button"
                    className="tricc-icon-button"
                    aria-label={`Move ${ref.ref} earlier`}
                    data-testid={`move-up-${intervention.id}-${ref.ref}`}
                    disabled={index === 0}
                    onClick={() =>
                      update({
                        activities: moveProcess(intervention.activities, ref.ref, -1, (id) =>
                          isListedProcess(project, id),
                        ),
                      })
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="tricc-icon-button"
                    aria-label={`Move ${ref.ref} later`}
                    data-testid={`move-down-${intervention.id}-${ref.ref}`}
                    disabled={index === processes.length - 1}
                    onClick={() =>
                      update({
                        activities: moveProcess(intervention.activities, ref.ref, 1, (id) =>
                          isListedProcess(project, id),
                        ),
                      })
                    }
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="tricc-icon-button tricc-icon-button--danger"
                    aria-label={`Remove ${ref.ref}`}
                    data-testid={`remove-activity-${intervention.id}-${ref.ref}`}
                    onClick={() =>
                      update({
                        activities: intervention.activities.filter((item) => item.ref !== ref.ref),
                      })
                    }
                  >
                    <BinIcon />
                  </button>
                </span>
              )}
            </li>
          )
        })}
      </ol>
      {!readOnly && (
        <button
          type="button"
          className="tricc-icon-button tricc-intervention-card__add"
          data-testid={`add-process-to-${intervention.id}`}
          aria-label="Add a process"
          title="Add a process"
          onClick={() => {
            setSettingsOpen(false)
            setAddOpen(true)
          }}
        >
          +
        </button>
      )}

      {settingsOpen && (
        <Dialog
          testId={`intervention-settings-${intervention.id}`}
          titleId={`intervention-settings-title-${intervention.id}`}
          title={title}
          onClose={closeSettings}
          onSave={readOnly ? undefined : closeSettings}
          onDelete={readOnly ? undefined : () => setConfirmingDelete(true)}
          deleteTestId={`delete-intervention-${intervention.id}`}
        >
          <div data-testid={`intervention-editor-${intervention.id}`} className="tricc-intervention">
            <label htmlFor={`iv-title-${intervention.id}`}>Title</label>
            <input
              id={`iv-title-${intervention.id}`}
              data-testid={`iv-title-${intervention.id}`}
              value={resolve(intervention.title, lang, lang) ?? ''}
              disabled={readOnly}
              onChange={(e) =>
                update({ title: e.target.value ? { [lang]: e.target.value } : undefined })
              }
            />

            <label htmlFor={`iv-name-${intervention.id}`}>Name</label>
            <input
              id={`iv-name-${intervention.id}`}
              data-testid={`iv-name-${intervention.id}`}
              value={intervention.name ?? ''}
              placeholder={intervention.id}
              disabled={readOnly}
              onChange={(e) => update({ name: e.target.value || undefined })}
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
                    mode: e.target.value as NonNullable<Intervention['trigger']>['mode'],
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

            <CqlExpressionField
              id={`iv-cql-${intervention.id}`}
              testId={`iv-cql-${intervention.id}`}
              label="Applies when — CQL"
              rows={2}
              value={intervention.applicability?.expression ?? ''}
              readOnly={readOnly}
              onReveal={onReveal}
              onChange={(expression) =>
                update({
                  applicability: mergeExpression(intervention.applicability, {
                    expression: expression || undefined,
                  }),
                })
              }
            />
          </div>
        </Dialog>
      )}

      {settingsOpen && confirmingDelete && !readOnly && (
        <ConfirmDelete
          testId={`delete-intervention-${intervention.id}`}
          heading="Delete this intervention?"
          onCancel={cancelDelete}
          onConfirm={() => {
            mutate((tx) => tx.removeIntervention(intervention.id))
            setConfirmingDelete(false)
            setSettingsOpen(false)
          }}
        >
          <p>This removes {title}. Its activities stay in the library.</p>
        </ConfirmDelete>
      )}

      {addOpen && !readOnly && (
        <Dialog
          testId={`add-process-dialog-${intervention.id}`}
          titleId={`add-process-title-${intervention.id}`}
          title="Add a process"
          onClose={closeAdd}
        >
          <Typeahead
            testId={`add-activity-to-${intervention.id}`}
            label="Process"
            placeholder="Search processes…"
            options={addable.map((id) => activityOption(id, project))}
            emptyMessage="No process matches, and this project has none by that name."
            exhaustedMessage={
              processIds.length === 0
                ? 'This project has no processes yet. Create one below, or add one with + on the Processes tab.'
                : 'Every process in this project is already listed.'
            }
            onSelect={(id) => {
              update({ activities: [...intervention.activities, { ref: id }] })
              closeAdd()
            }}
          />
          <div className="tricc-add-process">
            <label htmlFor={`process-name-${intervention.id}`}>New process</label>
            <input
              id={`process-name-${intervention.id}`}
              list={`cpg-processes-${intervention.id}`}
              data-testid={`process-name-${intervention.id}`}
              value={newProcess}
              placeholder="e.g. registration"
              onChange={(e) => setNewProcess(e.target.value)}
            />
            <datalist id={`cpg-processes-${intervention.id}`}>
              {CPG_PROCESSES.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <button
              type="button"
              data-testid={`create-process-activity-${intervention.id}`}
              disabled={newProcess.trim() === ''}
              onClick={() => {
                const process = newProcess.trim()
                const taken = new Set(Object.keys(project.activities))
                const id = uniqueActivityId(`${process}-process`, taken)
                mutate((tx) => {
                  tx.addActivity(
                    createProcessActivity({ id, process, title: process, language: lang }),
                  )
                  tx.updateIntervention({
                    ...intervention,
                    activities: [...intervention.activities, { ref: id }],
                  })
                })
                setNewProcess('')
                closeAdd()
              }}
            >
              Create process activity
            </button>
          </div>
        </Dialog>
      )}
    </li>
  )
}

function isListedProcess(project: Project, id: string): boolean {
  const activity = project.activities[id]
  return activity ? isProcessActivity(activity) : false
}

/** Swap a process with the previous or next process, leaving any other rows where they are. */
function moveProcess(
  activities: Intervention['activities'],
  ref: string,
  delta: number,
  isProcess: (id: string) => boolean,
): Intervention['activities'] {
  const indexes = activities
    .map((item, index) => (isProcess(item.ref) ? index : -1))
    .filter((index) => index >= 0)
  const from = activities.findIndex((item) => item.ref === ref)
  const pos = indexes.indexOf(from)
  const target = indexes[pos + delta]
  if (pos < 0 || target === undefined) return activities
  const next = activities.map((item) => ({ ...item }))
  const swap = next[from]!
  next[from] = next[target]!
  next[target] = swap
  return next
}

function uniqueActivityId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

function activityOption(id: string, project: Project): TypeaheadOption {
  const activity = project.activities[id]
  const lang = project.languages.default
  const title = resolve(activity?.title, lang, lang)
  return title && title !== id ? { id, label: title, hint: id } : { id, label: id }
}
