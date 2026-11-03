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

/** `meta.tag` system marking what a CodeSystem is for (tricc_oo block-params §5). */
export const CODESYSTEM_ROLE = 'http://tricc.org/fhir/CodeSystem/codesystem-role'

/** The role tag of the calculate dictionary. */
export const CALCULATE_ROLE_TAG = { system: CODESYSTEM_ROLE, code: 'calculate' } as const

export function hasRoleTag(cs: CodeSystem, code: string): boolean {
  return (cs.meta?.tag ?? []).some((t) => t.system === CODESYSTEM_ROLE && t.code === code)
}

/** The CodeSystem with the calculate role tag added, or itself when it has it. */
export function withCalculateTag(cs: CodeSystem): CodeSystem {
  if (hasRoleTag(cs, 'calculate')) return cs
  return { ...cs, meta: { ...cs.meta, tag: [...(cs.meta?.tag ?? []), { ...CALCULATE_ROLE_TAG }] } }
}

/**
 * The calculate dictionary, found as tricc_oo finds it: the CodeSystem tagged with the
 * calculate role, then the one `tricc.yaml` names, then one called `calculate` or
 * `<default id>-calculate`.
 */
export function calculateCodeSystem(project: Project): CodeSystem | undefined {
  const tagged = Object.keys(project.codeSystems)
    .sort()
    .map((url) => project.codeSystems[url]!)
    .find((cs) => hasRoleTag(cs, 'calculate'))
  if (tagged) return tagged
  const named = findCodeSystem(project, project.calculateCodeSystem)
  if (named) return named
  const base = defaultCodeSystem(project)
  return (
    (base ? findCodeSystem(project, `${base.id}-calculate`) : undefined) ??
    findCodeSystem(project, 'calculate')
  )
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
    ...(dictionary.kind === 'calculate'
      ? { title: 'Calculations and diagnoses', meta: { tag: [{ ...CALCULATE_ROLE_TAG }] } }
      : {}),
    status: 'draft',
    content: 'complete',
    concepts: {},
    conceptOrder: [],
  }
}
