import { useMemo, useState } from 'react'
import {
  ConceptIndex,
  conceptRichText,
  conceptText,
  imageRefs,
  imageSrc,
  conceptUsage,
  projectDictionaries,
  type Concept,
  type ConceptKey,
  type Project,
} from '@tricc/core'
import { useCanWrite, useMutate, useProjectSnapshot } from '../runtime/context.js'
import { draggingFiles, imageFiles, useAddImages } from '../media/images.js'
import { withPictureFirst } from '../media/attach.js'
import { TextImage } from '../text/RichTextField.js'
import { ConceptDialog, type ConceptTarget } from './ConceptDialog.js'

/**
 * A data dictionary: its concepts in one list, with code, display and questionnaire text.
 * A row opens the concept in a dialog; + adds one to this dictionary. Without `system`, every
 * concept of the project.
 */
export function DictionaryView({
  system,
  open,
  onOpen,
  onOpenNode,
}: {
  /** The dictionary shown (canonical url). It may not exist yet: its first concept creates it. */
  system?: string
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
  const rows = useMemo(() => listed(project, index, query, system), [project, index, query, system])
  const dictionary = system ? projectDictionaries(project).find((d) => d.url === system) : undefined
  const target: ConceptTarget | undefined = creating
    ? { draft: system ? { system } : {} }
    : open
      ? { key: open }
      : undefined
  const mutate = useMutate()
  const addImages = useAddImages()
  const [dropRow, setDropRow] = useState<string | undefined>(undefined)

  /** A picture file dropped on a row: into the library, then first in that concept's text. */
  const dropOn = (concept: Concept, files: File[]) => {
    void addImages(files.slice(0, 1)).then(([id]) => {
      if (id) mutate((tx) => tx.upsertConcept(concept.system, withPictureFirst(concept, id, lang)))
    })
  }

  return (
    <section className="tricc-dictionary" data-testid="dictionary-view" aria-labelledby="dictionary-heading">
      <header className="tricc-editor__header">
        <h1 id="dictionary-heading">
          Data dictionary{dictionary ? <span data-testid="dictionary-id"> — {dictionary.id}</span> : null}
        </h1>
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
      {dictionary?.kind === 'calculate' && (
        <p className="tricc-nav__note" data-testid="dictionary-calculate-note">
          The values logic computes: calculations, counts, sums and diagnoses. A CQL library can be
          made from them. Decisions are only nodes and have no concept.
        </p>
      )}
      {rows.length === 0 ? (
        <p className="tricc-dictionary__empty" data-testid="no-concepts">
          {query
            ? 'No concept matches.'
            : dictionary?.kind === 'calculate'
              ? 'No calculation or diagnosis has a concept yet. Create one from the node, or use + Concept.'
              : 'The data dictionary is empty. Use + Concept to add one.'}
        </p>
      ) : (
        <div className="tricc-dictionary__scroll">
          <table className="tricc-dictionary__table" data-testid="concept-table">
            <thead>
              <tr>
                <th scope="col" className="tricc-dictionary__picture">
                  <span className="tricc-visually-hidden">Picture</span>
                </th>
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
                  data-over={dropRow === `${concept.system}|${concept.code}` ? 'true' : undefined}
                  onDragOver={(e) => {
                    if (!canWrite || !draggingFiles(e)) return
                    e.preventDefault()
                    setDropRow(`${concept.system}|${concept.code}`)
                  }}
                  onDragLeave={() => setDropRow(undefined)}
                  onDrop={(e) => {
                    if (!canWrite || !draggingFiles(e)) return
                    e.preventDefault()
                    setDropRow(undefined)
                    dropOn(concept, imageFiles(e.dataTransfer.files))
                  }}
                >
                  <td className="tricc-dictionary__picture">
                    {(() => {
                      const text = conceptRichText(concept, 'q-display', lang, lang)
                      const id = text === undefined ? undefined : imageRefs(text)[0]
                      return id ? <TextImage src={imageSrc(id)} className="tricc-dictionary__thumb" /> : null
                    })()}
                  </td>
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

function listed(project: Project, index: ConceptIndex, query: string, system: string | undefined) {
  const concepts = query.trim()
    ? index.search(query.trim(), { limit: 500, ...(system ? { codeSystem: system } : {}) }).map((m) => m.concept)
    : Object.values(project.codeSystems).filter((cs) => !system || cs.url === system).flatMap((cs) =>
        cs.conceptOrder.map((code) => cs.concepts[code]).filter((c): c is Concept => c !== undefined),
      )
  return concepts.map((concept) => ({
    concept,
    uses: conceptUsage(project, { system: concept.system, code: concept.code }).length,
  }))
}
