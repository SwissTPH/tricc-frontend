import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DATA_TYPES,
  DESIGNATION_USES,
  PARAMETER_KIND,
  paramConceptCode,
  INTERVENTION_SCOPE_URL,
  conceptUsage,
  designationInterventions,
  designationText,
  designationUse,
  findCodeSystem,
  isUnscoped,
  projectDictionaries,
  RETRIEVAL_CODE,
  resolve,
  retrievalUsage,
  scopeExtension,
  withConceptText,
  withDesignationText,
  type Concept,
  type ConceptKey,
  type Designation,
  type DesignationUse,
  type DisplayText,
  type Project,
} from '@tricc/core'
import {
  useCanWrite,
  useEditorPreferences,
  useMutate,
  useProjectSnapshot,
} from '../runtime/context.js'
import { RichTextField } from '../text/RichTextField.js'
import { ensureDictionary } from './codeSystems.js'
import { draggingFiles, imageFiles, useAddImages } from '../media/images.js'
import { withPictureFirst } from '../media/attach.js'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'
import { WrappingInput } from '../components/WrappingInput.js'
import { Textarea } from '../components/ui/textarea.js'
import { RetrievalFields } from './RetrievalFields.js'

const CODE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const USE_LABELS: Record<DesignationUse, string> = {
  display: 'Display',
  'q-display': 'Questionnaire text',
  hint: 'Hint',
  help: 'Help',
}
const RICH: DesignationUse[] = ['q-display', 'hint', 'help']

/** What to open: an existing concept, or a new one to create (optionally prefilled). */
export type ConceptTarget = { key: ConceptKey } | { draft: Partial<Concept> & { code?: string } }

/**
 * Edit one concept in a modal. Changes stay a draft until Save; Cancel discards them.
 * The same dialog serves the data dictionary and the concept of a node.
 */
export function ConceptDialog({
  target,
  onClose,
  onSaved,
  onOpenNode,
  onOpenActivity,
}: {
  target: ConceptTarget
  onClose: () => void
  /** Called after Save with the saved concept. */
  onSaved?: (key: ConceptKey) => void
  onOpenNode?: (activityId: string, nodeId: string) => void
  /** Open the page a parameter concept belongs to. */
  onOpenActivity?: (activityId: string) => void
}) {
  const project = useProjectSnapshot()
  const canWrite = useCanWrite()
  const mutate = useMutate()
  const { conceptTypes } = useEditorPreferences()
  const lang = project.languages.default
  const isNew = 'draft' in target
  const dictionaries = projectDictionaries(project)
  // A new concept goes to the dictionary it was opened for (the node's, the one on screen).
  const [system, setSystem] = useState(() =>
    isNew && target.draft.system && dictionaries.some((d) => d.url === target.draft.system)
      ? target.draft.system
      : dictionaries[0]!.url,
  )
  // The retrieval dictionary is offered only from itself: a node's concept is never a retrieval.
  const startedInRetrieve =
    isNew && dictionaries.find((d) => d.url === target.draft.system)?.kind === 'retrieve'
  const offered = dictionaries.filter((d) => (d.kind === 'retrieve') === startedInRetrieve)
  const existingCs = findCodeSystem(project, isNew ? system : target.key.system)
  const existing = isNew ? undefined : existingCs?.concepts[target.key.code]
  const [draft, setDraft] = useState<Concept>(() =>
    existing
      ? structuredClone(existing)
      : ({
          code: '',
          designations: [],
          ...(isNew ? structuredClone(target.draft) : {}),
          system,
        } as Concept),
  )
  const cardRef = useRef<HTMLDivElement>(null)
  const addImages = useAddImages()
  const [pictureOver, setPictureOver] = useState(false)
  // Rows added in this dialog stay in the table, whatever language they get.
  const opened = useRef(draft.designations.length)
  const readOnly = !canWrite
  // A parameter's concept is its declaration: edited in its page's settings, except its texts.
  const owner = existing?.kind === PARAMETER_KIND ? paramOwner(project, existing.code) : undefined
  const isParam = existing?.kind === PARAMETER_KIND
  const locked = readOnly || isParam

  useEffect(() => {
    cardRef.current?.querySelector<HTMLElement>('input:not([disabled]), textarea, select')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // A dialog opened on top of this one (the text editor, the picture picker) closes first.
      const dialogs = document.querySelectorAll('[role="dialog"]')
      if (dialogs[dialogs.length - 1] !== cardRef.current) return
      event.preventDefault()
      event.stopImmediatePropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  if (!isNew && !existing) {
    return null
  }

  const key = { system: existingCs?.url ?? draft.system, code: draft.code }
  // A retrieval (feature/20261109-project-retrievals.md) says what it reads, not what to ask.
  const isRetrieval =
    dictionaries.find((d) => d.url === (isNew ? system : key.system))?.kind === 'retrieve'
  const retrieval = draft.retrieval ?? { context: 'patient' as const }
  const uses = isNew ? [] : conceptUsage(project, key)
  const retrievalUses = isNew || !isRetrieval ? [] : retrievalUsage(project, key.code)
  const used = uses.length + retrievalUses.length
  const code = draft.code.trim()
  const missingLanguage = draft.designations.some((d) => !d.language.trim())
  const error = missingLanguage
    ? 'Give each text a language (en, fr, …).'
    : !isNew
      ? !draft.display?.trim()
        ? 'Give the concept a display.'
        : undefined
      : !code
        ? 'Give the concept a code.'
        : isRetrieval && !RETRIEVAL_CODE.test(code)
          ? 'A retrieval code is # followed by lowercase letters, digits and _, like #age_months.'
          : !isRetrieval && !CODE.test(code)
            ? 'A code uses letters, digits, ".", "_" and "-".'
            : existingCs?.concepts[code]
              ? 'The dictionary already has this code.'
              : !draft.display?.trim()
                ? 'Give the concept a display.'
                : undefined

  const set = (patch: Partial<Concept>) => {
    const next = { ...draft, ...patch } as Concept
    for (const [k, v] of Object.entries(patch)) {
      // The code stays, even empty: the field shows it and the checks read it.
      if (k !== 'code' && (v === undefined || v === ''))
        delete (next as unknown as Record<string, unknown>)[k]
    }
    setDraft(next)
  }
  const ownText = (use: DesignationUse): DisplayText => {
    const d = draft.designations.find(
      (x) => x.language === lang && isUnscoped(x) && designationUse(x) === use,
    )
    return d ? designationText(d) : ''
  }
  const setText = (use: DesignationUse, text: DisplayText) =>
    setDraft(withConceptText(draft, use, lang, text, lang))
  // The texts shown above (the first in the default language for all interventions, per use)
  // are not repeated in the table.
  const main = new Set(
    RICH.map((use) =>
      draft.designations.findIndex(
        (d, i) =>
          i < opened.current && d.language === lang && isUnscoped(d) && designationUse(d) === use,
      ),
    ).filter((i) => i >= 0),
  )
  const others = draft.designations
    .map((d, index) => ({ d, index }))
    .filter(({ index }) => !main.has(index))
  const updateAt = (index: number, d: Designation) =>
    setDraft({ ...draft, designations: draft.designations.map((x, i) => (i === index ? d : x)) })

  const save = () => {
    if (error || readOnly) return
    mutate((tx) => {
      const cs = existingCs ?? ensureDictionary(project, tx, system)
      const concept: Concept = { ...draft, system: cs.url, code }
      if (isRetrieval) concept.retrieval = retrieval
      else delete concept.retrieval
      tx.upsertConcept(cs.url, concept)
      onSaved?.({ system: cs.url, code })
    })
    onClose()
  }

  return createPortal(
    <div
      className="tricc-library-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={cardRef}
        className="tricc-library-modal__card tricc-library-modal__card--wide tricc-concept-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="concept-dialog-title"
        data-testid="concept-dialog"
        data-over={pictureOver ? 'true' : undefined}
        onMouseDown={(event) => event.stopPropagation()}
        onDragOver={(event) => {
          if (!canWrite || !draggingFiles(event)) return
          event.preventDefault()
          setPictureOver(true)
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setPictureOver(false)
        }}
        onDrop={(event) => {
          if (!canWrite || !draggingFiles(event)) return
          event.preventDefault()
          setPictureOver(false)
          // A picture dropped here goes first in the questionnaire text, in the draft.
          void addImages(imageFiles(event.dataTransfer.files).slice(0, 1)).then(([id]) => {
            if (id) setDraft((d) => withPictureFirst(d, id, lang))
          })
        }}
      >
        <h2 id="concept-dialog-title">
          {isNew
            ? isRetrieval
              ? 'New retrieval'
              : 'New concept'
            : (existing?.display ?? existing?.code)}
          {isParam && (
            <span className="tricc-badge" data-testid="concept-parameter-badge">
              {' '}
              Parameter
            </span>
          )}
        </h2>
        {isParam && (
          <p className="tricc-import-note" data-testid="concept-parameter-note">
            A parameter of{' '}
            {owner
              ? (resolve(project.activities[owner]?.title, lang, lang) ?? owner)
              : 'a page that no longer has it'}
            . Its type, options and default are edited in that page's settings; only its texts are
            edited here.{' '}
            {owner && onOpenActivity && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                data-testid="concept-parameter-owner"
                onClick={() => {
                  onClose()
                  onOpenActivity(owner)
                }}
              >
                Open {resolve(project.activities[owner]?.title, lang, lang) ?? owner}
              </Button>
            )}
          </p>
        )}
        <form
          className="tricc-form-grid tricc-concept__body"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          {isNew && (
            <>
              <label htmlFor="concept-dictionary">Dictionary</label>
              <select
                id="concept-dictionary"
                data-testid="concept-dictionary"
                value={system}
                disabled={readOnly}
                onChange={(e) => setSystem(e.target.value)}
              >
                {offered.map((d) => (
                  <option key={d.url} value={d.url}>
                    {dictionaryLabel(d)}
                  </option>
                ))}
              </select>
            </>
          )}

          <label htmlFor="concept-code">Code</label>
          <Input
            id="concept-code"
            data-testid="concept-code"
            value={draft.code}
            readOnly={!isNew}
            disabled={!isNew || readOnly}
            onChange={(e) => set({ code: e.target.value })}
          />

          <label htmlFor="concept-display">Display</label>
          <WrappingInput
            id="concept-display"
            data-testid="concept-display"
            value={draft.display ?? ''}
            disabled={readOnly}
            onChange={(e) => set({ display: e.target.value })}
          />
          <p>The short name in the dictionary and in CQL.</p>

          {!isRetrieval && (
            <>
              <RichTextField
                id="concept-q-display"
                testId="concept-q-display"
                label="Questionnaire text"
                value={ownText('q-display')}
                placeholder={draft.display ?? ''}
                disabled={readOnly}
                onChange={(t) => setText('q-display', t)}
              />
              <RichTextField
                id="concept-hint"
                testId="concept-hint"
                label="Hint"
                value={ownText('hint')}
                disabled={readOnly}
                onChange={(t) => setText('hint', t)}
              />
              <RichTextField
                id="concept-help"
                testId="concept-help"
                label="Help"
                value={ownText('help')}
                disabled={readOnly}
                onChange={(t) => setText('help', t)}
              />
            </>
          )}
          <label htmlFor="concept-definition">Definition</label>
          <Textarea
            id="concept-definition"
            data-testid="concept-definition"
            rows={2}
            value={draft.definition ?? ''}
            disabled={locked}
            onChange={(e) => set({ definition: e.target.value })}
          />

          {isRetrieval ? (
            <RetrievalFields
              project={project}
              value={retrieval}
              disabled={readOnly}
              onChange={(next) => setDraft({ ...draft, retrieval: next })}
            />
          ) : (
            <>
              <label htmlFor="concept-data-type">Data type</label>
              <select
                id="concept-data-type"
                data-testid="concept-data-type"
                value={draft.dataType ?? ''}
                disabled={locked}
                onChange={(e) => set({ dataType: e.target.value })}
              >
                <option value="">—</option>
                {withCurrent(DATA_TYPES, draft.dataType).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <label htmlFor="concept-type">Concept type</label>
              <select
                id="concept-type"
                data-testid="concept-type"
                value={draft.conceptType ?? ''}
                disabled={locked}
                onChange={(e) => set({ conceptType: e.target.value })}
              >
                <option value="">—</option>
                {withCurrent(conceptTypes, draft.conceptType).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <label htmlFor="concept-unit">Unit</label>
              <Input
                id="concept-unit"
                data-testid="concept-unit"
                value={draft.unit ?? ''}
                disabled={locked}
                onChange={(e) => set({ unit: e.target.value })}
              />
              <label htmlFor="concept-target-resource">Stored in — resource</label>
              <Input
                id="concept-target-resource"
                data-testid="concept-target-resource"
                value={draft.targetResource ?? ''}
                disabled={locked}
                onChange={(e) => set({ targetResource: e.target.value })}
              />
              <label htmlFor="concept-target-path">Stored in — path</label>
              <Input
                id="concept-target-path"
                data-testid="concept-target-path"
                value={draft.targetPath ?? ''}
                disabled={locked}
                onChange={(e) => set({ targetPath: e.target.value })}
              />
            </>
          )}

          <h3>Other languages and interventions</h3>
          <datalist id="concept-languages">
            {project.languages.available.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
          {others.length > 0 && (
            <table className="tricc-concept__texts" data-testid="concept-texts">
              <thead>
                <tr>
                  <th>Use</th>
                  <th>Language</th>
                  <th>For</th>
                  <th>Text</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {others.map(({ d, index }) => {
                  const use = designationUse(d)
                  const scope = designationInterventions(d)
                  return (
                    <tr key={index} data-testid={`concept-text-${index}`}>
                      <td>
                        <select
                          data-testid={`concept-text-${index}-use`}
                          aria-label="Use"
                          value={use ?? 'other'}
                          disabled={readOnly || use === undefined}
                          onChange={(e) =>
                            updateAt(index, {
                              ...d,
                              use: { ...DESIGNATION_USES[e.target.value as DesignationUse] },
                            })
                          }
                        >
                          {(Object.keys(USE_LABELS) as DesignationUse[]).map((u) => (
                            <option key={u} value={u}>
                              {USE_LABELS[u]}
                            </option>
                          ))}
                          {use === undefined && (
                            <option value="other">{d.use?.code ?? 'Other'}</option>
                          )}
                        </select>
                      </td>
                      <td>
                        <Input
                          data-testid={`concept-text-${index}-language`}
                          aria-label="Language"
                          placeholder="fr"
                          list="concept-languages"
                          htmlSize={4}
                          value={d.language}
                          disabled={readOnly}
                          onChange={(e) => updateAt(index, { ...d, language: e.target.value })}
                        />
                      </td>
                      <td>
                        {scope.length > 1 ? (
                          <span>{scope.join(', ')}</span>
                        ) : (
                          <select
                            data-testid={`concept-text-${index}-scope`}
                            aria-label="Intervention"
                            value={scope[0] ?? ''}
                            disabled={readOnly}
                            onChange={(e) => {
                              const kept = (d.extension ?? []).filter(
                                (x) => (x as { url?: string }).url !== INTERVENTION_SCOPE_URL,
                              )
                              const extension = [
                                ...kept,
                                ...scopeExtension(e.target.value ? [e.target.value] : []),
                              ]
                              const next: Designation = { ...d }
                              if (extension.length) next.extension = extension
                              else delete next.extension
                              updateAt(index, next)
                            }}
                          >
                            <option value="">All interventions</option>
                            {project.interventions.map((iv) => (
                              <option key={iv.id} value={iv.id}>
                                {resolve(iv.title, lang, lang) ?? iv.id}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="tricc-concept__text">
                        {use && RICH.includes(use) ? (
                          <RichTextField
                            id={`concept-text-${index}-value`}
                            testId={`concept-text-${index}-value`}
                            label="Text"
                            value={designationText(d)}
                            disabled={readOnly}
                            onChange={(t) => updateAt(index, withDesignationText(d, t))}
                          />
                        ) : (
                          <WrappingInput
                            data-testid={`concept-text-${index}-value`}
                            aria-label="Text"
                            value={d.value}
                            disabled={readOnly}
                            onChange={(e) => updateAt(index, { ...d, value: e.target.value })}
                          />
                        )}
                      </td>
                      <td>
                        {!readOnly && (
                          <Button
                            variant="destructive"
                            size="sm"
                            type="button"
                            data-testid={`concept-text-${index}-remove`}
                            onClick={() => {
                              if (index < opened.current) opened.current -= 1
                              setDraft({
                                ...draft,
                                designations: draft.designations.filter((_, i) => i !== index),
                              })
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {!readOnly && (
            <p>
              <Button
                variant="outline"
                size="sm"
                type="button"
                data-testid="concept-text-add"
                onClick={() => {
                  // The next project language not used yet; otherwise the author types one.
                  const used = new Set(draft.designations.map((d) => d.language))
                  const other = project.languages.available.find((l) => l !== lang && !used.has(l))
                  const row: Designation = {
                    language: other ?? '',
                    use: { ...DESIGNATION_USES['q-display'] },
                    value: '',
                  }
                  setDraft({ ...draft, designations: [...draft.designations, row] })
                }}
              >
                Add a translation or an intervention text
              </Button>
            </p>
          )}

          {!isNew && (
            <>
              <h3>Used by</h3>
              {retrievalUses.length > 0 && (
                <ul data-testid="retrieval-uses">
                  {retrievalUses.map((u, index) => {
                    const activity = u.activityId ? project.activities[u.activityId] : undefined
                    const node = u.nodeId ? activity?.nodes[u.nodeId] : undefined
                    const iv = u.interventionId
                      ? project.interventions.find((i) => i.id === u.interventionId)
                      : undefined
                    const where = iv
                      ? `Intervention ${resolve(iv.title, lang, lang) ?? iv.id}`
                      : `${resolve(activity?.title, lang, lang) ?? u.activityId} — ${
                          node?.name ?? u.nodeId ?? 'applicability'
                        }`
                    return (
                      <li key={index}>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto whitespace-normal p-0 text-left"
                          type="button"
                          data-testid={`retrieval-use-${index}`}
                          disabled={!onOpenNode || !u.activityId || !u.nodeId}
                          onClick={() => {
                            onClose()
                            onOpenNode?.(u.activityId!, u.nodeId!)
                          }}
                        >
                          {where} ({u.field})
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {used === 0 ? (
                <p data-testid="concept-unused">
                  {isRetrieval
                    ? 'No expression uses this retrieval yet, so no form loads it.'
                    : 'No node uses this concept yet.'}
                </p>
              ) : uses.length === 0 ? null : (
                <ul data-testid="concept-uses">
                  {uses.map((u) => {
                    const activity = project.activities[u.activityId]
                    const node = activity?.nodes[u.nodeId]
                    return (
                      <li key={`${u.activityId}-${u.nodeId}-${u.optionId ?? ''}`}>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto whitespace-normal p-0 text-left"
                          type="button"
                          data-testid={`concept-use-${u.activityId}-${u.nodeId}`}
                          disabled={!onOpenNode}
                          onClick={() => {
                            onClose()
                            onOpenNode?.(u.activityId, u.nodeId)
                          }}
                        >
                          {resolve(activity?.title, lang, lang) ?? u.activityId} —{' '}
                          {node?.name ?? u.nodeId}
                          {u.optionId ? ' (answer)' : ''}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}

          {error && !readOnly && (
            <p className="tricc-import-note" data-testid="concept-dialog-error">
              {error}
            </p>
          )}
          <div className="tricc-library-modal__actions">
            {!isNew && canWrite && !isParam && (
              <Button
                variant="destructive"
                size="sm"
                type="button"
                data-testid="concept-delete"
                disabled={used > 0}
                title={
                  used > 0 ? `Used by ${used}. Remove those uses first.` : 'Delete this concept'
                }
                onClick={() => {
                  mutate((tx) => tx.removeConcept(key.system, key.code))
                  onClose()
                }}
              >
                Delete
              </Button>
            )}
            {canWrite && (
              <Button
                size="sm"
                type="submit"
                data-testid="concept-dialog-save"
                disabled={Boolean(error)}
              >
                Save
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              type="button"
              data-testid="concept-dialog-cancel"
              onClick={onClose}
            >
              {canWrite ? 'Cancel' : 'Close'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

function withCurrent(list: readonly string[], current: string | undefined): string[] {
  return current && !list.some((t) => t.toLowerCase() === current.toLowerCase())
    ? [...list, current]
    : [...list]
}

/** A dictionary as the author sees it: its id, with what it is for. */
export function dictionaryLabel(d: {
  id: string
  kind: 'default' | 'calculate' | 'retrieve' | 'other'
}): string {
  if (d.kind === 'default') return `${d.id} (default)`
  if (d.kind === 'calculate') return `${d.id} (calculations and diagnoses)`
  if (d.kind === 'retrieve') return `${d.id} (retrievals)`
  return d.id
}

/** The page declaring the parameter whose concept has this code. */
function paramOwner(project: Project, code: string): string | undefined {
  for (const id of Object.keys(project.activities).sort()) {
    const activity = project.activities[id]!
    if ((activity.params ?? []).some((p) => paramConceptCode(activity, p.name) === code)) return id
  }
  return undefined
}
