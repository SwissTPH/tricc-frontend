import type { CodeSystem, Project } from '../model/types.js'
import { isCalculated, type NodeType } from '../format/schema/node-types.js'
import { defaultCodeSystem, findCodeSystem } from './usage.js'

/**
 * The project's data dictionaries, listed like activities (feature/20261014-project-search-and-dictionaries.md).
 *
 * - `default`: what the health worker reads (questions, answers, notes). Today's dictionary.
 * - `calculate`: values logic computes (calculations, counts, sums, diagnoses), the concepts a
 *   CQL library can define. Named after the default one, with `-calculate`.
 * - `other`: any other CodeSystem the project carries (a DAK, a shared dictionary).
 *
 * The default and calculate dictionaries are always listed. One that does not exist yet has
 * no `codeSystem` and is created with its first concept.
 */
export interface Dictionary {
  url: string
  id: string
  kind: 'default' | 'calculate' | 'other'
  codeSystem?: CodeSystem
}

/** The calculate dictionary: the one `tricc.yaml` names, or `<default id>-calculate`. */
export function calculateCodeSystem(project: Project): CodeSystem | undefined {
  const named = findCodeSystem(project, project.calculateCodeSystem)
  if (named) return named
  const base = defaultCodeSystem(project)
  return base ? findCodeSystem(project, `${base.id}-calculate`) : undefined
}

/** Default first, then calculate, then the others by id. */
export function projectDictionaries(project: Project): Dictionary[] {
  const def = defaultCodeSystem(project)
  const calc = calculateCodeSystem(project)
  const defUrl = def?.url ?? `https://tricc.org/CodeSystem/${project.id}`
  const defId = def?.id ?? project.id
  const out: Dictionary[] = [
    { url: defUrl, id: defId, kind: 'default', ...(def ? { codeSystem: def } : {}) },
    {
      url: calc?.url ?? `${defUrl}-calculate`,
      id: calc?.id ?? `${defId}-calculate`,
      kind: 'calculate',
      ...(calc ? { codeSystem: calc } : {}),
    },
  ]
  const others = Object.values(project.codeSystems)
    .filter((cs) => cs !== def && cs !== calc)
    .sort((a, b) => a.id.localeCompare(b.id))
  for (const cs of others) out.push({ url: cs.url, id: cs.id, kind: 'other', codeSystem: cs })
  return out
}

/** The dictionary a new concept for a node of this type goes to. */
export function dictionaryForType(project: Project, type: NodeType | undefined): Dictionary {
  const all = projectDictionaries(project)
  return (type && isCalculated(type) ? all[1] : all[0])!
}

/** An empty CodeSystem for a dictionary that does not exist yet. */
export function emptyCodeSystem(dictionary: Dictionary): CodeSystem {
  return {
    id: dictionary.id,
    url: dictionary.url,
    name: dictionary.id,
    ...(dictionary.kind === 'calculate' ? { title: 'Calculations and diagnoses' } : {}),
    status: 'draft',
    content: 'complete',
    concepts: {},
    conceptOrder: [],
  }
}
