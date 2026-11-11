import { useState } from 'react'
import { activityKind, processOf, resolve } from '@tricc/core'
import { useProjectSnapshot } from '../runtime/context.js'
import { Input } from '../components/ui/input.js'

/** The segments or the activities, as a grid of cards in the main area. */
export type LibraryKind = 'process' | 'activity'

/**
 * The Segments and Activities tabs open this grid. A card opens its page; the search narrows
 * the grid by title, id or process.
 */
export function LibraryView({
  kind,
  onOpen,
}: {
  kind: LibraryKind
  onOpen: (activityId: string) => void
}) {
  const project = useProjectSnapshot()
  const lang = project.languages.default
  const [query, setQuery] = useState('')
  const heading = kind === 'process' ? 'Segments' : 'Activities'
  const title = (id: string) => resolve(project.activities[id]?.title, lang, lang) ?? id

  const usedBy = new Map<string, string[]>()
  for (const iv of project.interventions) {
    for (const ref of iv.activities) usedBy.set(ref.ref, [...(usedBy.get(ref.ref) ?? []), iv.id])
  }
  const callers = new Map<string, number>()
  for (const a of Object.values(project.activities)) {
    for (const n of Object.values(a.nodes)) {
      if (n.type === 'goto' && n.link) callers.set(n.link, (callers.get(n.link) ?? 0) + 1)
    }
  }

  const ids = Object.keys(project.activities)
    .sort()
    .filter((id) => activityKind(project.activities[id]!) === kind)
  const needle = query.trim().toLowerCase()
  const shown = needle
    ? ids.filter((id) =>
        `${title(id)} ${id} ${processOf(project.activities[id]!) ?? ''}`
          .toLowerCase()
          .includes(needle),
      )
    : ids

  return (
    <div className="tricc-library" data-testid={`library-view-${kind}`}>
      <header className="tricc-library__header">
        <h1>
          {heading} <span className="tricc-library__count">{ids.length}</span>
        </h1>
        <Input
          size="sm"
          type="search"
          aria-label={`Search ${heading.toLowerCase()}`}
          data-testid={`library-search-${kind}`}
          placeholder="Search by title, id or process"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>
      {ids.length === 0 ? (
        <p className="tricc-library__empty" data-testid={`library-none-${kind}`}>
          No {heading.toLowerCase()} yet. Use + New {kind === 'process' ? 'segment' : 'activity'} in
          the bar above to add one, or Import to bring one in from a file.
        </p>
      ) : shown.length === 0 ? (
        <p className="tricc-library__empty" data-testid={`library-no-match-${kind}`}>
          No {heading.toLowerCase()} match.
        </p>
      ) : (
        <ul className="tricc-library__grid" data-testid={`library-grid-${kind}`}>
          {shown.map((id) => {
            const activity = project.activities[id]!
            const nodes = activity.nodeOrder.length
            const users = usedBy.get(id) ?? []
            const calls = callers.get(id) ?? 0
            return (
              <li key={id}>
                <button
                  type="button"
                  className="tricc-library__card"
                  data-testid={`library-card-${id}`}
                  data-kind={kind}
                  title={`Open ${title(id)}`}
                  onClick={() => onOpen(id)}
                >
                  <span className="tricc-library__title">{title(id)}</span>
                  <code className="tricc-library__id">{activity.name ?? id}</code>
                  {kind === 'process' && (
                    <span className="tricc-library__process">
                      {processOf(activity) ?? 'no process'}
                    </span>
                  )}
                  <span className="tricc-library__meta">
                    {nodes} node{nodes === 1 ? '' : 's'}
                    {kind === 'activity' &&
                      ` · called from ${calls} place${calls === 1 ? '' : 's'}`}
                  </span>
                  {users.length > 0 && (
                    <span className="tricc-library__meta">Used by {users.join(', ')}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
