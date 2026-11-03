import type {
  Activity,
  ActivityParam,
  CodeSystem,
  Concept,
  ParamValue,
  Project,
} from '../model/types.js'
import { PRIMITIVE_PARAM_TYPES } from '../model/types.js'
import {
  calculateCodeSystem,
  emptyCodeSystem,
  projectDictionaries,
} from '../terminology/dictionaries.js'
import { conceptText, withConceptText } from '../terminology/designation.js'
import { effectiveParams, forgetParams } from './effective.js'

/**
 * Keeping saved parameters and parameter concepts in step with the call graph
 * (feature/20261028-snippets-tab-and-params.md §3.3, §3.4). Pure: the document applies the
 * result in the transaction that caused it, and opening a project applies it too, so a file
 * edited outside the tool comes back consistent.
 */

/** The concept kind of a parameter's dictionary entry. */
export const PARAMETER_KIND = 'parameter'

/** `param_<owner>_<name>`: the owner is the declaring page's name (else its id), made a code. */
export function paramConceptCode(owner: Pick<Activity, 'id' | 'name'>, name: string): string {
  const base = (owner.name ?? owner.id).replace(/[^A-Za-z0-9_]/g, '_')
  return `param_${base}_${name}`
}

export function isPrimitive(param: Pick<ActivityParam, 'type'>): boolean {
  return PRIMITIVE_PARAM_TYPES.includes(param.type)
}

/** A parameter's dictionary entry, if it has one. */
export function paramConcept(project: Project, ownerId: string, name: string): Concept | undefined {
  const owner = project.activities[ownerId]
  if (!owner) return undefined
  return calculateCodeSystem(project)?.concepts[paramConceptCode(owner, name)]
}

/** What the author reads for a parameter: its concept's display, else its name. */
export function paramLabel(project: Project, ownerId: string, param: ActivityParam): string {
  const lang = project.languages.default
  const concept = paramConcept(project, ownerId, param.name)
  return conceptText(concept, 'display', lang, lang) ?? param.label?.[lang] ?? param.name
}

/** A parameter's help text, from its concept's definition. */
export function paramDescription(
  project: Project,
  ownerId: string,
  name: string,
): string | undefined {
  return paramConcept(project, ownerId, name)?.definition
}

/** A row as saved: no texts (they are on the concept). */
function bare(p: ActivityParam, name = p.name): ActivityParam {
  const out: ActivityParam = { name, type: p.type }
  if (p.options?.length) out.options = [...p.options]
  if (p.default !== undefined) out.default = structuredClone(p.default)
  if (p.required) out.required = true
  return out
}

/**
 * The `params` each page should save, for the pages where that differs from what it has:
 * saved rows in their order (computed ones rewritten from their deepest declaration), then the
 * computed rows not saved yet. An orphan the author declared is never removed: it may be
 * declared on purpose. Given the project `before` the change being synced, a row that was only
 * computed there and that nothing uses now (a value is now set at the call) goes away with it.
 */
export function syncedParams(
  project: Project,
  before?: Project,
): Map<string, ActivityParam[] | undefined> {
  const out = new Map<string, ActivityParam[] | undefined>()
  for (const id of Object.keys(project.activities).sort()) {
    const activity = project.activities[id]!
    const wasComputed = new Set(
      before?.activities[id]
        ? effectiveParams(before, id)
            .filter((e) => e.computed)
            .map((e) => e.name)
        : [],
    )
    const next = effectiveParams(project, id)
      .filter((e) => e.computed || !e.unused || !wasComputed.has(e.name))
      .map((e) =>
        e.computed
          ? bare(e.param, e.name)
          : (activity.params?.find((p) => p.name === e.name) ?? e.param),
      )
    const current = activity.params ?? []
    if (JSON.stringify(next.map((p) => bare(p))) === JSON.stringify(current.map((p) => bare(p))))
      continue
    out.set(id, next.length > 0 ? next : undefined)
  }
  return out
}

export interface ParamConceptSync {
  /** The calculate dictionary (canonical url). */
  system: string
  /** Present when the dictionary does not exist yet: add it first. */
  create?: CodeSystem
  /**
   * Present when the project has no default dictionary either: add it as the default, so the
   * calculate one is found beside it (and is never taken for the default).
   */
  createDefault?: CodeSystem
  upserts: Concept[]
  removes: string[]
  /** Codes another concept already uses: the parameter cannot take them (§3.3). */
  taken: { activityId: string; name: string; code: string }[]
}

const DATA_TYPES: Record<string, string> = {
  boolean: 'boolean',
  number: 'decimal',
  string: 'string',
  choice: 'coded',
}

/**
 * The calculate dictionary's parameter concepts: one per declared primitive parameter, with its
 * type, options and default and no value. Texts already on a concept are kept; a draw.io label or
 * description seeds a new one. Parameter concepts nothing declares any more are removed.
 */
export function syncedParamConcepts(project: Project): ParamConceptSync {
  const dictionary = projectDictionaries(project)[1]!
  const cs = dictionary.codeSystem
  const lang = project.languages.default
  const result: ParamConceptSync = { system: dictionary.url, upserts: [], removes: [], taken: [] }
  const wanted = new Set<string>()
  for (const id of Object.keys(project.activities).sort()) {
    const activity = project.activities[id]!
    for (const e of effectiveParams(project, id)) {
      if (e.computed || !isPrimitive(e.param)) continue
      const code = paramConceptCode(activity, e.name)
      const existing = cs?.concepts[code]
      if (existing && existing.kind !== PARAMETER_KIND) {
        result.taken.push({ activityId: id, name: e.name, code })
        continue
      }
      if (wanted.has(code)) continue
      wanted.add(code)
      let next: Concept = existing
        ? { ...existing, designations: existing.designations.map((d) => ({ ...d })) }
        : { system: dictionary.url, code, designations: [] }
      next.kind = PARAMETER_KIND
      next.dataType = DATA_TYPES[e.param.type]!
      if (e.param.type === 'choice' && e.param.options?.length)
        next.paramOptions = [...e.param.options]
      else delete next.paramOptions
      const def = textOf(e.param.default)
      if (def !== undefined) next.paramDefault = def
      else delete next.paramDefault
      for (const [language, text] of Object.entries(e.param.label ?? {})) {
        if (text && !conceptText(next, 'display', language, lang)) {
          next = withConceptText(next, 'display', language, text, lang)
        }
      }
      const description = e.param.description?.[lang] ?? Object.values(e.param.description ?? {})[0]
      if (description && !next.definition) next.definition = description
      if (!existing || JSON.stringify(existing) !== JSON.stringify(next)) result.upserts.push(next)
    }
  }
  for (const code of cs?.conceptOrder ?? []) {
    if (cs!.concepts[code]?.kind === PARAMETER_KIND && !wanted.has(code)) result.removes.push(code)
  }
  if (!cs && result.upserts.length > 0) {
    result.create = emptyCodeSystem(dictionary)
    const all = projectDictionaries(project)
    if (!all[0]!.codeSystem) result.createDefault = emptyCodeSystem(all[0]!)
  }
  return result
}

function textOf(value: ParamValue | undefined): string | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'object') return value.code
  return String(value)
}

/**
 * Apply both syncs to a plain project, and drop the draw.io texts the concepts now hold.
 * Returns whether anything changed.
 */
export function applyParamSync(project: Project): boolean {
  let changed = false
  for (const [id, params] of syncedParams(project)) {
    const activity = project.activities[id]!
    if (params) activity.params = params
    else delete activity.params
    changed = true
  }
  forgetParams(project)
  const concepts = syncedParamConcepts(project)
  if (concepts.createDefault) {
    project.codeSystems[concepts.createDefault.url] = concepts.createDefault
    project.defaultCodeSystem = concepts.createDefault.url
  }
  if (concepts.create) project.codeSystems[concepts.create.url] = concepts.create
  const cs = project.codeSystems[concepts.system]
  if (cs) {
    for (const concept of concepts.upserts) {
      if (!cs.concepts[concept.code]) cs.conceptOrder.push(concept.code)
      cs.concepts[concept.code] = concept
      changed = true
    }
    for (const code of concepts.removes) {
      delete cs.concepts[code]
      cs.conceptOrder = cs.conceptOrder.filter((c) => c !== code)
      changed = true
    }
  }
  for (const activity of Object.values(project.activities)) {
    for (const p of activity.params ?? []) {
      delete p.label
      delete p.description
    }
  }
  forgetParams(project)
  return changed
}
