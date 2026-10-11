import { useCallback, useMemo, useState } from 'react'
import {
  defaultCodeSystem,
  defaultConceptType,
  optionConceptKey,
  type ConceptKey,
  type Project,
  type SelectOption,
  type TriccNode,
} from '@tricc/core'
import { useProjectSnapshot } from '../runtime/context.js'
import { Typeahead, type TypeaheadOption } from '../components/Typeahead.js'
import { ConceptDialog } from './ConceptDialog.js'

/**
 * Add an answer to a question: find its concept in the dictionary, or create a new one.
 * The answer's name is the concept code, so its text is the concept's in every language.
 */
export function AnswerPicker({
  node,
  onAdd,
}: {
  node: TriccNode
  onAdd: (option: SelectOption) => void
}) {
  const project = useProjectSnapshot()
  const [creating, setCreating] = useState(false)
  const close = useCallback(() => setCreating(false), [])
  const options = useMemo(() => answerOptions(project, node), [project, node])

  const add = (key: ConceptKey) => {
    const taken = new Set((node.options ?? []).map((o) => o.id))
    let id = 'option'
    for (let i = 2; taken.has(id); i++) id = `option-${i}`
    // No default CodeSystem yet means the dialog just created it for this concept.
    const current = defaultCodeSystem(project)
    const inDefault = !current || current.url === key.system
    onAdd(inDefault ? { id, name: key.code } : { id, name: key.code, concept: { system: key.system, code: key.code } })
  }

  return (
    <div className="tricc-answer-picker" data-testid="add-option">
      <Typeahead
        label="Add an answer"
        testId="add-option-search"
        options={options}
        placeholder="Find an answer concept"
        emptyMessage="No concept matches. Use New answer."
        onSelect={(id) => {
          const at = id.lastIndexOf('|')
          add({ system: id.slice(0, at), code: id.slice(at + 1) })
        }}
      />
      <button type="button" data-testid="add-option-new" onClick={() => setCreating(true)}>
        New answer
      </button>
      {creating && (
        <ConceptDialog
          target={{ draft: { conceptType: defaultConceptType('option', node.type), dataType: 'coded' } }}
          onClose={close}
          onSaved={add}
        />
      )}
    </div>
  )
}

/** Concepts not yet an answer of this question. */
function answerOptions(project: Project, node: TriccNode): TypeaheadOption[] {
  const used = new Set(
    (node.options ?? []).map((o) => {
      const key = optionConceptKey(project, o)
      return key ? `${key.system}|${key.code}` : ''
    }),
  )
  const out: TypeaheadOption[] = []
  for (const cs of Object.values(project.codeSystems)) {
    for (const code of cs.conceptOrder) {
      const concept = cs.concepts[code]
      const id = `${cs.url}|${code}`
      if (!concept || used.has(id)) continue
      out.push({ id, label: concept.display ?? code, hint: code })
    }
  }
  return out
}
