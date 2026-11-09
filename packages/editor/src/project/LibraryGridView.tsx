import { useState } from 'react'
import { activityKind, processOf, resolve } from '@tricc/core'
import { useProjectSnapshot } from '../runtime/context.js'
import { Input } from '../components/ui/input.js'

/** The two lists the navigator can open as a grid in the main area. */
export type LibraryGridKind = 'process' | 'activity'

/**
 * Every segment, or every activity, as a grid of cards in the main area. A filter narrows the
 * grid by title, id or process; a card opens its page.
 */
export function LibraryGridView({
  kind,
  onOpen,
}: {
  kind: LibraryGridKind
  onOpen: (activityId: string) => void
}) {
  const project = useProjectSnapshot()
  const lang = project.languages.default
  const [query, setQuery] = useState('')
  const title = (id: string) => resolve(project.activities[id]?.title, lang, lang) ?? id

  const usedBy = new Map<string, string[]>()
  for (const iv of project.interventions) {
    for (const ref of iv.activities) usedBy.set(ref.ref, [...(usedBy.get(ref.ref) ?? []), iv.id])
  }

  const ids = Object.keys(project.activities)
    .sort()
    .filter((id) => activityKind(project.activities[id]!) === kind)
  const needle = query.trim().toLowerCase()
  const shown = needle
    ? ids.filter((id) => {
        const process = kind === 'process' ? (processOf(project.activities[id]!) ?? '') : ''
        return `${title(id)} ${id} ${process}`.toLowerCase().includes(needle)
      })
    : ids
  const plural = kind === 'process' ? 'segments' : 'activities'
  const heading = kind === 'process' ? 'Segments' : 'Activities'

  return (
    <div className="tricc-library-grid" data-testid={`${kind}-grid-view`}>
      <h1>{heading}</h1>
      <div className="tricc-library-grid__filters">
        <Input
          size="sm"
          type="search"
          aria-label={`Filter ${plural}`}
          data-testid={`${kind}-grid-search`}
          placeholder="Filter by name, id or process"
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="tricc-library-grid__count" data-testid={`${kind}-grid-count`}>
          {needle ? `${shown.length} of ${ids.length}` : ids.length} {plural}
        </span>
      </div>
      {ids.length === 0 && (
        <p data-testid={`${kind}-grid-none`}>
          No {plural} yet. Use + on the {heading} tab to add one.
        </p>
      )}
      {ids.length > 0 && shown.length === 0 && (
        <p data-testid={`${kind}-grid-no-match`}>No {plural} match.</p>
      )}
      <ul className="tricc-library-grid__list" data-testid={`${kind}-grid`}>
        {shown.map((id) => {
          const activity = project.activities[id]!
          const users = usedBy.get(id) ?? []
          const nodes = activity.nodeOrder.length
          return (
            <li key={id}>
              <button
                type="button"
                className="tricc-library-grid__card"
                data-testid={`grid-activity-${id}`}
                data-kind={kind}
                onClick={() => onOpen(id)}
              >
                <span className="tricc-library-grid__title">{title(id)}</span>
                <code>{id}</code>
                <span className="tricc-library-grid__meta">
                  {kind === 'process' && <span>{processOf(activity) ?? 'no process'} · </span>}
                  {nodes} node{nodes === 1 ? '' : 's'}
                </span>
                {users.length > 0 && (
                  <span className="tricc-library-grid__meta">Used by {users.join(', ')}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
