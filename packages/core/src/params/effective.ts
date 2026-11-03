import type { Activity, ActivityParam, ParamValue, Project } from '../model/types.js'
import { callsOf } from '../model/activity-kind.js'

/**
 * Effective parameters (tricc_oo block-params §3.3, feature/20261028-snippets-tab-and-params.md §3.4).
 *
 * A page's parameters are its own declarations, plus every parameter of what it calls that the
 * call does not set with a literal: those bubble up, as with function parameters. A
 * `{{name}}` argument binds the callee's parameter to the caller's `name`, which then bubbles
 * up instead. Type, options and default come from the deepest declaration.
 *
 * Computed from the call graph only, never from values, and never stored as such: the saved
 * `params` list holds declared and computed rows alike.
 */
export interface EffectiveParam {
  name: string
  /** Type, options, default and required, from the deepest declaration. */
  param: ActivityParam
  /** The page holding the deepest declaration. */
  declaredIn: string
  /** It comes from what the page calls rather than from the page itself. */
  computed: boolean
  /** When computed: the pages it comes from. */
  from: string[]
  /** It is in the page's saved `params`. */
  saved: boolean
  /** A declared row that nothing on the page uses and nothing below needs: "Not used". */
  unused: boolean
}

const REF = /^\{\{\s*([a-z][a-z0-9_]*)\s*\}\}$/
const PLACEHOLDER = /\{\{\s*([a-z][a-z0-9_]*)\s*(?:\|\s*raw\s*)?\}\}/g

/** The caller's parameter an argument is bound to (`{{name}}`), or undefined for a literal. */
export function argRef(value: ParamValue | undefined): string | undefined {
  return typeof value === 'string' ? REF.exec(value.trim())?.[1] : undefined
}

/** `{{name}}` for a reference argument. */
export function refArg(name: string): string {
  return `{{${name}}}`
}

/** Names the page uses through `{{name}}`, in its nodes (any field, arguments too) and edges. */
export function paramPlaceholders(activity: Activity): Set<string> {
  const names = new Set<string>()
  const scan = (value: unknown): void => {
    if (typeof value === 'string') {
      for (const m of value.matchAll(PLACEHOLDER)) names.add(m[1]!)
    } else if (Array.isArray(value)) value.forEach(scan)
    else if (value && typeof value === 'object') {
      for (const [key, v] of Object.entries(value)) if (key !== 'ui') scan(v)
    }
  }
  for (const node of Object.values(activity.nodes)) scan(node)
  for (const edge of Object.values(activity.edges)) scan(edge.value)
  return names
}

// Snapshots are immutable, so results are kept per project object.
const cache = new WeakMap<Project, Map<string, EffectiveParam[]>>()

/** Drop what was computed for a project object that is about to change in place. */
export function forgetParams(project: Project): void {
  cache.delete(project)
}

/** The effective parameters of a page, saved rows first in their order, then computed ones. */
export function effectiveParams(project: Project, activityId: string): EffectiveParam[] {
  let memo = cache.get(project)
  if (!memo) {
    memo = new Map()
    cache.set(project, memo)
  }
  return compute(project, activityId, new Set(), memo)
}

interface Bubbled {
  param: ActivityParam
  declaredIn: string
  from: Set<string>
}

/** What each call of the page leaves unset, by name, before the page's own rows are merged in. */
function bubbled(
  project: Project,
  activity: Activity,
  stack: Set<string>,
  memo: Map<string, EffectiveParam[]>,
): Map<string, Bubbled> {
  const out = new Map<string, Bubbled>()
  for (const call of callsOf(activity)) {
    const target = call.link!
    if (!project.activities[target]) continue
    for (const p of compute(project, target, stack, memo)) {
      const value = call.args?.[p.name]
      const name = value === undefined ? p.name : argRef(value)
      if (!name) continue
      const entry = out.get(name)
      if (entry) entry.from.add(target)
      else
        out.set(name, {
          param: { ...p.param, name },
          declaredIn: p.declaredIn,
          from: new Set([target]),
        })
    }
  }
  return out
}

function compute(
  project: Project,
  id: string,
  stack: Set<string>,
  memo: Map<string, EffectiveParam[]>,
): EffectiveParam[] {
  const known = memo.get(id)
  if (known) return known
  const activity = project.activities[id]
  // A cycle is reported by validation; here it only stops the walk.
  if (!activity || stack.has(id)) return []
  stack.add(id)
  const below = bubbled(project, activity, stack, memo)
  stack.delete(id)

  const used = paramPlaceholders(activity)
  const out: EffectiveParam[] = []
  const seen = new Set<string>()
  for (const saved of activity.params ?? []) {
    if (seen.has(saved.name)) continue
    seen.add(saved.name)
    const b = below.get(saved.name)
    out.push(
      b
        ? {
            name: saved.name,
            param: b.param,
            declaredIn: b.declaredIn,
            computed: true,
            from: [...b.from],
            saved: true,
            unused: false,
          }
        : {
            name: saved.name,
            param: saved,
            declaredIn: id,
            computed: false,
            from: [],
            saved: true,
            unused: !used.has(saved.name),
          },
    )
  }
  for (const [name, b] of below) {
    if (seen.has(name)) continue
    out.push({
      name,
      param: b.param,
      declaredIn: b.declaredIn,
      computed: true,
      from: [...b.from],
      saved: false,
      unused: false,
    })
  }
  memo.set(id, out)
  return out
}

/** Two declarations of one name, along a chain, that disagree on type or choice options. */
export interface ParamConflict {
  activityId: string
  name: string
  /** The pages whose declarations disagree. */
  declaredIn: string[]
}

/** `E_PARAM_CONFLICT`: what one page's calls bring up under the same name, disagreeing. */
export function paramConflicts(project: Project): ParamConflict[] {
  const out: ParamConflict[] = []
  for (const id of Object.keys(project.activities).sort()) {
    const activity = project.activities[id]!
    const byName = new Map<string, { shape: string; declaredIn: string }[]>()
    const add = (name: string, p: ActivityParam, declaredIn: string) => {
      const list = byName.get(name) ?? []
      list.push({ shape: shapeOf(p), declaredIn })
      byName.set(name, list)
    }
    for (const call of callsOf(activity)) {
      if (!project.activities[call.link!]) continue
      for (const p of effectiveParams(project, call.link!)) {
        const value = call.args?.[p.name]
        const name = value === undefined ? p.name : argRef(value)
        if (name) add(name, p.param, p.declaredIn)
      }
    }
    // A row the page saved, as written, must agree with what comes from below.
    for (const saved of activity.params ?? []) {
      if (byName.has(saved.name)) add(saved.name, saved, id)
    }
    for (const [name, list] of byName) {
      if (new Set(list.map((l) => l.shape)).size < 2) continue
      out.push({
        activityId: id,
        name,
        declaredIn: [...new Set(list.map((l) => l.declaredIn))].sort(),
      })
    }
  }
  return out
}

function shapeOf(p: ActivityParam): string {
  return p.type === 'choice' ? `choice(${(p.options ?? []).join('|')})` : p.type
}
