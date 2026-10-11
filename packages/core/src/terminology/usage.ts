import type { CodeSystem, Concept, Project, SelectOption, TriccNode } from '../model/types.js'

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
  return (
    findCodeSystem(project, project.defaultCodeSystem) ??
    (Object.keys(project.codeSystems).length === 1 ? Object.values(project.codeSystems)[0] : undefined)
  )
}

export function lookupConcept(project: Project, key: ConceptKey | undefined): Concept | undefined {
  if (!key) return undefined
  return findCodeSystem(project, key.system)?.concepts[key.code]
}

function refOf(project: Project, item: { concept?: { system: string; code: string }; name?: string }): ConceptKey | undefined {
  if (item.concept) {
    const cs = findCodeSystem(project, item.concept.system)
    return { system: cs?.url ?? item.concept.system, code: item.concept.code }
  }
  const cs = defaultCodeSystem(project)
  if (cs && item.name && cs.concepts[item.name]) return { system: cs.url, code: item.name }
  return undefined
}

/** The concept a node stands for, if the dictionary has it. */
export function nodeConceptKey(project: Project, node: TriccNode): ConceptKey | undefined {
  return refOf(project, node)
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
        if (same(optionConceptKey(project, option))) out.push({ activityId, nodeId, optionId: option.id })
      }
    }
  }
  return out
}
