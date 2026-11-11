import type { CodeSystem, Concept, Project, SelectOption, TriccNode } from '../model/types.js'
import { designationText, imageRefs } from '../text/message.js'
import { isCalculated } from '../format/schema/node-types.js'
import { calculateCodeSystem } from './dictionaries.js'

/**
 * Where concepts are used.
 *
 * Activity YAML holds codes, not texts. A node or answer refers to a concept through an
 * explicit `concept`, or, in the project's default CodeSystem, through its `name`: the
 * name *is* the concept code (feature/20261008-data-dictionary-and-concept-texts.md §2.0).
 */

export interface ConceptKey {
  system: string
  code: string
}

export interface ConceptUse {
  activityId: string
  nodeId: string
  /** Set when the concept is an answer of the node rather than the node itself. */
  optionId?: string
}

/** `tricc.yaml` names the default CodeSystem by url, name, or id. */
export function findCodeSystem(project: Project, ref: string | undefined): CodeSystem | undefined {
  if (!ref) return undefined
  return (
    project.codeSystems[ref] ??
    Object.values(project.codeSystems).find((cs) => cs.name === ref || cs.id === ref)
  )
}

export function defaultCodeSystem(project: Project): CodeSystem | undefined {
  // A dictionary with a role (calculate, retrieve) is never the default one, even alone.
  const plain = Object.values(project.codeSystems).filter(
    (cs) => !(cs.meta?.tag ?? []).some((t) => t.system === CODESYSTEM_ROLE_SYSTEM),
  )
  return (
    findCodeSystem(project, project.defaultCodeSystem) ??
    (Object.keys(project.codeSystems).length === 1 && plain.length === 1 ? plain[0] : undefined)
  )
}

/** `meta.tag` system of a dictionary's role; the same as `CODESYSTEM_ROLE` (dictionaries.ts). */
const CODESYSTEM_ROLE_SYSTEM = 'http://tricc.org/fhir/CodeSystem/codesystem-role'

export function lookupConcept(project: Project, key: ConceptKey | undefined): Concept | undefined {
  if (!key) return undefined
  return findCodeSystem(project, key.system)?.concepts[key.code]
}

function refOf(
  project: Project,
  item: { concept?: { system: string; code: string }; name?: string },
): ConceptKey | undefined {
  if (item.concept) {
    const cs = findCodeSystem(project, item.concept.system)
    return { system: cs?.url ?? item.concept.system, code: item.concept.code }
  }
  const cs = defaultCodeSystem(project)
  if (cs && item.name && cs.concepts[item.name]) return { system: cs.url, code: item.name }
  return undefined
}

/**
 * The concept a node stands for, if the dictionary has it. A calculation or a diagnosis is
 * looked up by name in the calculate dictionary first, then in the default one.
 */
export function nodeConceptKey(project: Project, node: TriccNode): ConceptKey | undefined {
  if (!node.concept && node.name && isCalculated(node.type)) {
    const cs = calculateCodeSystem(project)
    if (cs?.concepts[node.name]) return { system: cs.url, code: node.name }
  }
  return refOf(project, node)
}

/**
 * The concept a prefilled value (populate) reads: its `source`, a code in the default
 * dictionary or a concept anywhere, else the default-dictionary concept named like the node
 * (fix/20261109-populate-source-period.md).
 */
export function populateSourceKey(project: Project, node: TriccNode): ConceptKey | undefined {
  const source = node.source
  if (source === undefined) return node.name ? refOf(project, { name: node.name }) : undefined
  if (typeof source !== 'string') {
    const cs = findCodeSystem(project, source.system)
    return { system: cs?.url ?? source.system, code: source.code }
  }
  const cs = defaultCodeSystem(project)
  return cs ? { system: cs.url, code: source } : undefined
}

export function optionConceptKey(project: Project, option: SelectOption): ConceptKey | undefined {
  return refOf(project, option)
}

/** Every node and answer that uses the concept, in activity and node order. */
export function conceptUsage(project: Project, key: ConceptKey): ConceptUse[] {
  const out: ConceptUse[] = []
  const same = (k: ConceptKey | undefined) => k?.system === key.system && k.code === key.code
  for (const activityId of Object.keys(project.activities).sort()) {
    const activity = project.activities[activityId]!
    for (const nodeId of activity.nodeOrder) {
      const node = activity.nodes[nodeId]
      if (!node) continue
      if (same(nodeConceptKey(project, node))) out.push({ activityId, nodeId })
      for (const option of node.options ?? []) {
        if (same(optionConceptKey(project, option)))
          out.push({ activityId, nodeId, optionId: option.id })
      }
    }
  }
  return out
}

/** Image id → the concepts whose texts show it, in dictionary order. */
export function imageUsage(project: Project): Map<string, ConceptKey[]> {
  const usage = new Map<string, ConceptKey[]>()
  for (const cs of Object.values(project.codeSystems)) {
    for (const code of cs.conceptOrder) {
      const concept = cs.concepts[code]
      if (!concept) continue
      const ids = new Set(concept.designations.flatMap((d) => imageRefs(designationText(d))))
      for (const id of ids) usage.set(id, [...(usage.get(id) ?? []), { system: cs.url, code }])
    }
  }
  return usage
}
