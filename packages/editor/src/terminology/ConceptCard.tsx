import { useCallback, useMemo, useState } from 'react'
import {
  CALCULATED_TYPES,
  TEXT_NODE_TYPES,
  conceptFlavours,
  conceptRichText,
  conceptText,
  conceptUsage,
  designationText,
  designationUse,
  isUnscoped,
  defaultConceptType,
  dictionaryForType,
  lookupConcept,
  nodeConceptKey,
  resolve,
  withConceptText,
  type Concept,
  type ConceptKey,
  type DesignationUse,
  type DisplayText,
  type Project,
  type Mutations,
  type TriccNode,
} from '@tricc/core'
import { useMutate, useProjectSnapshot } from '../runtime/context.js'
import { Typeahead, type TypeaheadOption } from '../components/Typeahead.js'
import { ConceptDialog, type ConceptTarget } from './ConceptDialog.js'
import { Button } from '../components/ui/button.js'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select.js'

/**
 * Nodes that stand for a concept: those whose text the health worker reads, and the values
 * logic computes (their concepts are in the calculate dictionary).
 */
export const CONCEPT_NODE_TYPES: readonly string[] = [...TEXT_NODE_TYPES, ...CALCULATED_TYPES]

/**
 * The concept behind a node, in short: code, display and questionnaire text. Its texts belong
 * to the concept, so they are edited in the concept dialog, which says how many nodes share it.
 */
export function ConceptCard({
  activityId,
  node,
  lang,
  readOnly,
  onOpenNode,
}: {
  activityId: string
  node: TriccNode
  lang: string
  readOnly: boolean
  onOpenNode?: (activityId: string, nodeId: string) => void
}) {
  const project = useProjectSnapshot()
  const mutate = useMutate()
  const [dialog, setDialog] = useState<ConceptTarget | null>(null)
  const key = nodeConceptKey(project, node)
  const concept = lookupConcept(project, key)
  const defaultLang = project.languages.default
  const options = useMemo(() => conceptOptions(project), [project])
  const close = useCallback(() => setDialog(null), [])
  // Where a new concept for this node goes, and where its name alone finds it.
  const home = dictionaryForType(project, node.type).url

  const dialogs = dialog && (
    <ConceptDialog
      target={dialog}
      onClose={close}
      onOpenNode={onOpenNode}
      onSaved={(saved, { flavour }) => {
        // A flavour made from the node: the node shows it.
        if ('key' in dialog && dialog.newFlavour) {
          if (flavour) mutate((tx) => tx.updateNode(activityId, { ...node, flavour }))
          return
        }
        if (!('draft' in dialog)) return
        // A concept created from the node takes its texts; the node keeps only the code.
        const { label: _label, hint: _hint, help: _help, ...rest } = node
        mutate((tx) => tx.updateNode(activityId, linkTo(rest, home, saved)))
      }}
    />
  )

  if (!key || !concept) {
    if (readOnly) return null
    return (
      <div
        className="tricc-concept-card tricc-concept-card--empty"
        data-testid="concept-card-empty"
      >
        <p>This node has no concept in the data dictionary, so its text lives only here.</p>
        <Typeahead
          label="Concept"
          testId="field-concept"
          options={options}
          placeholder="Find a concept"
          emptyMessage="No concept matches."
          onSelect={(id) => {
            const [system, code] = splitOption(id)
            mutate((tx) => tx.updateNode(activityId, linkTo(node, home, { system, code })))
          }}
        />
        <Button
          variant="outline"
          size="sm"
          type="button"
          data-testid="concept-create"
          onClick={() => setDialog({ draft: conceptFromNode(node, home, defaultLang) })}
        >
          Create concept{node.name ? ` “${node.name}”` : ''}
        </Button>
        {dialogs}
      </div>
    )
  }

  const uses = conceptUsage(project, key).length
  const questionnaire = conceptText(concept, 'q-display', lang, defaultLang)
  // Which flavour of the concept's texts the node shows.
  const flavours = conceptFlavours(concept)
  const picksText = TEXT_NODE_TYPES.includes(node.type)
  const preview = (flavour?: string) => {
    const text = conceptText(concept, 'q-display', lang, defaultLang, { flavour }) ?? ''
    return text.length > 40 ? `${text.slice(0, 40)}…` : text
  }
  const pickFlavour = (value: string) => {
    const next: TriccNode = { ...node }
    if (value !== DEFAULT_FLAVOUR) next.flavour = value
    else delete next.flavour
    mutate((tx) => tx.updateNode(activityId, next))
  }
  // A new flavour for this node, starting from the text it shows; the node takes it on Save.
  const newFlavour = () => {
    const text =
      conceptRichText(concept, 'q-display', lang, defaultLang, { flavour: node.flavour }) ?? ''
    const code = node.repeat !== undefined && node.repeat >= 2 ? `repeat_${node.repeat}` : 'flavour'
    setDialog({ key, newFlavour: { code, text } })
  }
  return (
    <div className="tricc-concept-card" data-testid="concept-card">
      <p className="tricc-concept-card__head">
        <span data-testid="concept-card-code">{concept.code}</span>
        <span data-testid="concept-card-display">
          {conceptText(concept, 'display', lang, defaultLang)}
        </span>
      </p>
      {questionnaire && questionnaire !== concept.display && (
        <p data-testid="concept-card-q-display">{questionnaire}</p>
      )}
      {uses > 1 && (
        <p className="tricc-import-note" data-testid="concept-card-shared">
          Shared by {uses} nodes. A text changed in the concept changes all of them.
        </p>
      )}
      <Button
        variant="outline"
        size="sm"
        type="button"
        data-testid="concept-edit"
        onClick={() => setDialog({ key })}
      >
        {readOnly ? 'Show concept' : 'Edit concept'}
      </Button>
      {picksText && (
        <div className="tricc-concept-card__flavour">
          <label htmlFor={`flavour-${node.id}`}>Flavour</label>
          <Select
            value={node.flavour ?? DEFAULT_FLAVOUR}
            disabled={readOnly}
            onValueChange={pickFlavour}
          >
            <SelectTrigger
              id={`flavour-${node.id}`}
              size="sm"
              className="w-full"
              data-testid="field-flavour"
              data-value={node.flavour ?? ''}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_FLAVOUR} data-testid="field-flavour-option-default">
                Default — {preview()}
              </SelectItem>
              {flavours.map((f) => (
                <SelectItem key={f} value={f} data-testid={`field-flavour-option-${f}`}>
                  {f} — {preview(f)}
                </SelectItem>
              ))}
              {node.flavour && !flavours.includes(node.flavour) && (
                <SelectItem value={node.flavour}>{node.flavour} — not in the concept</SelectItem>
              )}
            </SelectContent>
          </Select>
          <div className="tricc-concept-card__flavour-actions">
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                data-testid="field-flavour-new"
                title="Another wording of this concept for this question, with its own questionnaire text, hint and help"
                onClick={newFlavour}
              >
                + New flavour
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              type="button"
              data-testid="field-flavour-edit"
              onClick={() => setDialog({ key, ...(node.flavour ? { flavour: node.flavour } : {}) })}
            >
              {readOnly ? 'Show texts' : 'Edit texts'}
            </Button>
          </div>
        </div>
      )}
      {dialogs}
    </div>
  )
}

/** The picker value of the Default flavour (Radix gives no item an empty value). */
const DEFAULT_FLAVOUR = ':default'

/** A new concept carrying the node's own texts: label as display, then hint and help. */
function conceptFromNode(node: TriccNode, system: string, defaultLang: string): Concept {
  let concept: Concept = {
    system,
    code: node.name ?? '',
    display: resolve(node.label, defaultLang, defaultLang) ?? node.name ?? '',
    conceptType: defaultConceptType(node.type),
    designations: [],
  }
  for (const [language, text] of Object.entries(node.label ?? {})) {
    if (language !== defaultLang && text)
      concept = withConceptText(concept, 'display', language, text, defaultLang)
  }
  for (const use of ['hint', 'help'] as const) {
    for (const [language, text] of Object.entries(node[use] ?? {})) {
      if (text) concept = withConceptText(concept, use, language, text, defaultLang)
    }
  }
  return concept
}

function conceptOptions(project: Project): TypeaheadOption[] {
  const out: TypeaheadOption[] = []
  for (const cs of Object.values(project.codeSystems)) {
    for (const code of cs.conceptOrder) {
      const concept = cs.concepts[code]
      if (!concept) continue
      out.push({ id: `${cs.url}|${code}`, label: concept.display ?? code, hint: code })
    }
  }
  return out
}

function splitOption(id: string): [string, string] {
  const at = id.lastIndexOf('|')
  return [id.slice(0, at), id.slice(at + 1)]
}

/**
 * Point a node at a concept. In the node's own dictionary (the default one, or the calculate
 * one for a calculation or a diagnosis) the node's name is the code; a concept elsewhere is
 * an explicit reference beside the name.
 */
function linkTo(node: TriccNode, home: string, key: ConceptKey): TriccNode {
  const next: TriccNode = { ...node }
  if (key.system === home) {
    next.name = key.code
    delete next.concept
  } else {
    next.concept = { system: key.system, code: key.code }
  }
  return next
}
