import { useCallback, useState } from 'react'
import {
  activityKind,
  processOf,
  resolve,
  rootNode,
  type Activity,
  type Project,
} from '@tricc/core'
import { useMutate } from '../runtime/context.js'
import { CqlExpressionField } from '../cql/CqlExpressionField.js'
import { RepeatFields } from './RepeatFields.js'
import { ConfirmDelete, Dialog, mergeExpression } from '../components/Dialog.js'

/** The fallback `tricc_oo` uses when an activity has no name. */
export function titleSlug(activity: Activity, lang: string): string {
  const title = resolve(activity.title, lang, lang) ?? activity.id
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** Interventions that list the activity, and activities whose goto or wait points at it. */
export function activityReferences(
  project: Project,
  activityId: string,
): { interventions: string[]; linkedFrom: string[] } {
  const lang = project.languages.default
  const interventions = project.interventions
    .filter((iv) => iv.activities.some((ref) => ref.ref === activityId))
    .map((iv) => resolve(iv.title, lang, lang) ?? iv.id)
  const linkedFrom = Object.values(project.activities)
    .filter((a) => a.id !== activityId)
    .filter((a) =>
      Object.values(a.nodes).some(
        (n) =>
          n.link === activityId ||
          (typeof n.reference === 'object' &&
            !Array.isArray(n.reference) &&
            'activity' in n.reference &&
            n.reference.activity === activityId),
      ),
    )
    .map((a) => resolve(a.title, lang, lang) ?? a.id)
    .sort()
  return { interventions, linkedFrom }
}

/** One goto that leads to an activity. */
export interface GotoCaller {
  activityId: string
  nodeId: string
  /** The calling activity's title, numbered when it has more than one goto here. */
  label: string
}

/** Every goto, in any activity, whose target is `activityId`. Sorted by calling activity. */
export function goToCallers(project: Project, activityId: string): GotoCaller[] {
  const lang = project.languages.default
  const callers: GotoCaller[] = []
  for (const activity of Object.values(project.activities)) {
    const gotos = Object.values(activity.nodes).filter(
      (n) => n.type === 'goto' && n.link === activityId,
    )
    const title = resolve(activity.title, lang, lang) ?? activity.id
    gotos.forEach((n, i) =>
      callers.push({
        activityId: activity.id,
        nodeId: n.id,
        label: gotos.length > 1 ? `${title} (${i + 1})` : title,
      }),
    )
  }
  return callers.sort((a, b) => a.label.localeCompare(b.label))
}

/** The gotos that lead to an activity; each opens its activity on that goto. */
export function CalledBy({
  project,
  activityId,
  onOpenCaller,
}: {
  project: Project
  activityId: string
  onOpenCaller?: (activityId: string, nodeId: string) => void
}) {
  const callers = goToCallers(project, activityId)
  return (
    <div className="tricc-called-by" data-testid="called-by">
      <h3>Called by</h3>
      {callers.length === 0 ? (
        <p data-testid="called-by-none">No goto leads here.</p>
      ) : (
        <ul>
          {callers.map((c) => (
            <li key={`${c.activityId}/${c.nodeId}`}>
              {onOpenCaller ? (
                <button
                  type="button"
                  className="tricc-link-button"
                  data-testid={`called-by-${c.activityId}-${c.nodeId}`}
                  title="Open that activity on its goto"
                  onClick={() => onOpenCaller(c.activityId, c.nodeId)}
                >
                  {c.label}
                </button>
              ) : (
                <span data-testid={`called-by-${c.activityId}-${c.nodeId}`}>{c.label}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Activity settings: title, name, process (process pages), and applicability.
 * Fields apply as they are edited, like the intervention gear. Nothing is kept as a draft.
 */
export function ActivitySettings({
  activity,
  project,
  readOnly,
  onClose,
  onDeleted,
  onReveal,
  onOpenCaller,
}: {
  activity: Activity
  project: Project
  readOnly: boolean
  onClose: () => void
  onDeleted: () => void
  onReveal?: (activityId: string, nodeId: string) => void
  /** Open a goto that leads to this activity. */
  onOpenCaller?: (activityId: string, nodeId: string) => void
}) {
  const mutate = useMutate()
  const lang = project.languages.default
  const title = resolve(activity.title, lang, lang) ?? activity.id
  const kind = activityKind(activity)
  const root = rootNode(activity)
  const [confirming, setConfirming] = useState(false)
  const cancelDelete = useCallback(() => setConfirming(false), [])

  const setApplicability = (patch: Parameters<typeof mergeExpression>[1]) =>
    mutate((tx) =>
      tx.setActivityApplicability(activity.id, mergeExpression(activity.applicability, patch)),
    )

  return (
    <>
      <Dialog
        testId="activity-settings"
        titleId="activity-settings-title"
        title={title}
        onClose={onClose}
        onSave={readOnly ? undefined : onClose}
        onDelete={readOnly ? undefined : () => setConfirming(true)}
        deleteTestId="activity-settings-delete"
      >
        <div className="tricc-intervention">
          <label htmlFor="act-title">Title</label>
          <input
            id="act-title"
            data-testid="act-title"
            value={resolve(activity.title, lang, lang) ?? ''}
            disabled={readOnly}
            onChange={(e) => mutate((tx) => tx.setActivityTitle(activity.id, { [lang]: e.target.value }))}
          />

          <label htmlFor="act-name">Name</label>
          <input
            id="act-name"
            data-testid="act-name"
            value={activity.name ?? ''}
            placeholder={titleSlug(activity, lang)}
            disabled={readOnly}
            onChange={(e) => mutate((tx) => tx.setActivityName(activity.id, e.target.value || undefined))}
          />

          {kind === 'process' && (
            <>
              <label htmlFor="act-process">Process</label>
              <input
                id="act-process"
                data-testid="act-process"
                list="cpg-processes"
                value={processOf(activity) ?? ''}
                disabled={readOnly}
                onChange={(e) => {
                  const process = e.target.value || undefined
                  mutate((tx) => tx.setActivityProcess(activity.id, process))
                }}
              />
            </>
          )}

          <label htmlFor="act-intent">Applies when — in words</label>
          <input
            id="act-intent"
            data-testid="act-intent"
            value={resolve(activity.applicability?.intent, lang, lang) ?? ''}
            disabled={readOnly}
            onChange={(e) =>
              setApplicability({ intent: e.target.value ? { [lang]: e.target.value } : undefined })
            }
          />

          <CqlExpressionField
            id="act-cql"
            testId="act-cql"
            label="Applies when — CQL"
            rows={2}
            value={activity.applicability?.expression ?? ''}
            readOnly={readOnly}
            activityId={activity.id}
            onReveal={onReveal}
            onChange={(expression) => setApplicability({ expression: expression || undefined })}
          />
          <p>Applies on top of the start condition of every intervention that lists this activity.</p>

          {root?.type === 'activity_start' && (
            <RepeatFields
              node={root}
              readOnly={readOnly}
              idPrefix="act"
              onChange={(patch) => mutate((tx) => tx.updateNode(activity.id, { ...root, ...patch }))}
            />
          )}

          <CalledBy
            project={project}
            activityId={activity.id}
            onOpenCaller={
              onOpenCaller &&
              ((activityId, nodeId) => {
                onClose()
                onOpenCaller(activityId, nodeId)
              })
            }
          />
        </div>
      </Dialog>

      {confirming && !readOnly && (
        <ConfirmActivityDelete
          activity={activity}
          project={project}
          onCancel={cancelDelete}
          onDeleted={() => {
            setConfirming(false)
            onDeleted()
          }}
        />
      )}
    </>
  )
}

export function ConfirmActivityDelete({
  activity,
  project,
  onCancel,
  onDeleted,
}: {
  activity: Activity
  project: Project
  onCancel: () => void
  onDeleted: () => void
}) {
  const mutate = useMutate()
  const lang = project.languages.default
  const title = resolve(activity.title, lang, lang) ?? activity.id
  const { interventions, linkedFrom } = activityReferences(project, activity.id)
  return (
    <ConfirmDelete
      testId="delete-activity"
      heading="Delete this activity?"
      onCancel={onCancel}
      onConfirm={() => {
        mutate((tx) => tx.deleteActivity(activity.id))
        onDeleted()
      }}
    >
      <p>This removes {title} from the project.</p>
      {interventions.length > 0 && (
        <p data-testid="delete-activity-listed-by">
          Listed by: {interventions.join(', ')}. It is taken off those interventions.
        </p>
      )}
      {linkedFrom.length > 0 && (
        <p data-testid="delete-activity-linked-from">
          Linked from: {linkedFrom.join(', ')}. Those links will show as missing.
        </p>
      )}
    </ConfirmDelete>
  )
}
