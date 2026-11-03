import type {
  Activity,
  Intervention,
  ParamType,
  ParamValue,
  Project,
  TriccEdge,
  TriccNode,
} from '../model/types.js'
import { callsOf } from '../model/activity-kind.js'
import { argRef } from './effective.js'

/**
 * A parameter renamed in the editor is a rename, not a delete and an add
 * (feature/20261028-snippets-tab-and-params.md §5.3). The new name follows through the whole
 * call chain in one step: the owner's rows and `{{name}}` uses, the values set at every call of
 * the owner, and, where a caller inherits the parameter, that caller's computed row, its uses and
 * its own callers, up to the interventions' values.
 */
export interface ParamRenamePlan {
  /** Pages with their new rows, nodes and edges (only those that changed). */
  activities: {
    id: string
    params?: Activity['params']
    nodes: TriccNode[]
    edges: TriccEdge[]
  }[]
  interventions: Intervention[]
}

export function planParamRename(
  project: Project,
  ownerId: string,
  from: string,
  to: string,
): ParamRenamePlan {
  const pages = new Map<string, Activity>()
  const changedNodes = new Map<string, Set<string>>()
  const changedEdges = new Map<string, Set<string>>()
  const changedParams = new Set<string>()
  const page = (id: string): Activity => {
    let a = pages.get(id)
    if (!a) {
      a = structuredClone(project.activities[id]!)
      pages.set(id, a)
    }
    return a
  }
  const touch = (map: Map<string, Set<string>>, id: string, item: string) => {
    const set = map.get(id) ?? new Set<string>()
    set.add(item)
    map.set(id, set)
  }
  const interventions = new Map<string, Intervention>()

  const work: [string, string, string][] = [[ownerId, from, to]]
  const seen = new Set<string>()
  while (work.length > 0) {
    const [id, f, t] = work.pop()!
    if (seen.has(`${id}|${f}`) || !project.activities[id]) continue
    seen.add(`${id}|${f}`)
    const a = page(id)
    for (const p of a.params ?? []) {
      if (p.name === f) {
        p.name = t
        changedParams.add(id)
      }
    }
    for (const node of Object.values(a.nodes)) {
      const next = renamePlaceholder(node, f, t) as TriccNode
      if (JSON.stringify(next) !== JSON.stringify(node)) {
        a.nodes[node.id] = next
        touch(changedNodes, id, node.id)
      }
    }
    for (const edge of Object.values(a.edges)) {
      if (!edge.value) continue
      const value = renamePlaceholder(edge.value, f, t) as string
      if (value !== edge.value) {
        a.edges[edge.id] = { ...edge, value }
        touch(changedEdges, id, edge.id)
      }
    }
    // Calls of this page: a value set there moves to the new name; a caller that sets nothing
    // inherits the parameter, so it is renamed there too.
    for (const callerId of Object.keys(project.activities).sort()) {
      const caller = page(callerId)
      for (const call of callsOf(caller)) {
        if (call.link !== id) continue
        if (call.args && f in call.args) {
          const args: Record<string, ParamValue> = {}
          for (const [k, v] of Object.entries(call.args)) args[k === f ? t : k] = v
          caller.nodes[call.id] = { ...call, args }
          touch(changedNodes, callerId, call.id)
        } else {
          work.push([callerId, f, t])
        }
      }
    }
    for (const iv of project.interventions) {
      if (!iv.activities.some((r) => r.ref === id)) continue
      const current = interventions.get(iv.id) ?? iv
      if (!current.args || !(f in current.args)) continue
      const args: Record<string, ParamValue> = {}
      for (const [k, v] of Object.entries(current.args)) args[k === f ? t : k] = v
      interventions.set(iv.id, { ...current, args })
    }
  }

  const activities: ParamRenamePlan['activities'] = []
  for (const [id, a] of pages) {
    const nodes = [...(changedNodes.get(id) ?? [])].map((n) => a.nodes[n]!)
    const edges = [...(changedEdges.get(id) ?? [])].map((e) => a.edges[e]!)
    if (nodes.length === 0 && edges.length === 0 && !changedParams.has(id)) continue
    activities.push({ id, ...(changedParams.has(id) ? { params: a.params } : {}), nodes, edges })
  }
  return { activities, interventions: [...interventions.values()] }
}

/** Every `{{from}}` (and `{{from|raw}}`) in a value, in any string inside it, renamed. */
export function renamePlaceholder(value: unknown, from: string, to: string): unknown {
  if (typeof value === 'string') {
    return value.replace(
      new RegExp(`\\{\\{(\\s*)${from}(\\s*(?:\\|\\s*raw\\s*)?)\\}\\}`, 'g'),
      (_m, a: string, b: string) => `{{${a}${to}${b}}}`,
    )
  }
  if (Array.isArray(value)) return value.map((v) => renamePlaceholder(v, from, to))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        k === 'id' || k === 'type' || k === 'ui' ? v : renamePlaceholder(v, from, to),
      ]),
    )
  }
  return value
}

/**
 * A value kept across a type change when nothing is lost (a number becomes text), else
 * undefined: the value is cleared and the call site asks again. A `{{name}}` binding is kept.
 */
export function coerceArg(value: ParamValue, to: ParamType): ParamValue | undefined {
  if (argRef(value)) return value
  switch (to) {
    case 'string':
    case 'name':
    case 'expression':
      return typeof value === 'object' ? undefined : String(value)
    case 'choice':
      return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined
    case 'number':
      if (typeof value === 'number') return value
      return typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))
        ? Number(value)
        : undefined
    case 'boolean':
      if (typeof value === 'boolean') return value
      return value === 'true' ? true : value === 'false' ? false : undefined
    case 'concept':
      return typeof value === 'object' ? value : undefined
  }
}
