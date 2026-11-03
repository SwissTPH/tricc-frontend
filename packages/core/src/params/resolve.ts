import type { ActivityParam, ParamValue, Project } from '../model/types.js'
import { callsOf } from '../model/activity-kind.js'
import { argRef, effectiveParams } from './effective.js'
import { NAME_RE } from '../format/schema/activity.js'

/**
 * Checking and resolving values (tricc_oo block-params §3.2): at a call, a parameter takes the
 * value set there, else the caller's value of the same name (inherited), else its default. At the
 * top of a chain, the intervention's `args` are the caller's values.
 */

/** Why a value does not fit a parameter, or undefined when it does. A `{{name}}` binding fits. */
export function argProblem(param: ActivityParam, value: ParamValue, label = param.name): string | undefined {
  if (argRef(value)) return undefined
  switch (param.type) {
    case 'boolean':
      return typeof value === 'boolean' ? undefined : `“${label}” is yes or no, not “${show(value)}”.`
    case 'number':
      return typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value)))
        ? undefined
        : `“${label}” is a number, not “${show(value)}”.`
    case 'choice':
      return typeof value === 'string' && (param.options ?? []).includes(value)
        ? undefined
        : `“${show(value)}” is not one of the options for “${label}”.`
    case 'name':
      return typeof value === 'string' && /^[A-Za-z0-9_]+$/.test(value)
        ? undefined
        : `“${show(value)}” is not a valid name fragment for “${label}” (letters, digits and _).`
    case 'concept':
      return (typeof value === 'object' && value !== null) || (typeof value === 'string' && NAME_RE.test(value))
        ? undefined
        : `“${label}” needs a concept of the data dictionary.`
    case 'string':
    case 'expression':
      return typeof value === 'string' ? undefined : `“${label}” is text, not “${show(value)}”.`
  }
}

export function show(value: ParamValue | undefined): string {
  if (value === undefined) return ''
  if (typeof value === 'object') return value.code
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

/** One way a page is reached from an intervention, with the values it gets there. */
export interface ParamEnvironment {
  interventionId: string
  /** Page ids from the intervention's activity down to this page. */
  chain: string[]
  /** Value by parameter name; undefined when nothing sets it and it has no default. */
  values: Record<string, ParamValue | undefined>
  /** Where each value came from. */
  sources: Record<string, ValueSource>
}

export type ValueSource =
  | { kind: 'intervention'; interventionId: string }
  | { kind: 'call'; activityId: string; nodeId: string }
  | { kind: 'default' }
  | { kind: 'none' }

const envCache = new WeakMap<Project, Map<string, ParamEnvironment[]>>()

/**
 * Every way each page is reached from an intervention, with its resolved values. A page reached
 * twice with different values is built twice (§6).
 */
export function paramEnvironments(project: Project): Map<string, ParamEnvironment[]> {
  const known = envCache.get(project)
  if (known) return known
  const out = new Map<string, ParamEnvironment[]>()
  const visit = (id: string, env: ParamEnvironment, stack: Set<string>) => {
    const list = out.get(id) ?? []
    list.push(env)
    out.set(id, list)
    const activity = project.activities[id]
    if (!activity || stack.has(id)) return
    stack.add(id)
    for (const call of callsOf(activity)) {
      const target = call.link!
      if (!project.activities[target]) continue
      const values: ParamEnvironment['values'] = {}
      const sources: ParamEnvironment['sources'] = {}
      for (const p of effectiveParams(project, target)) {
        const set = call.args?.[p.name]
        const ref = set === undefined ? undefined : argRef(set)
        if (set !== undefined && !ref) {
          values[p.name] = set
          sources[p.name] = { kind: 'call', activityId: id, nodeId: call.id }
        } else {
          const from = ref ?? p.name
          if (env.values[from] !== undefined) {
            values[p.name] = env.values[from]
            sources[p.name] = env.sources[from]!
          } else if (p.param.default !== undefined) {
            values[p.name] = p.param.default
            sources[p.name] = { kind: 'default' }
          } else {
            values[p.name] = undefined
            sources[p.name] = { kind: 'none' }
          }
        }
      }
      visit(target, { interventionId: env.interventionId, chain: [...env.chain, target], values, sources }, stack)
    }
    stack.delete(id)
  }
  for (const iv of project.interventions) {
    for (const ref of iv.activities) {
      if (!project.activities[ref.ref]) continue
      const values: ParamEnvironment['values'] = {}
      const sources: ParamEnvironment['sources'] = {}
      for (const p of effectiveParams(project, ref.ref)) {
        const set = iv.args?.[p.name]
        if (set !== undefined) {
          values[p.name] = set
          sources[p.name] = { kind: 'intervention', interventionId: iv.id }
        } else if (p.param.default !== undefined) {
          values[p.name] = p.param.default
          sources[p.name] = { kind: 'default' }
        } else {
          values[p.name] = undefined
          sources[p.name] = { kind: 'none' }
        }
      }
      visit(ref.ref, { interventionId: iv.id, chain: [ref.ref], values, sources }, new Set())
    }
  }
  envCache.set(project, out)
  return out
}

/**
 * The parameters an intervention asks for: every parameter its activities have or inherit,
 * once per name, with the activities that need it.
 */
export function interventionParams(
  project: Project,
  interventionId: string,
): { name: string; param: ActivityParam; declaredIn: string; activities: string[] }[] {
  const iv = project.interventions.find((i) => i.id === interventionId)
  if (!iv) return []
  const byName = new Map<string, { name: string; param: ActivityParam; declaredIn: string; activities: string[] }>()
  for (const ref of iv.activities) {
    if (!project.activities[ref.ref]) continue
    for (const p of effectiveParams(project, ref.ref)) {
      const entry = byName.get(p.name)
      if (entry) entry.activities.push(ref.ref)
      else byName.set(p.name, { name: p.name, param: p.param, declaredIn: p.declaredIn, activities: [ref.ref] })
    }
  }
  return [...byName.values()]
}
