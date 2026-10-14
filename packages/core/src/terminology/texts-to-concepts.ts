import { imageIdFrom, type CodeSystem, type Concept, type Designation, type Project, type SelectOption, type TriccNode } from '../model/types.js'
import type { LocalizedText } from '../format/schema/localized.js'
import { designationText, imageRefs, prependImage, toMarkdown, withDesignationText, type Message } from '../text/message.js'
import { isTextNode, type NodeType } from '../format/schema/node-types.js'
import { NODE_TYPE_SPECS } from '../format/schema/node-spec.js'
import { DESIGNATION_USES, designationUse, isUnscoped, type DesignationUse } from './designation.js'
import { defaultCodeSystem, findCodeSystem, type ConceptKey } from './usage.js'

/**
 * Activity YAML holds codes, not texts (feature/20261008-data-dictionary-and-concept-texts.md
 * §2.0). This moves the label, hint and help of every question, display node and answer into
 * the concept the item stands for: its explicit `concept`, else its `name` in the default
 * CodeSystem, which is created when the project has none.
 *
 * A text the concept already has differently stays on the concept; the inline one is reported
 * in `dropped`. An item with no code (no name, no concept) keeps its text until it gets one.
 */
export interface TextMoveResult {
  /** Concepts created or changed, so a caller applying this to a document can upsert them. */
  touched: ConceptKey[]
  /** The default CodeSystem, when this call had to create it. */
  createdCodeSystem?: CodeSystem
  dropped: { activityId: string; nodeId: string; optionId?: string; text: string }[]
}

export function moveTextsToConcepts(
  project: Project,
  activityIds: string[] = Object.keys(project.activities),
): TextMoveResult {
  const result: TextMoveResult = { touched: [], dropped: [] }
  const lang = project.languages.default
  const touched = new Set<string>()

  const codeSystemFor = (item: { concept?: { system: string } }): CodeSystem | undefined => {
    if (item.concept) return findCodeSystem(project, item.concept.system)
    const existing = defaultCodeSystem(project)
    if (existing) return existing
    const cs: CodeSystem = {
      id: project.id,
      url: `https://tricc.org/CodeSystem/${project.id}`,
      name: project.id,
      status: 'draft',
      content: 'complete',
      concepts: {},
      conceptOrder: [],
    }
    project.codeSystems[cs.url] = cs
    project.defaultCodeSystem = cs.url
    result.createdCodeSystem = cs
    return cs
  }

  const move = (
    item: TriccNode | SelectOption,
    where: { activityId: string; nodeId: string; optionId?: string; parentType?: string },
  ) => {
    const texts = item as { label?: LocalizedText; hint?: LocalizedText; help?: LocalizedText }
    // Legacy `media.image` (a file name): the picture moves to the start of the questionnaire text.
    const image = 'media' in item ? item.media?.image : undefined
    if (!texts.label && !texts.hint && !texts.help && !image) return
    const code = item.concept?.code ?? item.name
    if (!code) return
    const cs = codeSystemFor(item)
    if (!cs) return
    let concept = cs.concepts[code]
    if (!concept) {
      concept = { system: cs.url, code, designations: [] }
      const dataType = 'type' in item ? NODE_TYPE_SPECS[item.type]?.dataType : 'coded'
      if (dataType) concept.dataType = dataType
      // The type tricc_oo would assign the item (xml_to_tricc.py get_concept_type).
      concept.conceptType =
        'type' in item ? defaultConceptType(item.type) : defaultConceptType('option', where.parentType ?? 'select_one')
      cs.concepts[code] = concept
      cs.conceptOrder.push(code)
    }
    const { parentType: _parentType, ...place } = where
    const drop = (text: string) => result.dropped.push({ ...place, text })
    const rich = 'labelMessage' in item ? item.labelMessage : undefined
    for (const [language, text] of Object.entries(texts.label ?? {})) {
      if (!text.trim()) continue
      // A formatted label: its plain text names the concept, the formatted one is what the form shows.
      if (rich && language === lang) placeRichLabel(concept, language, rich, text, lang, drop)
      else placeLabel(concept, language, text, lang, drop)
    }
    if ('labelMessage' in item) delete item.labelMessage
    for (const use of ['hint', 'help'] as const) {
      for (const [language, text] of Object.entries(texts[use] ?? {})) {
        if (!text.trim()) continue
        const current = own(concept, use, language)
        if (!current) concept.designations.push(designation(language, use, text))
        else if (current.value !== text) drop(text)
      }
    }
    if (image) {
      const id = imageIdFrom(image.split('/').pop() ?? image)
      const q = own(concept, 'q-display', lang)
      const base = q ? designationText(q) : (concept.display ?? '')
      if (!imageRefs(base).includes(id)) {
        const next = withDesignationText(q ?? designation(lang, 'q-display', ''), prependImage(base, id))
        if (q) concept.designations[concept.designations.indexOf(q)] = next
        else concept.designations.push(next)
      }
      delete (item as TriccNode).media
    }
    delete texts.label
    delete texts.hint
    delete texts.help
    const key = `${cs.url}|${code}`
    if (!touched.has(key)) {
      touched.add(key)
      result.touched.push({ system: cs.url, code })
    }
  }

  for (const activityId of activityIds) {
    const activity = project.activities[activityId]
    if (!activity) continue
    // A page group's title is text too: it goes to the concept its name stands for.
    for (const group of activity.groups ?? []) {
      if (!group.label || !group.name) continue
      const cs = codeSystemFor({})
      if (!cs) continue
      let concept = cs.concepts[group.name]
      if (!concept) {
        concept = { system: cs.url, code: group.name, designations: [], conceptType: 'Misc' }
        cs.concepts[group.name] = concept
        cs.conceptOrder.push(group.name)
      }
      for (const [language, text] of Object.entries(group.label)) {
        if (text.trim()) placeLabel(concept, language, text, lang, (t) => result.dropped.push({ activityId, nodeId: group.id, text: t }))
      }
      delete group.label
      const key = `${cs.url}|${group.name}`
      if (!touched.has(key)) {
        touched.add(key)
        result.touched.push({ system: cs.url, code: group.name })
      }
    }
    for (const nodeId of activity.nodeOrder) {
      const node = activity.nodes[nodeId]
      if (!node || !isTextNode(node.type)) continue
      move(node, { activityId, nodeId })
      for (const option of node.options ?? [])
        move(option, { activityId, nodeId, optionId: option.id, parentType: node.type })
    }
  }
  return result
}

/** What a new concept stores, read from the node that first uses it. Answers are coded. */
/**
 * The concept type a new concept gets from the node that first uses it: a question is an
 * Observation; an answer is a Value, or an Observation when several can be chosen; a
 * diagnosis is a Condition; a note is an InteractSet.
 */
export function defaultConceptType(nodeType: string, parentType?: string): string {
  if (parentType !== undefined) return parentType === 'select_multiple' ? 'Observation' : 'Value'
  return NODE_TYPE_SPECS[nodeType as NodeType]?.conceptType ?? 'Observation'
}


/**
 * A label is the display when the concept has none; otherwise, if it says something else,
 * it is the questionnaire text.
 */
function placeLabel(
  concept: Concept,
  language: string,
  text: string,
  defaultLang: string,
  drop: (text: string) => void,
): void {
  if (language === defaultLang) {
    if (!concept.display) {
      concept.display = text
      return
    }
    if (concept.display === text) return
  } else {
    const display = own(concept, 'display', language)
    if (!display) {
      concept.designations.push(designation(language, 'display', text))
      return
    }
    if (display.value === text) return
  }
  const q = own(concept, 'q-display', language)
  if (!q) concept.designations.push(designation(language, 'q-display', text))
  else if (q.value !== text) drop(text)
}

function placeRichLabel(
  concept: Concept,
  language: string,
  rich: Message,
  plain: string,
  defaultLang: string,
  drop: (text: string) => void,
): void {
  if (language === defaultLang && !concept.display) concept.display = plain
  const q = own(concept, 'q-display', language)
  if (!q) concept.designations.push(withDesignationText(designation(language, 'q-display', ''), rich))
  else if (q.value !== toMarkdown(rich)) drop(plain)
}

function own(concept: Concept, use: DesignationUse, language: string): Designation | undefined {
  return concept.designations.find(
    (d) => d.language === language && isUnscoped(d) && designationUse(d) === use,
  )
}

function designation(language: string, use: DesignationUse, value: string): Designation {
  return { language, use: { ...DESIGNATION_USES[use] }, value }
}
