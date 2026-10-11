import { useCallback, useMemo, useState } from 'react'
import {
  TEXT_NODE_TYPES,
  conceptText,
  conceptUsage,
  designationText,
  designationUse,
  isUnscoped,
  defaultCodeSystem,
  defaultConceptType,
  lookupConcept,
  nodeConceptKey,
  resolve,
  withConceptText,
  type CodeSystem,
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

/** Nodes whose text the health worker reads, so they stand for a concept. */
export const CONCEPT_NODE_TYPES: readonly string[] = TEXT_NODE_TYPES

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

  const dialogs = dialog && (
    <ConceptDialog
      target={dialog}
      onClose={close}
      onOpenNode={onOpenNode}
      onSaved={(saved) => {
        if (!('draft' in dialog)) return
        // A concept created from the node takes its texts; the node keeps only the code.
        const { label: _label, hint: _hint, help: _help, ...rest } = node
        const target = defaultCodeSystem(project)
        mutate((tx) => tx.updateNode(activityId, linkTo(rest, target ?? { url: saved.system } as CodeSystem, saved)))
      }}
    />
  )

  if (!key || !concept) {
    if (readOnly) return null
    return (
      <div className="tricc-concept-card tricc-concept-card--empty" data-testid="concept-card-empty">
        <p>This node has no concept in the data dictionary, so its text lives only here.</p>
        <Typeahead
          label="Concept"
          testId="field-concept"
          options={options}
          placeholder="Find a concept"
          emptyMessage="No concept matches."
          onSelect={(id) => {
            const [system, code] = splitOption(id)
            mutate((tx) => tx.updateNode(activityId, linkTo(node, defaultCodeSystem(project), { system, code })))
          }}
        />
        <button
          type="button"
          data-testid="concept-create"
          onClick={() => setDialog({ draft: conceptFromNode(node, '', defaultLang) })}
        >
          Create concept{node.name ? ` “${node.name}”` : ''}
        </button>
        {dialogs}
      </div>
    )
  }

  const uses = conceptUsage(project, key).length
  const questionnaire = conceptText(concept, 'q-display', lang, defaultLang)
  return (
    <div className="tricc-concept-card" data-testid="concept-card">
      <p className="tricc-concept-card__head">
        <span data-testid="concept-card-code">{concept.code}</span>
        <span data-testid="concept-card-display">{conceptText(concept, 'display', lang, defaultLang)}</span>
      </p>
      {questionnaire && questionnaire !== concept.display && (
        <p data-testid="concept-card-q-display">{questionnaire}</p>
      )}
      {uses > 1 && (
        <p className="tricc-import-note" data-testid="concept-card-shared">
          Shared by {uses} nodes. A text changed in the concept changes all of them.
        </p>
      )}
      <button type="button" data-testid="concept-edit" onClick={() => setDialog({ key })}>
        {readOnly ? 'Show concept' : 'Edit concept'}
      </button>
      {dialogs}
    </div>
  )
}

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
    if (language !== defaultLang && text) concept = withConceptText(concept, 'display', language, text, defaultLang)
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
 * Point a node at a concept. In the default CodeSystem the node's name is the code; a
 * concept elsewhere is an explicit reference beside the name.
 */
function linkTo(node: TriccNode, defaultCs: CodeSystem | undefined, key: ConceptKey): TriccNode {
  const next: TriccNode = { ...node }
  if (defaultCs && key.system === defaultCs.url) {
    next.name = key.code
    delete next.concept
  } else {
    next.concept = { system: key.system, code: key.code }
  }
  return next
}
