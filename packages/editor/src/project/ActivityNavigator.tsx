import { useState } from 'react'
import {
  CPG_PROCESSES,
  activityKind,
  createActivity,
  createProcessActivity,
  processOf,
  resolve,
} from '@tricc/core'
import { useCanWrite, useMutate, useProjectSnapshot } from '../runtime/context.js'
import { uniqueId } from './Overview.js'

/**
 * The activity list, showing the two kinds distinctly.
 *
 * Process activities are entry points for a clinical segment; normal activities are the
 * reusable content they call. Presenting them as one undifferentiated list is what made
 * the distinction invisible in the first place.
 */
export function ActivityNavigator({
  selected,
  onSelect,
}: {
  selected: string | undefined
  onSelect: (id: string | undefined) => void
}) {
  const project = useProjectSnapshot()
  const canWrite = useCanWrite()
  const mutate = useMutate()
  const lang = project.languages.default
  const [newProcess, setNewProcess] = useState('')

  const ids = Object.keys(project.activities).sort()
  const processActivities = ids.filter((id) => activityKind(project.activities[id]!) === 'process')
  const normalActivities = ids.filter((id) => activityKind(project.activities[id]!) !== 'process')

  const label = (id: string) => resolve(project.activities[id]?.title, lang, lang) ?? id

  const addActivity = () => {
    const id = uniqueId('activity', new Set(ids))
    mutate((tx) => tx.addActivity(createActivity({ id, title: id, language: lang })))
    onSelect(id)
  }

  const addProcessActivity = () => {
    const process = newProcess.trim()
    if (process === '') return
    const id = uniqueId(`${process}-process`, new Set(ids))
    mutate((tx) =>
      tx.addActivity(createProcessActivity({ id, process, title: process, language: lang })),
    )
    setNewProcess('')
    onSelect(id)
  }

  return (
    <nav data-testid="activity-navigator">
      <button type="button" data-testid="nav-overview" onClick={() => onSelect(undefined)}>
        Project overview
      </button>

      <section aria-label="Process activities">
        <h2>Processes</h2>
        <ul data-testid="process-activity-list">
          {processActivities.map((id) => (
            <li key={id}>
              <button
                type="button"
                data-testid={`nav-activity-${id}`}
                data-kind="process"
                aria-current={selected === id}
                title={`Starts the ${processOf(project.activities[id]!) ?? 'unnamed'} process`}
                onClick={() => onSelect(id)}
              >
                {label(id)}
                <span className="tricc-nav__process">
                  {processOf(project.activities[id]!) ?? 'no process'}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {processActivities.length === 0 && (
          <p data-testid="no-process-activities">
            No processes yet. A process activity is the entry point for a segment of care, and calls
            the activities that make it up.
          </p>
        )}

        {canWrite && (
          <div className="tricc-add-process-activity">
            <label htmlFor="new-process-activity">Start a process</label>
            <input
              id="new-process-activity"
              list="cpg-processes"
              data-testid="new-process-name"
              placeholder="e.g. registration"
              value={newProcess}
              onChange={(e) => setNewProcess(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addProcessActivity()
              }}
            />
            {/* The canonical list is offered as suggestions, but free text is permitted:
                tricc_oo gives an unrecognised process the next free order slot. */}
            <datalist id="cpg-processes">
              {CPG_PROCESSES.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <button
              type="button"
              data-testid="add-process-activity"
              disabled={newProcess.trim() === ''}
              onClick={addProcessActivity}
            >
              Add process activity
            </button>
          </div>
        )}
      </section>

      <section aria-label="Activities">
        <h2>Activities</h2>
        <ul data-testid="activity-list">
          {normalActivities.map((id) => (
            <li key={id}>
              <button
                type="button"
                data-testid={`nav-activity-${id}`}
                data-kind="activity"
                aria-current={selected === id}
                onClick={() => onSelect(id)}
              >
                {label(id)}
              </button>
            </li>
          ))}
        </ul>
        {canWrite && (
          <button type="button" data-testid="add-activity" onClick={addActivity}>
            Add activity
          </button>
        )}
      </section>
    </nav>
  )
}
