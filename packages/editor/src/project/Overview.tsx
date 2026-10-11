import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { validateProject, resolve, type Issue, type Project } from '@tricc/core'
import { useCanWrite, useMutate, useProjectSnapshot } from '../runtime/context.js'
import { InterventionEditor } from './InterventionEditor.js'
import { BinIcon, ConfirmDelete, GearIcon } from '../components/Dialog.js'

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
  onRename,
  onDelete,
  deleteNote,
}: {
  /** Open the question named by an expression. */
  onOpen?: (activityId: string, nodeId: string) => void
  /** Open a process activity. */
  onSelect?: (activityId: string) => void
  /** The project was renamed: the host updates its project list. */
  onRename?: (name: string) => void
  /** Shows the bin; called once the author confirms the delete. */
  onDelete?: () => void
  /** What deleting does to the files, said in the confirmation (host-specific). */
  deleteNote?: string
} = {}) {
  const project = useProjectSnapshot()
  const canWrite = useCanWrite()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const closeSettings = useCallback(() => setSettingsOpen(false), [])
  const cancelDelete = useCallback(() => setConfirmingDelete(false), [])
  const mutate = useMutate()
  const issues = useMemo(() => validateProject(project), [project])
  const lang = project.languages.default

  const usage = useMemo(() => activityUsage(project), [project])

  return (
    <div data-testid="project-overview">
      <div className="tricc-overview__title">
        <h1>{resolve(project.title, lang, lang) ?? project.id}</h1>
        <button
          type="button"
          className="tricc-icon-button"
          data-testid="configure-project"
          aria-label="Project settings"
          title="Project settings"
          onClick={() => setSettingsOpen(true)}
        >
          <GearIcon />
        </button>
        {canWrite && onDelete && (
          <button
            type="button"
            className="tricc-icon-button tricc-icon-button--danger"
            data-testid="delete-project"
            aria-label="Delete project"
            title="Delete project"
            onClick={() => setConfirmingDelete(true)}
          >
            <BinIcon />
          </button>
        )}
      </div>
      {settingsOpen && (
        <ProjectSettings
          readOnly={!canWrite}
          onClose={closeSettings}
          onSave={(title) => {
            mutate((tx) => tx.setProjectTitle({ ...project.title, [lang]: title }))
            onRename?.(title)
            setSettingsOpen(false)
          }}
        />
      )}
      {confirmingDelete && onDelete && (
        <ConfirmDelete
          testId="delete-project"
          heading="Delete this project?"
          onCancel={cancelDelete}
          onConfirm={() => {
            setConfirmingDelete(false)
            onDelete()
          }}
        >
          <p>This removes {resolve(project.title, lang, lang) ?? project.id} from your projects.</p>
          {deleteNote && <p data-testid="delete-project-note">{deleteNote}</p>}
        </ConfirmDelete>
      )}

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

/** Project settings: its name. A draft until Save; Cancel or Escape discards it. */
function ProjectSettings({
  readOnly,
  onClose,
  onSave,
}: {
  readOnly: boolean
  onClose: () => void
  onSave: (title: string) => void
}) {
  const project = useProjectSnapshot()
  const lang = project.languages.default
  const [title, setTitle] = useState(resolve(project.title, lang, lang) ?? project.id)
  const inputRef = useRef<HTMLInputElement>(null)
  const name = title.trim()

  useEffect(() => {
    inputRef.current?.focus()
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
      <form
        className="tricc-library-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-settings-title"
        data-testid="project-settings"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          if (name && !readOnly) onSave(name)
        }}
      >
        <h2 id="project-settings-title">Project settings</h2>
        <label htmlFor="project-title">Name</label>
        <input
          ref={inputRef}
          id="project-title"
          data-testid="project-title"
          value={title}
          disabled={readOnly}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p>Shown in your project list and saved as the project title in tricc.yaml.</p>
        <div className="tricc-library-modal__actions">
          {!readOnly && (
            <button type="submit" data-testid="project-settings-save" disabled={!name}>
              Save
            </button>
          )}
          <button type="button" data-testid="project-settings-cancel" onClick={onClose}>
            {readOnly ? 'Close' : 'Cancel'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

