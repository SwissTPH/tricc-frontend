import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DATA_TYPES,
  DESIGNATION_USES,
  PARAMETER_KIND,
  paramConceptCode,
  INTERVENTION_SCOPE_URL,
  FLAVOUR_CODE,
  conceptFlavours,
  conceptRichText,
  conceptText,
  conceptUsage,
  designationFlavour,
  designationInterventions,
  designationText,
  designationUse,
  findCodeSystem,
  isUnscoped,
  projectDictionaries,
  RETRIEVAL_CODE,
  resolve,
  retrievalUsage,
  flavourScopeExtension,
  removeFlavour,
  renameFlavour,
  scopeExtension,
  withConceptText,
  withFlavour,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SimpleSelect,
} from '../components/ui/select.js'
import { WrappingInput } from '../components/WrappingInput.js'
import { Textarea } from '../components/ui/textarea.js'
import { RetrievalFields } from './RetrievalFields.js'
import { carryFlavourRenames, flavourUses, uniqueFlavour } from './flavours.js'

const CODE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const USE_LABELS: Record<DesignationUse, string> = {
  display: 'Display',
  'q-display': 'Questionnaire text',
  hint: 'Hint',
  help: 'Help',
}
const RICH: DesignationUse[] = ['q-display', 'hint', 'help']

/**
 * What to open: an existing concept, or a new one to create (optionally prefilled). An
 * existing one opens on its default texts, on one `flavour`, or on a `newFlavour` added with
 * that code (made unique) and its questionnaire text prefilled
 * (feature/20261125-concept-text-flavours.md).
 */
export type ConceptTarget =
  | { key: ConceptKey; flavour?: string; newFlavour?: { code: string; text: DisplayText } }
  | { draft: Partial<Concept> & { code?: string } }

/** What a save did beyond the concept: the code the flavour added on open ended with. */
export interface ConceptSaved {
  flavour?: string
}

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
  onSaved?: (key: ConceptKey, saved: ConceptSaved) => void
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
  // A flavour added on open (New flavour… on a node): its first code, to report what it became.
  const [opening] = useState(() => {
    if (isNew || !existing || !target.newFlavour) return undefined
    const concept = structuredClone(existing)
    const code = uniqueFlavour(concept, target.newFlavour.code)
    return { concept: withFlavourRow(concept, lang, code, target.newFlavour.text), code }
  })
  const [draft, setDraft] = useState<Concept>(() =>
    opening
      ? opening.concept
      : existing
        ? structuredClone(existing)
        : ({
            code: '',
            designations: [],
            ...(isNew ? structuredClone(target.draft) : {}),
            system,
          } as Concept),
  )
  // Flavour renames in this dialog, current code → code when opened, so the nodes showing a
  // renamed flavour follow it on Save.
  const renamed = useRef(new Map<string, string>())
  // The flavour whose texts the fields show; undefined is the default one.
  const [flavour, setFlavour] = useState<string | undefined>(() =>
    opening ? opening.code : !isNew ? target.flavour : undefined,
  )
  // The checkbox stays while the dialog is open, so clearing the flag can be undone.
  const wasFuzzy = useRef(Boolean(existing?.fuzzy)).current
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
      // An open select menu (the flavour picker) closes on its own, and the dialog stays.
      if (document.querySelector('[data-slot="select-content"]')) return
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
  const flavours = isRetrieval ? [] : conceptFlavours(draft)
  // The text of one use in the default language for a flavour (undefined: the default flavour).
  const textIndex = (use: DesignationUse, f: string | undefined) =>
    draft.designations.findIndex(
      (d) =>
        d.language === lang &&
        designationUse(d) === use &&
        (f === undefined
          ? isUnscoped(d)
          : designationFlavour(d) === f && designationInterventions(d).length === 0),
    )
  const originOf = (f: string) => renamed.current.get(f) ?? f
  const emptyFlavour = flavours.find(
    (f) => !draft.designations.some((d) => designationFlavour(d) === f && d.value.trim()),
  )
  const error = missingLanguage
    ? 'Give each text a language (en, fr, …).'
    : flavours.some((f) => !FLAVOUR_CODE.test(f))
      ? 'A flavour name uses lowercase letters, digits and _, like second or after_dose.'
      : emptyFlavour !== undefined
        ? `Give the flavour "${emptyFlavour}" a questionnaire text, hint or help.`
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
  // The fields show the selected flavour's texts.
  const ownText = (use: DesignationUse): DisplayText => {
    const i = textIndex(use, flavour)
    return i >= 0 ? designationText(draft.designations[i]!) : ''
  }
  const setText = (use: DesignationUse, text: DisplayText) => {
    const i = flavour === undefined ? -1 : textIndex(use, flavour)
    // A flavour's text keeps its row while emptied, so the flavour does not vanish while typing.
    if (i >= 0) updateAt(i, withDesignationText(draft.designations[i]!, text))
    else setDraft(withConceptText(draft, use, lang, text, lang, flavour ? { flavour } : {}))
  }
  // An empty field of a flavour shows what it falls back to: the default flavour's text.
  const fallback = (use: DesignationUse) =>
    flavour === undefined
      ? use === 'q-display'
        ? (draft.display ?? '')
        : undefined
      : (conceptText(draft, use, lang, lang) ?? '')
  const addFlavour = () => {
    const code = uniqueFlavour(draft, 'flavour')
    setDraft(
      withFlavourRow(draft, lang, code, conceptRichText(draft, 'q-display', lang, lang) ?? ''),
    )
    setFlavour(code)
  }
  const renameSelected = (to: string) => {
    if (flavour === undefined) return
    // A name already taken would merge two flavours: keep the old one until it is free.
    if (to !== flavour && flavours.includes(to)) return
    const was = originOf(flavour)
    renamed.current.delete(flavour)
    renamed.current.set(to, was)
    setDraft(renameFlavour(draft, flavour, to))
    setFlavour(to)
  }
  const removeSelected = () => {
    if (flavour === undefined) return
    renamed.current.delete(flavour)
    setDraft(removeFlavour(draft, flavour))
    setFlavour(undefined)
  }
  const flavourCount =
    flavour === undefined || isNew
      ? 0
      : flavourUses(project, key, existing, originOf(flavour)).length
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
  // Nor are the flavours' texts in the default language: the fields show them, per flavour.
  for (const f of flavours) {
    for (const use of RICH) {
      const i = textIndex(use, f)
      if (i >= 0) main.add(i)
    }
  }
  const others = draft.designations
    .map((d, index) => ({ d, index }))
    .filter(({ index }) => !main.has(index))
  const updateAt = (index: number, d: Designation) =>
    setDraft({ ...draft, designations: draft.designations.map((x, i) => (i === index ? d : x)) })

  const save = () => {
    if (error || readOnly) return
    mutate((tx) => {
      const cs = existingCs ?? ensureDictionary(project, tx, system)
      // A flavour's emptied texts go: they say nothing, the default one shows.
      const designations = draft.designations.filter(
        (d) => designationFlavour(d) === undefined || d.value.trim() !== '',
      )
      const concept: Concept = { ...draft, designations, system: cs.url, code }
      if (isRetrieval) concept.retrieval = retrieval
      else delete concept.retrieval
      tx.upsertConcept(cs.url, concept)
      // The questions showing a renamed flavour follow it.
      if (existing) carryFlavourRenames(tx, project, key, existing, renamed.current)
      const added = opening && flavours.find((f) => originOf(f) === opening.code)
      onSaved?.({ system: cs.url, code }, added ? { flavour: added } : {})
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
              <SimpleSelect
                id="concept-dictionary"
                testId="concept-dictionary"
                value={system}
                disabled={readOnly}
                onValueChange={setSystem}
                options={offered.map((d) => ({ value: d.url, label: dictionaryLabel(d) }))}
              />
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

          {wasFuzzy && (
            <>
              <label htmlFor="concept-fuzzy">Fuzzy</label>
              <span className="tricc-dictionary__filter">
                <input
                  id="concept-fuzzy"
                  type="checkbox"
                  data-testid="concept-fuzzy"
                  checked={Boolean(draft.fuzzy)}
                  disabled={readOnly}
                  onChange={(e) => set({ fuzzy: e.target.checked || undefined })}
                />
                Made from a generic name ending with _ in a drawing. Clear it once reviewed.
              </span>
            </>
          )}

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
              <label htmlFor="concept-flavour">Flavour</label>
              <div className="tricc-concept__flavour">
                <Select
                  value={flavour === undefined ? DEFAULT_FLAVOUR : flavour || EMPTY_NAME}
                  onValueChange={(v) =>
                    setFlavour(v === DEFAULT_FLAVOUR ? undefined : v === EMPTY_NAME ? '' : v)
                  }
                >
                  <SelectTrigger
                    id="concept-flavour"
                    size="sm"
                    className="min-w-40"
                    data-testid="concept-flavour"
                    data-value={flavour ?? ''}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value={DEFAULT_FLAVOUR}
                      data-testid="concept-flavour-option-default"
                    >
                      Default
                    </SelectItem>
                    {flavours.map((f, n) => (
                      <SelectItem
                        key={n}
                        // Radix needs a non-empty value; a name being typed can be empty.
                        value={f || EMPTY_NAME}
                        data-testid={`concept-flavour-option-${n}`}
                      >
                        {f || '(no name)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {flavour !== undefined && (
                  <>
                    <Input
                      size="sm"
                      aria-label="Flavour name"
                      data-testid="concept-flavour-name"
                      value={flavour}
                      disabled={readOnly}
                      onChange={(e) => renameSelected(e.target.value)}
                    />
                    <span data-testid="concept-flavour-uses">
                      {flavourCount === 0
                        ? 'Unused'
                        : `${flavourCount} question${flavourCount === 1 ? '' : 's'}`}
                    </span>
                    {!readOnly && (
                      <Button
                        variant="destructive"
                        size="sm"
                        type="button"
                        data-testid="concept-flavour-remove"
                        title={
                          flavourCount
                            ? 'Those questions show the default texts until another flavour is picked.'
                            : undefined
                        }
                        onClick={removeSelected}
                      >
                        Remove
                      </Button>
                    )}
                  </>
                )}
                {!readOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    data-testid="concept-flavour-add"
                    title="Another wording of this concept, with its own questionnaire text, hint and help, for a question to pick"
                    onClick={addFlavour}
                  >
                    + New flavour
                  </Button>
                )}
              </div>
              <p>
                {flavour === undefined
                  ? 'The texts every question of this concept shows. A flavour is another wording a question can pick, with its own questionnaire text, hint and help.'
                  : 'The texts of this flavour. An empty one shows the default text.'}
              </p>
              <RichTextField
                key={`q-${flavour === undefined ? '' : originOf(flavour)}`}
                id="concept-q-display"
                testId="concept-q-display"
                label="Questionnaire text"
                value={ownText('q-display')}
                placeholder={fallback('q-display')}
                disabled={readOnly}
                onChange={(t) => setText('q-display', t)}
              />
              <RichTextField
                key={`h-${flavour === undefined ? '' : originOf(flavour)}`}
                id="concept-hint"
                testId="concept-hint"
                label="Hint"
                value={ownText('hint')}
                placeholder={fallback('hint')}
                disabled={readOnly}
                onChange={(t) => setText('hint', t)}
              />
              <RichTextField
                key={`p-${flavour === undefined ? '' : originOf(flavour)}`}
                id="concept-help"
                testId="concept-help"
                label="Help"
                value={ownText('help')}
                placeholder={fallback('help')}
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
              <SimpleSelect
                id="concept-data-type"
                testId="concept-data-type"
                value={draft.dataType ?? ''}
                disabled={locked}
                onValueChange={(v) => set({ dataType: v })}
                options={[
                  { value: '', label: '—' },
                  ...withCurrent(DATA_TYPES, draft.dataType).map((t) => ({ value: t, label: t })),
                ]}
              />

              <label htmlFor="concept-type">Concept type</label>
              <SimpleSelect
                id="concept-type"
                testId="concept-type"
                value={draft.conceptType ?? ''}
                disabled={locked}
                onValueChange={(v) => set({ conceptType: v })}
                options={[
                  { value: '', label: '—' },
                  ...withCurrent(conceptTypes, draft.conceptType).map((t) => ({
                    value: t,
                    label: t,
                  })),
                ]}
              />

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

          <h3>Other languages, interventions and flavours</h3>
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
                  const flavour = designationFlavour(d)
                  return (
                    <tr key={index} data-testid={`concept-text-${index}`}>
                      <td>
                        <SimpleSelect
                          testId={`concept-text-${index}-use`}
                          ariaLabel="Use"
                          value={use ?? 'other'}
                          disabled={readOnly || use === undefined}
                          onValueChange={(v) =>
                            updateAt(index, {
                              ...d,
                              use: { ...DESIGNATION_USES[v as DesignationUse] },
                            })
                          }
                          options={[
                            ...(Object.keys(USE_LABELS) as DesignationUse[]).map((u) => ({
                              value: u,
                              label: USE_LABELS[u],
                            })),
                            ...(use === undefined
                              ? [{ value: 'other', label: d.use?.code ?? 'Other' }]
                              : []),
                          ]}
                        />
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
                          <SimpleSelect
                            testId={`concept-text-${index}-scope`}
                            ariaLabel="Intervention"
                            value={scope[0] ?? ''}
                            disabled={readOnly}
                            onValueChange={(v) => {
                              const kept = (d.extension ?? []).filter(
                                (x) => (x as { url?: string }).url !== INTERVENTION_SCOPE_URL,
                              )
                              const extension = [...kept, ...scopeExtension(v ? [v] : [])]
                              const next: Designation = { ...d }
                              if (extension.length) next.extension = extension
                              else delete next.extension
                              updateAt(index, next)
                            }}
                            options={[
                              { value: '', label: 'All interventions' },
                              ...project.interventions.map((iv) => ({
                                value: iv.id,
                                label: resolve(iv.title, lang, lang) ?? iv.id,
                              })),
                            ]}
                          />
                        )}
                        {flavours.length > 0 && (
                          <SimpleSelect
                            testId={`concept-text-${index}-flavour`}
                            ariaLabel="Flavour"
                            value={flavour ?? ''}
                            disabled={readOnly}
                            onValueChange={(v) => updateAt(index, withFlavour(d, v || undefined))}
                            options={[
                              { value: '', label: 'Default text' },
                              ...flavours
                                .filter(Boolean)
                                .map((f) => ({ value: f, label: `Flavour ${f}` })),
                            ]}
                          />
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
                Add a translation, an intervention or a flavour text
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

/** The picker value of the Default flavour, and of a flavour whose name is being typed. */
const DEFAULT_FLAVOUR = ':default'
const EMPTY_NAME = ':empty'

/** The concept with a new flavour, its questionnaire text in `lang` set to `text`. */
function withFlavourRow(concept: Concept, lang: string, code: string, text: DisplayText): Concept {
  const row = withDesignationText(
    {
      language: lang,
      use: { ...DESIGNATION_USES['q-display'] },
      value: '',
      extension: flavourScopeExtension(code),
    },
    text,
  )
  return { ...concept, designations: [...concept.designations, row] }
}
