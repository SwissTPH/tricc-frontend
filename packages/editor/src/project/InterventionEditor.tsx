import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
          title={title}
          onCancel={cancelDelete}
          onConfirm={() => {
            mutate((tx) => tx.removeIntervention(intervention.id))
            setConfirmingDelete(false)
            setSettingsOpen(false)
          }}
        />
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

function Dialog({
  testId,
  titleId,
  title,
  onClose,
  onSave,
  onDelete,
  deleteTestId,
  children,
}: {
  testId: string
  titleId: string
  title: string
  onClose: () => void
  /** Present on the intervention settings dialog. Closes it; edits are already stored. */
  onSave?: () => void
  /** Opens the delete confirmation. Hidden while the project is read-only. */
  onDelete?: () => void
  deleteTestId?: string
  children: ReactNode
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    cardRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="tricc-library-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={cardRef}
        className="tricc-library-modal__card tricc-library-modal__card--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="tricc-library-modal__header">
          <h2 id={titleId}>{title}</h2>
          <span className="tricc-library-modal__header-actions">
            {onSave && (
              <button
                type="button"
                className="tricc-icon-button tricc-icon-button--primary"
                aria-label="Save"
                title="Save"
                data-testid={`${testId}-save`}
                onClick={onSave}
              >
                <SaveIcon />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="tricc-icon-button tricc-icon-button--danger"
                aria-label="Delete"
                title="Delete"
                data-testid={deleteTestId}
                onClick={onDelete}
              >
                <BinIcon />
              </button>
            )}
            <button
              type="button"
              className="tricc-icon-button"
              aria-label="Close"
              title="Close"
              data-testid={`${testId}-close`}
              onClick={onClose}
            >
              <CloseIcon />
            </button>
          </span>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

function ConfirmDelete({
  testId,
  title,
  onCancel,
  onConfirm,
}: {
  testId: string
  title: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      onCancel()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onCancel])

  return createPortal(
    <div
      className="tricc-library-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        className="tricc-library-modal__card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${testId}-title`}
        data-testid={`${testId}-dialog`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id={`${testId}-title`}>Delete this intervention?</h2>
        <p>
          This removes {title}. Its activities stay in the library.
        </p>
        <div className="tricc-library-modal__actions">
          <button type="button" ref={cancelRef} data-testid={`${testId}-cancel`} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="tricc-danger-text"
            data-testid={`${testId}-confirm`}
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 1.5h7.1L14 5.4V14a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 2 14V2a.5.5 0 0 1 .5-.5H3zm.5 1V13h9V5.8L9.7 2.5H3.5zM5 9h6v4H5V9zm1-6h3v2H6V3z"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.2 2.2 8 7l4.8-4.8 1 1L9 8l4.8 4.8-1 1L8 9l-4.8 4.8-1-1L7 8 2.2 3.2l1-1z"
      />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11.5 2h-3l-.4 2.1a6 6 0 0 0-1.5.9L4.4 4.1 2.6 7.2l1.7 1.3a6 6 0 0 0 0 1.8l-1.7 1.3 1.8 3.1 2.2-.9a6 6 0 0 0 1.5.9l.4 2.1h3l.4-2.1a6 6 0 0 0 1.5-.9l2.2.9 1.8-3.1-1.7-1.3a6 6 0 0 0 0-1.8l1.7-1.3-1.8-3.1-2.2.9a6 6 0 0 0-1.5-.9L11.5 2zM10 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"
      />
    </svg>
  )
}

function BinIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 2h4l1 1h3v1H2V3h3l1-1zM3.5 6h1v7h-1V6zm3 0h1v7h-1V6zm3 0h1v7h-1V6zM4 5h8l-.6 9H4.6L4 5z"
      />
    </svg>
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
