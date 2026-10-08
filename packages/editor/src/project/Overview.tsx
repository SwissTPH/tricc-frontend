import { useMemo } from 'react'
import { validateProject, resolve, type Issue, type Project } from '@tricc/core'
import { useCanWrite, useMutate, useProjectSnapshot } from '../runtime/context.js'
import { InterventionEditor } from './InterventionEditor.js'

/**
 * The layer -1 surface: which interventions are carried together, which activities make
 * up each, and which suit this patient
 * (feature/20260826-project-and-interventions.md §4).
 *
 * Deliberately not a canvas. The project layer is a structured list — until planning
 * exists there is nothing spatial to draw.
 */
export function ProjectOverview({
  onOpen,
  onSelect,
}: {
  /** Open the question named by an expression. */
  onOpen?: (activityId: string, nodeId: string) => void
  /** Open a process activity. */
  onSelect?: (activityId: string) => void
} = {}) {
  const project = useProjectSnapshot()
  const canWrite = useCanWrite()
  const mutate = useMutate()
  const issues = useMemo(() => validateProject(project), [project])
  const lang = project.languages.default

  const usage = useMemo(() => activityUsage(project), [project])

  return (
    <div data-testid="project-overview">
      <h1>{resolve(project.title, lang, lang) ?? project.id}</h1>

      <section aria-labelledby="interventions-heading">
        <h2 id="interventions-heading">Interventions</h2>
        {project.interventions.length === 0 && (
          <p data-testid="no-interventions">
            This project has no interventions yet, so nothing would be offered to a health worker.
          </p>
        )}
        <ul className="tricc-intervention-grid">
          {project.interventions.map((iv) => (
            <InterventionEditor
              key={iv.id}
              intervention={iv}
              project={project}
              readOnly={!canWrite}
              onReveal={onOpen}
              onSelect={onSelect}
              sharedWith={usage}
            />
          ))}
        </ul>
        {canWrite && (
          <button
            type="button"
            data-testid="add-intervention"
            onClick={() => {
              const id = uniqueId('intervention', new Set(project.interventions.map((i) => i.id)))
              mutate((tx) =>
                tx.addIntervention({
                  id,
                  code: id,
                  title: { [lang]: 'New intervention' },
                  trigger: { mode: 'on-demand' },
                  activities: [],
                }),
              )
            }}
          >
            Add intervention
          </button>
        )}
      </section>

      <section aria-labelledby="unassigned-heading">
        <h2 id="unassigned-heading">Unassigned activities</h2>
        {/* Orphaned work is a normal mid-authoring state; hiding it is how it gets lost. */}
        <ul data-testid="unassigned-activities">
          {Object.keys(project.activities)
            .filter((id) => !usage.has(id))
            .sort()
            .map((id) => (
              <li key={id} data-testid={`unassigned-${id}`}>
                {id}
              </li>
            ))}
        </ul>
      </section>

      <ValidationSummary issues={issues} />
    </div>
  )
}

export function ValidationSummary({
  issues,
  heading = true,
}: {
  issues: Issue[]
  /** The inspector tab already names this panel. The project overview keeps the heading. */
  heading?: boolean
}) {
  const errors = issues.filter((i) => i.severity === 'error')
  const warnings = issues.filter((i) => i.severity === 'warning')
  return (
    <section
      aria-labelledby={heading ? 'validation-heading' : undefined}
      aria-label={heading ? undefined : 'Validation'}
      data-testid="validation-summary"
    >
      {heading && <h2 id="validation-heading">Validation</h2>}
      <p data-testid="validation-counts">
        {errors.length} error{errors.length === 1 ? '' : 's'}, {warnings.length} warning
        {warnings.length === 1 ? '' : 's'}
      </p>
      <ul>
        {issues
          .filter((i) => i.severity !== 'info')
          .map((i, idx) => (
            <li key={`${i.rule}-${idx}`} data-testid={`issue-${i.rule}`} data-severity={i.severity}>
              {i.message}
            </li>
          ))}
      </ul>
    </section>
  )
}

/** activity id -> intervention ids that reference it. */
function activityUsage(project: Project): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const iv of project.interventions) {
    for (const ref of iv.activities) {
      map.set(ref.ref, [...(map.get(ref.ref) ?? []), iv.id])
    }
  }
  return map
}

export function uniqueId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}
