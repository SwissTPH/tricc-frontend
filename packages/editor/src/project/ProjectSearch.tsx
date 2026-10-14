import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { searchProject, type ConceptKey } from '@tricc/core'
import { useProjectSnapshot } from '../runtime/context.js'

/**
 * What a search across the project found, by source: dictionary concepts, processes,
 * activities, nodes. A hit opens where it lives; Escape, Close and the backdrop close it.
 */
export function ProjectSearchDialog({
  query,
  onClose,
  onOpenConcept,
  onOpenActivity,
  onOpenNode,
}: {
  query: string
  onClose: () => void
  onOpenConcept?: (key: ConceptKey) => void
  onOpenActivity: (activityId: string) => void
  onOpenNode?: (activityId: string, nodeId: string) => void
}) {
  const project = useProjectSnapshot()
  const result = useMemo(() => searchProject(project, query), [project, query])
  const cardRef = useRef<HTMLDivElement>(null)
  const total = result.concepts.length + result.processes.length + result.activities.length + result.nodes.length

  useEffect(() => {
    cardRef.current?.querySelector<HTMLElement>('ul button, [data-testid="project-search-close"]')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const open = (go: () => void) => () => {
    go()
    onClose()
  }

  return createPortal(
    <div
      className="tricc-library-modal"
      data-testid="project-search-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={cardRef}
        className="tricc-library-modal__card tricc-library-modal__card--wide tricc-search"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-search-title"
        data-testid="project-search-results"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="project-search-title">“{query.trim()}” in the project</h2>
        {total === 0 && <p data-testid="project-search-none">Nothing in the project matches.</p>}
        <Hits source="concepts" title="Data dictionary" count={result.concepts.length}>
          {result.concepts.map(({ concept, dictionary }) => (
            <li key={`${concept.system}|${concept.code}`}>
              <button
                type="button"
                data-testid={`search-hit-concept-${concept.code}`}
                disabled={!onOpenConcept}
                onClick={open(() => onOpenConcept?.({ system: concept.system, code: concept.code }))}
              >
                <span className="tricc-search__main">{concept.display ?? concept.code}</span>
                <span className="tricc-search__detail">
                  {concept.code} · {dictionary}
                </span>
              </button>
            </li>
          ))}
        </Hits>
        <Hits source="processes" title="Processes" count={result.processes.length}>
          {result.processes.map((hit) => (
            <li key={hit.activityId}>
              <button
                type="button"
                data-testid={`search-hit-process-${hit.activityId}`}
                onClick={open(() => onOpenActivity(hit.activityId))}
              >
                <span className="tricc-search__main">{hit.title}</span>
                <span className="tricc-search__detail">{hit.process ?? hit.activityId}</span>
              </button>
            </li>
          ))}
        </Hits>
        <Hits source="activities" title="Activities" count={result.activities.length}>
          {result.activities.map((hit) => (
            <li key={hit.activityId}>
              <button
                type="button"
                data-testid={`search-hit-activity-${hit.activityId}`}
                onClick={open(() => onOpenActivity(hit.activityId))}
              >
                <span className="tricc-search__main">{hit.title}</span>
                <span className="tricc-search__detail">{hit.activityId}</span>
              </button>
            </li>
          ))}
        </Hits>
        <Hits source="nodes" title="Nodes" count={result.nodes.length}>
          {result.nodes.map((hit) => (
            <li key={`${hit.activityId}|${hit.nodeId}`}>
              <button
                type="button"
                data-testid={`search-hit-node-${hit.activityId}-${hit.nodeId}`}
                disabled={!onOpenNode}
                onClick={open(() => onOpenNode?.(hit.activityId, hit.nodeId))}
              >
                <span className="tricc-search__main">{hit.text}</span>
                <span className="tricc-search__detail">
                  {hit.type} · {hit.activityTitle}
                </span>
              </button>
            </li>
          ))}
        </Hits>
        <div className="tricc-library-modal__actions">
          <button type="button" data-testid="project-search-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Hits({ source, title, count, children }: { source: string; title: string; count: number; children: ReactNode }) {
  if (count === 0) return null
  return (
    <section data-testid={`project-search-${source}`}>
      <h3>
        {title} ({count})
      </h3>
      <ul className="tricc-search__list">{children}</ul>
    </section>
  )
}
