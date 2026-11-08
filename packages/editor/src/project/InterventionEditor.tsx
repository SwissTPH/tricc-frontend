import { useCallback, useState } from 'react'
import {
  IMPLEMENTED_TRIGGER_MODES,
  interventionParams,
  isProcessActivity,
  processOf,
  resolve,
  showParamValue,
  TRIGGER_MODES,
  type Intervention,
  type Project,
} from '@tricc/core'
import { useMutate } from '../runtime/context.js'
import { CqlExpressionField } from '../cql/CqlExpressionField.js'
import { Typeahead, type TypeaheadOption } from '../components/Typeahead.js'
import { BinIcon, ConfirmDelete, Dialog, mergeExpression } from '../components/Dialog.js'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'
import { LabelsField } from '../components/LabelsField.js'
import { Icon } from '../theme/Icon.js'
import { ArgumentForm } from '../blocks/ArgumentForm.js'
import {
  EMPTY_SEGMENT,
  NewSegmentFields,
  createSegment,
  plannedSegment,
  type SegmentDraft,
} from './NewSegmentFields.js'

/**
 * The intervention editor: a modal opened from the gear on its row of the project table.
 *
 * Everything about the intervention is edited here, including which segments it runs and
 * in what order. Edits are stored as they are made; Save only closes. Adding a segment
 * swaps the dialog for a picker (and back), so one Escape never closes two layers.
 */
export function InterventionDialog({
  intervention,
  project,
  readOnly,
  onReveal,
  onSelect,
  sharedWith,
  labelSuggestions = [],
  onClose,
}: {
  intervention: Intervention
  project: Project
  readOnly: boolean
  onReveal?: (activityId: string, nodeId: string) => void
  onSelect?: (activityId: string) => void
  sharedWith?: Map<string, string[]>
  /** Labels used elsewhere in the project, offered while typing. */
  labelSuggestions?: string[]
  onClose: () => void
}) {
  const mutate = useMutate()
  const lang = project.languages.default
  const [newSegment, setNewSegment] = useState<SegmentDraft>(EMPTY_SEGMENT)
  const [view, setView] = useState<'settings' | 'add'>('settings')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const cancelDelete = useCallback(() => setConfirmingDelete(false), [])
  const backToSettings = useCallback(() => setView('settings'), [])

  const update = (patch: Partial<Intervention>) => {
    mutate((tx) => tx.updateIntervention({ ...intervention, ...patch }))
  }

  const title = resolve(intervention.title, lang, lang) ?? intervention.id
  const processes = segmentsOf(intervention, project)
  const activityIds = Object.keys(project.activities).sort()
  const used = new Set(intervention.activities.map((a) => a.ref))
  const processIds = activityIds.filter((id) => isListedProcess(project, id))
  const addable = processIds.filter((id) => !used.has(id))
  const taken = new Set(activityIds)
  const plan = plannedSegment(newSegment, taken)

  if (view === 'add' && !readOnly) {
    return (
      <Dialog
        key="add"
        testId={`add-process-dialog-${intervention.id}`}
        titleId={`add-process-title-${intervention.id}`}
        title="Add a segment"
        onClose={backToSettings}
      >
        <Typeahead
          testId={`add-activity-to-${intervention.id}`}
          label="Segment"
          placeholder="Search segments…"
          options={addable.map((id) => activityOption(id, project))}
          emptyMessage="No segment matches, and this project has none by that name."
          exhaustedMessage={
            processIds.length === 0
              ? 'This project has no segments yet. Create one below, or add one with + on the Segments tab.'
              : 'Every segment in this project is already listed.'
          }
          onSelect={(id) => {
            update({ activities: [...intervention.activities, { ref: id }] })
            backToSettings()
          }}
        />
        <form
          className="tricc-add-process"
          data-testid={`new-segment-${intervention.id}`}
          onSubmit={(event) => {
            event.preventDefault()
            if (!plan) return
            mutate((tx) => {
              tx.addActivity(createSegment(plan, lang))
              tx.updateIntervention({
                ...intervention,
                activities: [...intervention.activities, { ref: plan.id }],
              })
            })
            setNewSegment(EMPTY_SEGMENT)
            backToSettings()
          }}
        >
          <h4>New segment</h4>
          <NewSegmentFields
            project={project}
            draft={newSegment}
            taken={taken}
            onChange={setNewSegment}
          />
          <Button size="sm" type="submit" data-testid="create-segment" disabled={!plan}>
            Create segment
          </Button>
        </form>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog
        key="settings"
        testId={`intervention-settings-${intervention.id}`}
        titleId={`intervention-settings-title-${intervention.id}`}
        title={title}
        onClose={onClose}
        onSave={readOnly ? undefined : onClose}
        onDelete={readOnly ? undefined : () => setConfirmingDelete(true)}
        deleteTestId={`delete-intervention-${intervention.id}`}
      >
        <div data-testid={`intervention-editor-${intervention.id}`} className="tricc-intervention">
          <label htmlFor={`iv-title-${intervention.id}`}>Title</label>
          <Input
            size="sm"
            id={`iv-title-${intervention.id}`}
            data-testid={`iv-title-${intervention.id}`}
            value={resolve(intervention.title, lang, lang) ?? ''}
            disabled={readOnly}
            onChange={(e) =>
              update({ title: e.target.value ? { [lang]: e.target.value } : undefined })
            }
          />

          <label htmlFor={`iv-name-${intervention.id}`}>Name</label>
          <Input
            size="sm"
            id={`iv-name-${intervention.id}`}
            data-testid={`iv-name-${intervention.id}`}
            value={intervention.name ?? ''}
            placeholder={intervention.id}
            disabled={readOnly}
            onChange={(e) => update({ name: e.target.value || undefined })}
          />

          <div className="tricc-intervention__labels">
            <LabelsField
              size="small"
              value={intervention.labels ?? []}
              suggestions={labelSuggestions}
              disabled={readOnly}
              testId={`iv-labels-${intervention.id}`}
              onChange={(labels) => update({ labels: labels.length ? labels : undefined })}
            />
          </div>

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
          <Input
            size="sm"
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

          <fieldset className="tricc-iv-segments" data-testid={`iv-segments-${intervention.id}`}>
            <legend>Segments</legend>
            <p>
              The parts of the encounter this intervention runs, in order. Each segment implements a
              CPG common process.
            </p>
            {processes.length === 0 && (
              <p data-testid={`iv-no-activities-${intervention.id}`}>No segments yet.</p>
            )}
            <ol className="tricc-segment-list" data-testid={`iv-activities-${intervention.id}`}>
              {processes.map((ref, index) => {
                const activity = project.activities[ref.ref]
                const label = resolve(activity?.title, lang, lang) ?? ref.ref
                const process = activity ? processOf(activity) : undefined
                const others = (sharedWith?.get(ref.ref) ?? []).filter(
                  (other) => other !== intervention.id,
                )
                return (
                  <li
                    key={ref.ref}
                    className="tricc-segment-list__row"
                    data-testid={`intervention-${intervention.id}-activity-${ref.ref}`}
                  >
                    <span className="tricc-segment-list__index">{index + 1}</span>
                    <button
                      type="button"
                      className="tricc-segment-list__title"
                      title={`Open ${label}`}
                      onClick={() => {
                        onClose()
                        onSelect?.(ref.ref)
                      }}
                    >
                      {label}
                    </button>
                    <span className="tricc-nav__process">{process ?? 'no CPG process'}</span>
                    {others.length > 0 && (
                      <span
                        className="tricc-nav__shared"
                        data-testid={`shared-${ref.ref}`}
                        title={`The same segment as on ${others.join(', ')}`}
                      >
                        shared
                      </span>
                    )}
                    {!readOnly && (
                      <span className="tricc-segment-list__actions">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          type="button"
                          aria-label={`Move ${ref.ref} earlier`}
                          title="Earlier"
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
                          <Icon name="arrow_upward" size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          type="button"
                          aria-label={`Move ${ref.ref} later`}
                          title="Later"
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
                          <Icon name="arrow_downward" size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          type="button"
                          aria-label={`Remove ${ref.ref}`}
                          title="Remove from this intervention"
                          data-testid={`remove-activity-${intervention.id}-${ref.ref}`}
                          onClick={() =>
                            update({
                              activities: intervention.activities.filter(
                                (item) => item.ref !== ref.ref,
                              ),
                            })
                          }
                        >
                          <BinIcon />
                        </Button>
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                data-testid={`add-process-to-${intervention.id}`}
                onClick={() => setView('add')}
              >
                <Icon name="add" size={18} />
                Add segment
              </Button>
            )}
          </fieldset>

          <InterventionSettings
            intervention={intervention}
            project={project}
            readOnly={readOnly}
            onChange={(args) => update({ args })}
          />
          <InterventionScope
            intervention={intervention}
            project={project}
            readOnly={readOnly}
            onChange={(requires) => update({ requires })}
          />
        </div>
      </Dialog>

      {confirmingDelete && !readOnly && (
        <ConfirmDelete
          testId={`delete-intervention-${intervention.id}`}
          heading="Delete this intervention?"
          onCancel={cancelDelete}
          onConfirm={() => {
            mutate((tx) => tx.removeIntervention(intervention.id))
            setConfirmingDelete(false)
            onClose()
          }}
        >
          <p>This removes {title}. Its activities stay in the library.</p>
        </ConfirmDelete>
      )}
    </>
  )
}

/** The segments (process activities) an intervention lists, in order. */
export function segmentsOf(
  intervention: Intervention,
  project: Project,
): Intervention['activities'] {
  return intervention.activities.filter((ref) => isListedProcess(project, ref.ref))
}

/**
 * The values this intervention gives the settings of its activities, and of everything they call
 * (feature/20261028-snippets-tab-and-params.md §6). A setting several activities share is asked once.
 */
function InterventionSettings({
  intervention,
  project,
  readOnly,
  onChange,
}: {
  intervention: Intervention
  project: Project
  readOnly: boolean
  onChange: (args: Intervention['args']) => void
}) {
  const lang = project.languages.default
  const rows = interventionParams(project, intervention.id)
  const title = (id: string) => resolve(project.activities[id]?.title, lang, lang) ?? id
  return (
    <fieldset className="tricc-iv-settings" data-testid={`iv-settings-${intervention.id}`}>
      <legend>Settings</legend>
      <p>
        Values for the settings of the activities this intervention lists, and of what they call. A
        value set on a call inside an activity applies below that call only.
      </p>
      <ArgumentForm
        project={project}
        rows={rows}
        values={intervention.args}
        onChange={onChange}
        readOnly={readOnly}
        testId={`iv-arg-${intervention.id}`}
        unsetLabel="Not set"
        inherited={(name) => {
          const row = rows.find((r) => r.name === name)
          const needed = `Needed by ${(row?.activities ?? []).map(title).join(', ')}`
          return {
            from:
              row?.param.default !== undefined
                ? `${needed}. Default: ${showParamValue(row.param.default)}`
                : needed,
          }
        }}
      />
    </fieldset>
  )
}

/** Scope: the interventions this one works with; what they record is not asked again. */
function InterventionScope({
  intervention,
  project,
  readOnly,
  onChange,
}: {
  intervention: Intervention
  project: Project
  readOnly: boolean
  onChange: (requires: Intervention['requires']) => void
}) {
  const lang = project.languages.default
  const others = project.interventions.filter((iv) => iv.id !== intervention.id)
  const chosen = new Set(intervention.requires ?? [])
  return (
    <fieldset className="tricc-iv-scope" data-testid={`iv-scope-${intervention.id}`}>
      <legend>Scope</legend>
      <p>The other interventions this one works with. What they record is in scope here.</p>
      {others.length === 0 && <p>This project has no other intervention.</p>}
      {others.map((iv) => (
        <label key={iv.id} className="tricc-check">
          <input
            type="checkbox"
            data-testid={`iv-scope-${intervention.id}-${iv.id}`}
            checked={chosen.has(iv.id)}
            disabled={readOnly}
            onChange={(e) => {
              const next = new Set(chosen)
              if (e.target.checked) next.add(iv.id)
              else next.delete(iv.id)
              onChange(
                next.size > 0
                  ? project.interventions.map((i) => i.id).filter((id) => next.has(id))
                  : undefined,
              )
            }}
          />
          {resolve(iv.title, lang, lang) ?? iv.id}
        </label>
      ))}
      {[...chosen]
        .filter((id) => !others.some((iv) => iv.id === id))
        .map((id) => (
          <p key={id} className="tricc-field-error">
            “{id}” is not another intervention of this project.{' '}
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => onChange((intervention.requires ?? []).filter((r) => r !== id))}
              >
                Remove
              </Button>
            )}
          </p>
        ))}
    </fieldset>
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

function activityOption(id: string, project: Project): TypeaheadOption {
  const activity = project.activities[id]
  const lang = project.languages.default
  const title = resolve(activity?.title, lang, lang)
  return title && title !== id ? { id, label: title, hint: id } : { id, label: id }
}
