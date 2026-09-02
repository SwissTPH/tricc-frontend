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
export function ProjectOverview() {
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
        <ul>
          {project.interventions.map((iv) => (
            <li key={iv.id} data-testid={`intervention-${iv.id}`}>
              <h3>{resolve(iv.title, lang, lang) ?? iv.id}</h3>
              <p data-testid={`intervention-${iv.id}-trigger`}>
                Starts: {iv.trigger?.mode ?? 'on-demand'}
              </p>
              {iv.applicability && (
                <p data-testid={`intervention-${iv.id}-applicability`}>
                  Applies when:{' '}
                  {resolve(iv.applicability.intent, lang, lang) ??
                    iv.applicability.expression ??
                    'not yet specified'}
                </p>
              )}
              <ol>
                {iv.processes.map((pg) => (
                  <li key={pg.process}>
                    <strong>{pg.process}</strong>
                    <ul>
                      {pg.activities.map((ref) => (
                        <li key={ref.ref} data-testid={`intervention-${iv.id}-activity-${ref.ref}`}>
                          {ref.ref}
                          {ref.applicability && <span title="conditional"> (conditional)</span>}
                          {(usage.get(ref.ref)?.length ?? 0) > 1 && (
                            <span data-testid={`shared-${ref.ref}`}> (shared)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>

              <details data-testid={`edit-intervention-${iv.id}`}>
                <summary>Edit</summary>
                <InterventionEditor intervention={iv} project={project} readOnly={!canWrite} />
              </details>
            </li>
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
                  processes: [],
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

export function ValidationSummary({ issues }: { issues: Issue[] }) {
  const errors = issues.filter((i) => i.severity === 'error')
  const warnings = issues.filter((i) => i.severity === 'warning')
  return (
    <section aria-labelledby="validation-heading" data-testid="validation-summary">
      <h2 id="validation-heading">Validation</h2>
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
    for (const pg of iv.processes) {
      for (const ref of pg.activities) {
        map.set(ref.ref, [...(map.get(ref.ref) ?? []), iv.id])
      }
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
