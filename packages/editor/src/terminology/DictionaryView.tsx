import { useMemo, useState } from 'react'
import {
  ConceptIndex,
  conceptText,
  conceptUsage,
  type Concept,
  type ConceptKey,
  type Project,
} from '@tricc/core'
import { useCanWrite, useProjectSnapshot } from '../runtime/context.js'
import { ConceptDialog, type ConceptTarget } from './ConceptDialog.js'

/**
 * The data dictionary: every concept in one list, with its code, display and
 * questionnaire text. A row opens the concept in a dialog; + adds one.
 */
export function DictionaryView({
  open,
  onOpen,
  onOpenNode,
}: {
  /** The concept whose dialog is open, if any. */
  open?: ConceptKey
  onOpen: (key: ConceptKey | undefined) => void
  onOpenNode?: (activityId: string, nodeId: string) => void
}) {
  const project = useProjectSnapshot()
  const canWrite = useCanWrite()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const lang = project.languages.default
  const index = useMemo(() => ConceptIndex.fromProject(project), [project])
  const rows = useMemo(() => listed(project, index, query), [project, index, query])
  const target: ConceptTarget | undefined = creating ? { draft: {} } : open ? { key: open } : undefined

  return (
    <section className="tricc-dictionary" data-testid="dictionary-view" aria-labelledby="dictionary-heading">
      <header className="tricc-editor__header">
        <h1 id="dictionary-heading">Data dictionary</h1>
        <input
          type="search"
          data-testid="concept-search"
          aria-label="Find a concept"
          placeholder="Search code, display, or text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {canWrite && (
          <button type="button" data-testid="concept-add" onClick={() => setCreating(true)}>
            + Concept
          </button>
        )}
      </header>
      {rows.length === 0 ? (
        <p className="tricc-dictionary__empty" data-testid="no-concepts">
          {query ? 'No concept matches.' : 'The data dictionary is empty. Use + Concept to add one.'}
        </p>
      ) : (
        <div className="tricc-dictionary__scroll">
          <table className="tricc-dictionary__table" data-testid="concept-table">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Display</th>
                <th scope="col">Questionnaire text</th>
                <th scope="col">Used</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ concept, uses }) => (
                <tr
                  key={`${concept.system}|${concept.code}`}
                  data-testid={`concept-row-${concept.code}`}
                  tabIndex={0}
                  onClick={() => onOpen({ system: concept.system, code: concept.code })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onOpen({ system: concept.system, code: concept.code })
                  }}
                >
                  <td className="tricc-dictionary__code">{concept.code}</td>
                  <td>{concept.display ?? ''}</td>
                  <td>{questionnaire(concept, lang)}</td>
                  <td>{uses === 0 ? '—' : uses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {target && (
        <ConceptDialog
          target={target}
          onClose={() => {
            setCreating(false)
            onOpen(undefined)
          }}
          onOpenNode={onOpenNode}
        />
      )}
    </section>
  )
}

/** The questionnaire text only when it says more than the display. */
function questionnaire(concept: Concept, lang: string): string {
  const text = conceptText(concept, 'q-display', lang, lang) ?? ''
  return text === concept.display ? '' : text
}

function listed(project: Project, index: ConceptIndex, query: string) {
  const concepts = query.trim()
    ? index.search(query.trim(), { limit: 500 }).map((m) => m.concept)
    : Object.values(project.codeSystems).flatMap((cs) =>
        cs.conceptOrder.map((code) => cs.concepts[code]).filter((c): c is Concept => c !== undefined),
      )
  return concepts.map((concept) => ({
    concept,
    uses: conceptUsage(project, { system: concept.system, code: concept.code }).length,
  }))
}
