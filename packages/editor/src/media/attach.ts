import {
  DESIGNATION_USES,
  NODE_TYPE_SPECS,
  defaultConceptType,
  designationText,
  dictionaryForType,
  nodeConceptKey,
  designationUse,
  findCodeSystem,
  imageRefs,
  isUnscoped,
  prependImage,
  withDesignationText,
  type Concept,
  type ConceptKey,
  type Designation,
  type Mutations,
  type NodeType,
  type Project,
  type SelectOption,
  type TriccNode,
} from '@tricc/core'
import { ensureDefaultCodeSystem, ensureDictionary } from '../terminology/codeSystems.js'

/**
 * The concept with a picture first in its questionnaire text (in `lang`). With no
 * questionnaire text yet, one is made from the display. A picture already shown is not added
 * twice.
 */
export function withPictureFirst(concept: Concept, imageId: string, lang: string): Concept {
  const at = concept.designations.findIndex(
    (d) => d.language === lang && isUnscoped(d) && designationUse(d) === 'q-display',
  )
  const current = at >= 0 ? concept.designations[at] : undefined
  const base = current ? designationText(current) : (concept.display ?? '')
  if (imageRefs(base).includes(imageId)) return concept
  const blank: Designation = { language: lang, use: { ...DESIGNATION_USES['q-display'] }, value: '' }
  const next = withDesignationText(current ?? blank, prependImage(base, imageId))
  const designations = [...concept.designations]
  if (at >= 0) designations[at] = next
  else designations.push(next)
  return { ...concept, designations }
}

/**
 * Show a picture on a node or one of its answers: first in the questionnaire text of the
 * concept it stands for, created from its name when the dictionary has none yet. Returns the
 * concept key, or undefined when the item has no code to stand for (no name, no concept).
 */
export function showPictureOn(
  tx: Mutations,
  project: Project,
  item: { node: TriccNode; option?: SelectOption },
  imageId: string,
): ConceptKey | undefined {
  const target = item.option ?? item.node
  const code = target.concept?.code ?? target.name
  if (!code) return undefined
  // A node without an explicit concept: the one its name finds, else its own dictionary
  // (the calculate one for a diagnosis).
  const found = item.option ? undefined : nodeConceptKey(project, item.node)
  const cs = target.concept
    ? findCodeSystem(project, target.concept.system)
    : found
      ? findCodeSystem(project, found.system)
      : item.option
        ? ensureDefaultCodeSystem(project, tx)
        : ensureDictionary(project, tx, dictionaryForType(project, item.node.type as NodeType).url)
  if (!cs) return undefined
  const lang = project.languages.default
  let concept = cs.concepts[code]
  if (!concept) {
    concept = { system: cs.url, code, designations: [] }
    const dataType = item.option ? 'coded' : NODE_TYPE_SPECS[item.node.type as NodeType]?.dataType
    if (dataType) concept.dataType = dataType
    concept.conceptType = item.option
      ? defaultConceptType('option', item.node.type)
      : defaultConceptType(item.node.type)
  }
  tx.upsertConcept(cs.url, withPictureFirst(concept, imageId, lang))
  return { system: cs.url, code }
}
